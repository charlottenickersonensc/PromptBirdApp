import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  type ChangeEvent
} from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { BarChart3, Code } from 'lucide-react';
import { Separator } from './ui/separator';
import { MermaidIcon } from './MermaidIcon';
import { TableSizePicker } from './TableSizePicker';
import { VisualMermaid } from './VisualMermaid';
import { VisualChartBlock } from './VisualChartBlock';
import { CodeEditorBlock } from './CodeEditorBlock';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { TemplateVariable } from './VariablesPanel';
import { createRoot, type Root } from 'react-dom/client';

interface VisualMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  previewContent?: string;
  variables?: TemplateVariable[];
}

type SelectionSnapshot = {
  start: number;
  end: number;
};

type VisualBlockType = 'mermaid' | 'chart' | 'code';

type VisualBlock = {
  id: string;
  type: VisualBlockType;
  language: string;
  rawLanguage: string;
  start: number;
  end: number;
  code: string;
  startLine: number;
  endLine: number;
};

type VisualBlockParseResult = {
  html: string;
  blocks: VisualBlock[];
};

const resolveBlockLabel = (block: VisualBlock) => {
  switch (block.type) {
    case 'mermaid':
      return 'Mermaid diagram';
    case 'chart':
      return 'Chart';
    case 'code':
    default:
      return block.rawLanguage ? `${block.rawLanguage} code` : 'Code block';
  }
};

type MarkdownFenceCapture = {
  language: string;
  startLine: number;
  startOffset: number;
  codeLines: string[];
  blockIndex: number;
};

const escapeHTML = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ZERO_WIDTH_SPACE = '\u200B';

const normalizePlainText = (value: string) => value.replace(/\r\n?/g, '\n');

const removeZeroWidth = (value: string) => value.replace(new RegExp(ZERO_WIDTH_SPACE, 'g'), '');

const collapseNonBreakingSpaces = (value: string) => value.replace(/\u00A0/g, ' ');

const getPlainTextFromEditor = (root: HTMLElement) => {
  const lineElements = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('markdown-line')
  );

  if (!lineElements.length) {
    return normalizePlainText(removeZeroWidth(collapseNonBreakingSpaces(root.textContent || '')));
  }

  const lines = lineElements.map((element) => removeZeroWidth(collapseNonBreakingSpaces(element.textContent || '')));

  return normalizePlainText(lines.join('\n'));
};

const isEditableFocused = (element: HTMLElement) => {
  const active = document.activeElement;
  return !!active && (active === element || element.contains(active));
};

const getLineElements = (root: HTMLElement) =>
  Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains('markdown-line')
  );

const findLineElement = (root: HTMLElement, node: Node | null): HTMLElement | null => {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.classList.contains('markdown-line')) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

const lineColumnToOffset = (lines: string[], lineIndex: number, column: number) => {
  const clampedLineIndex = Math.max(0, Math.min(lineIndex, lines.length - 1));
  const clampedColumn = Math.max(0, column);

  let offset = 0;
  for (let i = 0; i < clampedLineIndex; i++) {
    offset += lines[i].length;
    offset += 1; // newline separator
  }
  return offset + clampedColumn;
};

const offsetToLineColumn = (lines: string[], offset: number) => {
  const clampedOffset = Math.max(0, offset);
  let remaining = clampedOffset;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (remaining <= lineLength) {
      return { lineIndex: i, column: remaining };
    }

    remaining -= lineLength;

    if (i === lines.length - 1) {
      return { lineIndex: i, column: lineLength };
    }

    // Account for newline character between lines
    if (remaining === 0) {
      return { lineIndex: i + 1, column: 0 };
    }

    remaining -= 1;

    if (remaining < 0) {
      return { lineIndex: i + 1, column: 0 };
    }
  }

  const lastIndex = Math.max(0, lines.length - 1);
  return { lineIndex: lastIndex, column: lines[lastIndex]?.length ?? 0 };
};

const getActualOffsetFromVisible = (text: string, visibleIndex: number) => {
  if (visibleIndex <= 0) {
    return 0;
  }

  let visibleCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charAt(i) === ZERO_WIDTH_SPACE) {
      continue;
    }

    visibleCount++;
    if (visibleCount >= visibleIndex) {
      return i + 1;
    }
  }

  return text.length;
};

const resolveColumnWithinLine = (lineElement: HTMLElement, column: number) => {
  const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT, null);
  let remaining = column;
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const rawText = textNode.textContent || '';
    const visibleLength = removeZeroWidth(rawText).length;

    if (remaining <= visibleLength) {
      const actualOffset = getActualOffsetFromVisible(rawText, remaining);
      return { node: textNode, offset: actualOffset };
    }

    remaining -= visibleLength;
    textNode = walker.nextNode() as Text | null;
  }

  const childCount = lineElement.childNodes.length;
  const clampedOffset = Math.min(Math.max(column, 0), childCount);
  return { node: lineElement, offset: clampedOffset };
};

const getSelectionOffsets = (root: HTMLElement, content: string): SelectionSnapshot | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const lines = content.split('\n');
  const lineElements = getLineElements(root);

  const resolveEndpoint = (container: Node, offset: number) => {
    const lineElement = findLineElement(root, container);
    if (!lineElement) return null;

    const lineIndex = lineElements.indexOf(lineElement);
    if (lineIndex === -1) return null;

    const tempRange = document.createRange();
    tempRange.selectNodeContents(lineElement);

    try {
      tempRange.setEnd(container, offset);
    } catch (_error) {
      return null;
    }

    const columnText = removeZeroWidth(tempRange.toString());
    const column = columnText.length;

    return lineColumnToOffset(lines, lineIndex, column);
  };

  const start = resolveEndpoint(range.startContainer, range.startOffset);
  const end = resolveEndpoint(range.endContainer, range.endOffset);

  if (start == null || end == null) return null;

  return { start, end };
};

const restoreSelection = (
  root: HTMLElement,
  snapshot: SelectionSnapshot | null,
  content: string
) => {
  if (!snapshot) return;
  const selection = window.getSelection();
  if (!selection) return;

  const lines = content.split('\n');
  const lineElements = getLineElements(root);

  const resolvePosition = (offset: number) => {
    const { lineIndex, column } = offsetToLineColumn(lines, offset);
    const clampedLineIndex = Math.max(0, Math.min(lineIndex, lineElements.length - 1));
    const lineElement = lineElements[clampedLineIndex];

    if (!lineElement) {
      return { node: root, offset: root.childNodes.length } as const;
    }

    return resolveColumnWithinLine(lineElement, column);
  };

  const startPosition = resolvePosition(snapshot.start);
  const endPosition = resolvePosition(snapshot.end);

  const range = document.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  selection.removeAllRanges();
  selection.addRange(range);
};

const formatInlineMarkdown = (text: string, variables: TemplateVariable[]) => {
  let html = escapeHTML(text);

  const codePlaceholders: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const index = codePlaceholders.length;
    codePlaceholders.push(
      `<span class="markdown-code">\`${escapeHTML(code)}\`</span>`
    );
    return `__CODE_INLINE_${index}__`;
  });

  html = html.replace(/(\*\*|__)(.+?)\1/g, (_match, wrapper, inner) => {
    return `<span class="markdown-bold">${wrapper}${inner}${wrapper}</span>`;
  });

  html = html.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    (_match, inner) => `<span class="markdown-italic">*${inner}*</span>`
  );

  html = html.replace(
    /(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g,
    (_match, inner) => `<span class="markdown-italic">_${inner}_</span>`
  );

  html = html.replace(
    /~~(.+?)~~/g,
    (_match, inner) => `<span class="markdown-strikethrough">~~${inner}~~</span>`
  );

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, textLabel, url) =>
      `<span class="markdown-link">[<span class="markdown-link-text">${textLabel}</span>](<span class="markdown-link-url">${url}</span>)</span>`
  );

  html = html.replace(/\{\{([^}]+)\}\}/g, (_match, variableName) => {
    const trimmed = variableName.trim();
    const variable = variables.find(
      (v) => v.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (variable) {
      const description = escapeHTML(variable.description || variable.name);
      const value = escapeHTML(variable.value);
      return `<span class="markdown-variable" title="${description}: ${value}">{{${escapeHTML(trimmed)}}}</span>`;
    }

    return `<span class="markdown-variable-undefined" title="Undefined variable: ${escapeHTML(trimmed)}">{{${escapeHTML(trimmed)}}}</span>`;
  });

  codePlaceholders.forEach((replacement, index) => {
    html = html.replace(`__CODE_INLINE_${index}__`, replacement);
  });

  return html;
};

const parseMarkdownWithVisualBlocks = (
  content: string,
  variables: TemplateVariable[]
): VisualBlockParseResult => {
  if (!content) {
    return { html: '', blocks: [] };
  }

  const normalizedContent = normalizePlainText(content);
  const lines = normalizedContent.split('\n');

  type LineMeta = { blockIndex: number; role: 'start' | 'middle' | 'end' };

  const lineMeta = new Map<number, LineMeta>();
  const blocksInfo: Array<{ 
    language: string;
    startLine: number;
    endLine: number;
    startOffset: number;
    endOffset: number;
    codeLines: string[];
  }> = [];

  let offset = 0;
  let activeBlock: MarkdownFenceCapture | null = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      if (!activeBlock) {
        const language = trimmed.slice(3).trim();
        const blockIndex = blocksInfo.length;
        activeBlock = {
          language,
          startLine: index,
          startOffset: offset,
          codeLines: [],
          blockIndex
        };
        lineMeta.set(index, { blockIndex, role: 'start' });
      } else {
        const blockIndex = activeBlock.blockIndex;
        lineMeta.set(index, { blockIndex, role: 'end' });
        blocksInfo.push({
          language: activeBlock.language,
          startLine: activeBlock.startLine,
          endLine: index,
          startOffset: activeBlock.startOffset,
          endOffset: offset + line.length + 1,
          codeLines: activeBlock.codeLines.slice()
        });
        activeBlock = null;
      }
    } else if (activeBlock) {
      activeBlock.codeLines.push(line);
      lineMeta.set(index, { blockIndex: activeBlock.blockIndex, role: 'middle' });
    }

    offset += line.length + 1;
  });

  if (activeBlock != null) {
    const blockRef = activeBlock as MarkdownFenceCapture;
    const { blockIndex, language, startLine, startOffset } = blockRef;
    blocksInfo.push({
      language,
      startLine,
      endLine: lines.length - 1,
      startOffset,
      endOffset: normalizedContent.length,
      codeLines: [...blockRef.codeLines]
    });

    for (let lineIndex = startLine; lineIndex < lines.length; lineIndex++) {
      if (!lineMeta.has(lineIndex)) {
        const role =
          lineIndex === startLine
            ? 'start'
            : lineIndex === lines.length - 1
              ? 'end'
              : 'middle';
        lineMeta.set(lineIndex, { blockIndex, role });
      } else if (lineIndex === lines.length - 1) {
        lineMeta.set(lineIndex, { blockIndex, role: 'end' });
      }
    }
  }

  const blocks: VisualBlock[] = blocksInfo.map((info, index) => {
    const rawLanguage = info.language || '';
    const normalizedLanguage = rawLanguage.toLowerCase();
    const blockType: VisualBlockType =
      normalizedLanguage === 'mermaid'
        ? 'mermaid'
        : normalizedLanguage.startsWith('chart')
          ? 'chart'
          : 'code';

    return {
      id: `block-${index}`,
      type: blockType,
      language:
        blockType === 'chart'
          ? 'json'
          : normalizedLanguage || rawLanguage || 'markdown',
      rawLanguage,
      start: info.startOffset,
      end: info.endOffset ?? normalizedContent.length,
      code: info.codeLines.join('\n'),
      startLine: info.startLine,
      endLine: info.endLine
    };
  });

  const blockIndexMap = new Map<number, VisualBlock>();
  blocks.forEach((block, index) => {
    blockIndexMap.set(index, block);
  });

  const htmlParts: string[] = [];

  let index = 0;
  while (index < lines.length) {
    const meta = lineMeta.get(index);
    if (meta && meta.role === 'start') {
      const block = blockIndexMap.get(meta.blockIndex);
      if (block) {
        htmlParts.push(
          `<div class="markdown-block" data-block-id="${block.id}" data-block-type="${block.type}" contenteditable="false">` +
            `<div class="markdown-block-toolbar" contenteditable="false">` +
              `<span class="markdown-block-label" contenteditable="false">${escapeHTML(resolveBlockLabel(block))}</span>` +
              `<div class="markdown-block-actions" contenteditable="false">` +
                `<button type="button" class="markdown-block-button" data-block-edit="${block.id}" data-block-edit-mode="visual" contenteditable="false">Visual</button>` +
                `<button type="button" class="markdown-block-button" data-block-edit="${block.id}" data-block-edit-mode="markdown" contenteditable="false">Markdown</button>` +
              `</div>` +
            `</div>` +
            `<div class="markdown-block-visual" data-block-visual="${block.id}" contenteditable="false"></div>` +
          `</div>`
        );
        index = block.endLine + 1;
        continue;
      }
    }

    if (meta) {
      index += 1;
      continue;
    }

    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === '') {
      htmlParts.push('<div class="markdown-line"><br /></div>');
      index += 1;
      continue;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      htmlParts.push('<div class="markdown-line markdown-hr">---</div>');
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
    if (headingMatch) {
      const [, hashes, spacing, text] = headingMatch;
      htmlParts.push(
        `<div class="markdown-line markdown-h${hashes.length}">${escapeHTML(hashes)}${spacing}${formatInlineMarkdown(text, variables)}</div>`
      );
      index += 1;
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      htmlParts.push(
        `<div class="markdown-line markdown-blockquote">&gt; ${formatInlineMarkdown(blockquoteMatch[1], variables)}</div>`
      );
      index += 1;
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const [, indent, marker, text] = listMatch;
      const indentHtml = escapeHTML(indent).replace(/ /g, '&nbsp;');
      htmlParts.push(
        `<div class="markdown-line markdown-list">${indentHtml}${escapeHTML(marker)} ${formatInlineMarkdown(text, variables)}</div>`
      );
      index += 1;
      continue;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      htmlParts.push(
        `<div class="markdown-line markdown-table-row">${escapeHTML(line)}</div>`
      );
      index += 1;
      continue;
    }

    htmlParts.push(
      `<div class="markdown-line">${formatInlineMarkdown(line, variables)}</div>`
    );
    index += 1;
  }

  return {
    html: htmlParts.join(''),
    blocks
  };
};

export function VisualMarkdownEditor({
  value,
  onChange,
  readOnly = false,
  previewContent,
  variables = []
}: VisualMarkdownEditorProps) {
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<SelectionSnapshot | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const blockRenderRoots = useRef<Map<string, Root>>(new Map());
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [blockMode, setBlockMode] = useState<'visual' | 'markdown'>('visual');

  const displayValue = previewContent ?? value;
  const displayValueRef = useRef(displayValue);

  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  const parsedResult = useMemo(
    () => parseMarkdownWithVisualBlocks(displayValue, variables),
    [displayValue, variables]
  );
  const parsedHTML = parsedResult.html;
  const blocks = parsedResult.blocks;

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    if (isComposing) return;

    const target = editorRef.current;
    const wasFocused = isEditableFocused(target);
    const snapshot = wasFocused ? selectionRef.current : null;

    blockRenderRoots.current.forEach((root) => root.unmount());
    blockRenderRoots.current.clear();

    if (parsedHTML) {
      target.innerHTML = parsedHTML;
    } else {
      target.innerHTML = '';
    }

    if (wasFocused) {
      restoreSelection(target, snapshot, displayValueRef.current);
    }
  }, [parsedHTML, isComposing]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
  const snapshot = getSelectionOffsets(editorRef.current, displayValueRef.current);
      if (snapshot) {
        selectionRef.current = snapshot;
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleBlockEditClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLButtonElement>('[data-block-edit]');
      if (!button) return;
      if (!editor.contains(button)) return;

      const blockId = button.getAttribute('data-block-edit');
      const modeAttr = button.getAttribute('data-block-edit-mode');
      if (!blockId) return;

      event.preventDefault();
      event.stopPropagation();

      setActiveBlockId(blockId);
      if (modeAttr === 'markdown' || modeAttr === 'visual') {
        setBlockMode(modeAttr);
      } else {
        setBlockMode('visual');
      }
    };

    editor.addEventListener('click', handleBlockEditClick);
    return () => editor.removeEventListener('click', handleBlockEditClick);
  }, []);

  useEffect(() => {
    return () => {
      blockRenderRoots.current.forEach((root) => root.unmount());
      blockRenderRoots.current.clear();
    };
  }, []);

  const syncSelection = useCallback((root?: HTMLElement) => {
    const target = root ?? editorRef.current;
    if (!target) return;
  const snapshot = getSelectionOffsets(target, displayValueRef.current);
    if (snapshot) {
      selectionRef.current = snapshot;
    }
  }, []);

  const handleInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const target = event.currentTarget;
      const plainText = getPlainTextFromEditor(target);

      syncSelection(target);

      if (plainText !== displayValueRef.current) {
        displayValueRef.current = plainText;
        onChange(plainText);
      }
    },
    [onChange, readOnly, syncSelection]
  );

  const getSelectionSnapshot = useCallback((): SelectionSnapshot | null => {
    if (selectionRef.current) {
      return selectionRef.current;
    }
    if (editorRef.current) {
      return getSelectionOffsets(editorRef.current, displayValueRef.current);
    }
    return null;
  }, []);

  const applyUpdate = useCallback(
    (updatedValue: string, newSelection: SelectionSnapshot) => {
      displayValueRef.current = updatedValue;
      onChange(updatedValue);
      selectionRef.current = newSelection;

      requestAnimationFrame(() => {
        if (editorRef.current) {
          restoreSelection(editorRef.current, newSelection, updatedValue);
        }
      });
    },
    [onChange]
  );

  const replaceBlockContent = useCallback(
    (block: VisualBlock, updatedCode: string) => {
      if (readOnly) return;

      const content = displayValueRef.current;
      const normalized = normalizePlainText(updatedCode);
      const original = content.slice(block.start, block.end);
      const endsWithNewline = original.endsWith('\n');
  const fenceLanguage = block.rawLanguage.trim();
  const openingFence = fenceLanguage ? '```' + fenceLanguage : '```';
  const closingFence = '```';
      const replacement =
        `${openingFence}\n${normalized}\n${closingFence}` + (endsWithNewline ? '\n' : '');
      const newValue =
        content.slice(0, block.start) + replacement + content.slice(block.end);

      displayValueRef.current = newValue;
      onChange(newValue);
    },
    [onChange, readOnly]
  );

  const renderVisualBlock = useCallback(
    (block: VisualBlock, options: { interactive?: boolean } = {}) => {
      const isInteractive = options.interactive ?? false;
      switch (block.type) {
        case 'mermaid':
          return (
            <VisualMermaid
              code={block.code}
              onChange={(value) => replaceBlockContent(block, value)}
              readOnly={readOnly || !isInteractive}
            />
          );
        case 'chart':
          return (
            <div className="space-y-3">
              <VisualChartBlock code={block.code} />
              <p className="text-xs text-muted-foreground">
                {isInteractive
                  ? 'Switch to the Markdown tab to update the JSON configuration for this chart.'
                  : 'Open the editor to update this chart.'}
              </p>
            </div>
          );
        case 'code':
        default:
          return (
            <CodeEditorBlock
              value={block.code}
              language={block.language}
              onChange={(value) => replaceBlockContent(block, value)}
              readOnly={readOnly || !isInteractive}
            />
          );
      }
    },
    [readOnly, replaceBlockContent]
  );

  const renderMarkdownEditor = useCallback(
    (block: VisualBlock) => {
      if (block.type === 'code') {
        return (
          <Textarea
            value={block.code}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              replaceBlockContent(block, event.target.value)
            }
            readOnly={readOnly}
            className="font-mono text-sm min-h-[240px]"
          />
        );
      }

      const language = block.type === 'chart' ? 'json' : block.language;

      return (
        <CodeEditorBlock
          value={block.code}
          language={language}
          onChange={(value) => replaceBlockContent(block, value)}
          readOnly={readOnly}
          height="300px"
        />
      );
    },
    [readOnly, replaceBlockContent]
  );

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return null;
    return blocks.find((block) => block.id === activeBlockId) ?? null;
  }, [activeBlockId, blocks]);

  useEffect(() => {
    if (activeBlockId && !activeBlock) {
      setActiveBlockId(null);
    }
  }, [activeBlockId, activeBlock]);

  useEffect(() => {
    if (!activeBlockId) {
      setBlockMode('visual');
    }
  }, [activeBlockId]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const activeBlockIds = new Set(blocks.map((block) => block.id));

    blockRenderRoots.current.forEach((root, key) => {
      const [blockId] = key.split(':');
      if (!activeBlockIds.has(blockId)) {
        root.unmount();
        blockRenderRoots.current.delete(key);
      }
    });

    const ensureRoot = (container: HTMLElement, key: string) => {
      let root = blockRenderRoots.current.get(key);
      if (!root) {
        root = createRoot(container);
        blockRenderRoots.current.set(key, root);
      }
      return root;
    };

    blocks.forEach((block) => {
      const blockElement = editor.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      if (!blockElement) return;

      const visualContainer = blockElement.querySelector<HTMLElement>(
        `[data-block-visual="${block.id}"]`
      );

      if (visualContainer) {
        const visualRoot = ensureRoot(visualContainer, `${block.id}:visual`);
        visualRoot.render(renderVisualBlock(block, { interactive: false }));
      }
    });
  }, [blocks, renderVisualBlock]);

  useEffect(() => {
    return () => {
      blockRenderRoots.current.forEach((root) => root.unmount());
      blockRenderRoots.current.clear();
    };
  }, []);

  const formatText = useCallback(
    (format: 'bold' | 'italic' | 'code' | 'header') => {
      if (readOnly) return;
      if (!editorRef.current) return;

      const selection = getSelectionSnapshot();
      if (!selection) return;

      const content = displayValueRef.current;
      const { start, end } = selection;
      if (start === end) return;

      const selectedText = content.slice(start, end);
      let formatted = selectedText;
      let newStart = start;
      let newEnd = end;

      switch (format) {
        case 'bold':
          formatted = `**${selectedText}**`;
          newStart = start;
          newEnd = start + formatted.length;
          break;
        case 'italic':
          formatted = `*${selectedText}*`;
          newStart = start;
          newEnd = start + formatted.length;
          break;
        case 'code':
          formatted = `\`${selectedText}\``;
          newStart = start;
          newEnd = start + formatted.length;
          break;
        case 'header': {
          const lines = content.split('\n');
          let charCounter = 0;
          for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            const lineStart = charCounter;
            const lineEnd = charCounter + line.length;

            if (start >= lineStart && end <= lineEnd) {
              if (line.startsWith('## ')) {
                lines[index] = line.slice(3);
                const updatedValue = lines.join('\n');
                applyUpdate(
                  updatedValue,
                  {
                    start: Math.max(lineStart, start - 3),
                    end: Math.max(lineStart, end - 3)
                  }
                );
              } else {
                lines[index] = `## ${line}`;
                const updatedValue = lines.join('\n');
                applyUpdate(
                  updatedValue,
                  {
                    start: start + 3,
                    end: end + 3
                  }
                );
              }
              return;
            }

            charCounter += line.length + 1;
          }
          return;
        }
      }

      const updatedValue =
        content.substring(0, start) + formatted + content.substring(end);

      applyUpdate(updatedValue, { start: newStart, end: newEnd });
    },
    [applyUpdate, getSelectionSnapshot, readOnly]
  );

  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (readOnly) return;
      const content = displayValueRef.current;
      const selection = getSelectionSnapshot() ?? {
        start: content.length,
        end: content.length
      };

      const headers = Array(cols)
        .fill('Header')
        .map((header, index) => `${header} ${index + 1}`)
        .join(' | ');
      const separator = Array(cols).fill('---').join(' | ');
      const tableRows = Array(Math.max(rows - 1, 1))
        .fill('')
        .map((_, rowIndex) =>
          Array(cols)
            .fill('Cell')
            .map((cell, colIndex) => `${cell} ${rowIndex + 1}-${colIndex + 1}`)
            .join(' | ')
        )
        .join('\n');

      const table = `\n\n| ${headers} |\n| ${separator} |\n${tableRows
        .split('\n')
        .map((row) => `| ${row} |`)
        .join('\n')}\n\n`;

      const updatedValue =
        content.slice(0, selection.start) +
        table +
        content.slice(selection.end);

      const cursor = selection.start + table.length;
      applyUpdate(updatedValue, { start: cursor, end: cursor });
    },
    [applyUpdate, getSelectionSnapshot, readOnly]
  );

  const insertMermaidDiagram = useCallback(
    (type: string) => {
      if (readOnly) return;
      const content = displayValueRef.current;
      const selection = getSelectionSnapshot() ?? {
        start: content.length,
        end: content.length
      };

      const diagrams: Record<string, string> = {
        flowchart: `\n\n\`\`\`mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E\n\`\`\`\n\n`,
        sequence: `\n\n\`\`\`mermaid\nsequenceDiagram\n    participant A as User\n    participant B as System\n    A->>B: Request\n    B-->>A: Response\n\`\`\`\n\n`,
        gantt: `\n\n\`\`\`mermaid\ngantt\n    title Project Timeline\n    dateFormat  YYYY-MM-DD\n    section Planning\n    Research    :2024-01-01, 7d\n    Design      :2024-01-08, 5d\n    section Development\n    Backend     :2024-01-13, 10d\n    Frontend    :2024-01-20, 8d\n\`\`\`\n\n`
      };

      const snippet = diagrams[type] ?? diagrams.flowchart;
      const updatedValue =
        content.slice(0, selection.start) +
        snippet +
        content.slice(selection.end);

      const cursor = selection.start + snippet.length;
      applyUpdate(updatedValue, { start: cursor, end: cursor });
      setMermaidOpen(false);
    },
    [applyUpdate, getSelectionSnapshot, readOnly]
  );

  const insertChartBlock = useCallback(() => {
    if (readOnly) return;
    const content = displayValueRef.current;
    const selection = getSelectionSnapshot() ?? {
      start: content.length,
      end: content.length
    };

    const chartLines = [
      '```chart',
      '{',
      '  "type": "bar",',
      '  "xKey": "label",',
      '  "series": [',
      '    { "key": "value", "name": "Value" }',
      '  ],',
      '  "data": [',
      '    { "label": "Alpha", "value": 4 },',
      '    { "label": "Beta", "value": 7 },',
      '    { "label": "Gamma", "value": 3 }',
      '  ]',
      '}',
      '```'
    ];

    const chartSnippet = `\n\n${chartLines.join('\n')}\n\n`;

    const updatedValue =
      content.slice(0, selection.start) + chartSnippet + content.slice(selection.end);

    const cursor = selection.start + chartSnippet.length;
    applyUpdate(updatedValue, { start: cursor, end: cursor });
  }, [applyUpdate, getSelectionSnapshot, readOnly]);

  const insertCodeBlock = useCallback(
    (language: string) => {
      if (readOnly) return;
      const content = displayValueRef.current;
      const selection = getSelectionSnapshot() ?? {
        start: content.length,
        end: content.length
      };

      const codeBlock = `\n\n\`\`\`${language}\n// Your code here\n\`\`\`\n\n`;
      const updatedValue =
        content.slice(0, selection.start) +
        codeBlock +
        content.slice(selection.end);

      const cursor = selection.start + codeBlock.length;
      applyUpdate(updatedValue, { start: cursor, end: cursor });
    },
    [applyUpdate, getSelectionSnapshot, readOnly]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) return;

      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'b':
            event.preventDefault();
            formatText('bold');
            return;
          case 'i':
            event.preventDefault();
            formatText('italic');
            return;
          case 'k':
            event.preventDefault();
            formatText('code');
            return;
          default:
            break;
        }
      }

      if (event.key === 'Enter') {
        const selection = getSelectionSnapshot();
        if (!selection) return;

        const content = displayValueRef.current;
        const cursorPos = selection.start;
        const beforeCursor = content.slice(0, cursorPos);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s+/);

        if (listMatch) {
          event.preventDefault();
          const indent = listMatch[1];
          const marker = listMatch[2];
          const lineContent = currentLine.slice(listMatch[0].length);

          if (!lineContent.trim()) {
            const listStart = cursorPos - currentLine.length;
            const updatedValue =
              content.slice(0, listStart) + content.slice(cursorPos);
            applyUpdate(updatedValue, { start: listStart, end: listStart });
            return;
          }

          const nextMarker = marker.match(/\d+/)
            ? `${parseInt(marker, 10) + 1}.`
            : marker;
          const insertion = `\n${indent}${nextMarker} `;
          const updatedValue =
            content.slice(0, cursorPos) +
            insertion +
            content.slice(cursorPos);

          const cursor = cursorPos + insertion.length;
          applyUpdate(updatedValue, { start: cursor, end: cursor });
        }
      }
    },
    [applyUpdate, formatText, getSelectionSnapshot, readOnly]
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      {!readOnly && (
        <div className="p-1.5 sm:p-2 md:p-3 border-b border-border bg-background/50 flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap overflow-x-auto">
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('bold')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0"
            >
              <span className="font-bold text-xs">B</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('italic')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0"
            >
              <span className="italic text-xs">I</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('code')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0"
            >
              <Code className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => formatText('header')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0 text-xs"
            >
              H2
            </Button>
          </div>

          <Separator orientation="vertical" className="h-4 sm:h-5 md:h-6 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <TableSizePicker onTableSelect={insertTable} />

            <Button
              variant="ghost"
              size="sm"
              onClick={insertChartBlock}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0"
              aria-label="Insert chart block"
              title="Insert chart block"
            >
              <BarChart3 className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
            </Button>

            <Dialog open={mermaidOpen} onOpenChange={setMermaidOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0"
                >
                  <MermaidIcon className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Insert Mermaid Diagram</DialogTitle>
                  <DialogDescription>
                    Choose a diagram type to insert into your markdown
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => insertMermaidDiagram('flowchart')}
                    className="w-full justify-start"
                  >
                    Flowchart
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => insertMermaidDiagram('sequence')}
                    className="w-full justify-start"
                  >
                    Sequence Diagram
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => insertMermaidDiagram('gantt')}
                    className="w-full justify-start"
                  >
                    Gantt Chart
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Separator orientation="vertical" className="h-4 sm:h-5 md:h-6 shrink-0" />

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertCodeBlock('javascript')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0 text-xs"
            >
              JS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertCodeBlock('python')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0 text-xs"
            >
              PY
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertCodeBlock('typescript')}
              className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0 text-xs"
            >
              TS
            </Button>
          </div>
        </div>
      )}

      {/* Editor with Visual Markdown Rendering */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 min-h-full">
          <div className="max-w-none">
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning={true}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => {
                setIsComposing(false);
                syncSelection();
              }}
              className="min-h-[1.5em] outline-none whitespace-pre-wrap font-mono text-sm leading-relaxed focus:ring-0 markdown-content"
              data-placeholder="Start writing your prompt here..."
            />
          </div>
        </div>
      </div>

        <Dialog
          open={!!activeBlock}
          onOpenChange={(open) => {
            if (!open) {
              setActiveBlockId(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            {activeBlock ? (
              <>
                <DialogHeader>
                  <DialogTitle>{resolveBlockLabel(activeBlock)}</DialogTitle>
                  <DialogDescription>
                    Switch between a live preview and the raw markdown for this block. Changes update immediately.
                  </DialogDescription>
                </DialogHeader>
                <Tabs
                  value={blockMode}
                  onValueChange={(value: string) => setBlockMode(value === 'markdown' ? 'markdown' : 'visual')}
                  className="mt-4"
                >
                  <TabsList className="grid w-fit grid-cols-2">
                    <TabsTrigger value="visual">Visual</TabsTrigger>
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-4 space-y-4">
                    {renderVisualBlock(activeBlock, { interactive: true })}
                  </TabsContent>
                  <TabsContent value="markdown" className="mt-4">
                    {renderMarkdownEditor(activeBlock)}
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
    </div>
  );
}
