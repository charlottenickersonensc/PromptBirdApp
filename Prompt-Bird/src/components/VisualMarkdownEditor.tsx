import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo
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
import { Code } from 'lucide-react';
import { Separator } from './ui/separator';
import { MermaidIcon } from './MermaidIcon';
import { TableSizePicker } from './TableSizePicker';
import type { TemplateVariable } from './VariablesPanel';

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

const parseMarkdownToHTML = (content: string, variables: TemplateVariable[]) => {
  if (!content) return '';

  const normalizedContent = normalizePlainText(content);
  const lines = normalizedContent.split('\n');

  const htmlLines: string[] = [];
  let inCodeFence = false;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      htmlLines.push(
        `<div class="markdown-line markdown-code-block">${escapeHTML(line)}</div>`
      );
      return;
    }

    if (inCodeFence) {
      htmlLines.push(
        `<div class="markdown-line markdown-code-block">${escapeHTML(line)}</div>`
      );
      return;
    }

    if (trimmed === '') {
      htmlLines.push('<div class="markdown-line"><br /></div>');
      return;
    }

    if (/^(---|\*\*\*|___)$/.test(trimmed)) {
      htmlLines.push('<div class="markdown-line markdown-hr">---</div>');
      return;
    }

    const headingMatch = line.match(/^(#{1,6})(\s+)(.*)$/);
    if (headingMatch) {
      const [, hashes, spacing, text] = headingMatch;
      htmlLines.push(
        `<div class="markdown-line markdown-h${hashes.length}">${escapeHTML(hashes)}${spacing}${formatInlineMarkdown(text, variables)}</div>`
      );
      return;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      htmlLines.push(
        `<div class="markdown-line markdown-blockquote">&gt; ${formatInlineMarkdown(blockquoteMatch[1], variables)}</div>`
      );
      return;
    }

    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const [, indent, marker, text] = listMatch;
      const indentHtml = escapeHTML(indent).replace(/ /g, '&nbsp;');
      htmlLines.push(
        `<div class="markdown-line markdown-list">${indentHtml}${escapeHTML(marker)} ${formatInlineMarkdown(text, variables)}</div>`
      );
      return;
    }

    if (/^\|.*\|$/.test(trimmed)) {
      htmlLines.push(
        `<div class="markdown-line markdown-table-row">${escapeHTML(line)}</div>`
      );
      return;
    }

    htmlLines.push(
      `<div class="markdown-line">${formatInlineMarkdown(line, variables)}</div>`
    );
  });

  return htmlLines.join('');
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

  const displayValue = previewContent ?? value;
  const displayValueRef = useRef(displayValue);

  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  const parsedHTML = useMemo(
    () => parseMarkdownToHTML(displayValue, variables),
    [displayValue, variables]
  );

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    if (isComposing) return;

    const target = editorRef.current;
    const wasFocused = isEditableFocused(target);
    const snapshot = wasFocused ? selectionRef.current : null;

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
    </div>
  );
}