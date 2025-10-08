import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Code } from 'lucide-react';
import { Separator } from './ui/separator';
import { MermaidIcon } from './MermaidIcon';
import { TableSizePicker } from './TableSizePicker';
import { VisualTable } from './VisualTable';
import { VisualMermaid } from './VisualMermaid';
import type { TemplateVariable } from './VariablesPanel';

interface VisualMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  previewContent?: string;
  variables?: TemplateVariable[];
}

export function VisualMarkdownEditor({ 
  value, 
  onChange, 
  readOnly = false, 
  previewContent,
  variables = []
}: VisualMarkdownEditorProps) {
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  // Update editor content when value prop changes (for external updates)
  useEffect(() => {
    if (editorRef.current && !isComposing) {
      const currentContent = editorRef.current.textContent || '';
      if (currentContent !== value) {
        // Preserve cursor position
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const startOffset = range?.startOffset || 0;
        const endOffset = range?.endOffset || 0;
        
        editorRef.current.textContent = value;
        
        // Restore cursor position
        if (range && editorRef.current.firstChild) {
          try {
            const newRange = document.createRange();
            const textNode = editorRef.current.firstChild;
            const maxOffset = (textNode as Text).length;
            newRange.setStart(textNode, Math.min(startOffset, maxOffset));
            newRange.setEnd(textNode, Math.min(endOffset, maxOffset));
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          } catch (e) {
            // If cursor restoration fails, just place at end
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }
        }
      }
    }
  }, [value, isComposing]);

  const handleInput = useCallback(() => {
    if (editorRef.current && !readOnly) {
      const newContent = editorRef.current.textContent || '';
      onChange(newContent);
    }
  }, [onChange, readOnly]);

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;

    // Handle common markdown shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          formatText('bold');
          break;
        case 'i':
          e.preventDefault();
          formatText('italic');
          break;
        case 'k':
          e.preventDefault();
          formatText('code');
          break;
      }
    }

    // Handle Enter key for list continuation
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const content = editorRef.current?.textContent || '';
        const cursorPos = range.startOffset;
        
        // Find the current line
        const lines = content.substring(0, cursorPos).split('\n');
        const currentLine = lines[lines.length - 1];
        
        // Check if we're in a list
        const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
        if (listMatch) {
          e.preventDefault();
          const indent = listMatch[1];
          const marker = listMatch[2];
          
          // If the line only contains the marker, remove it and unindent
          if (currentLine.trim() === marker) {
            const beforeCursor = content.substring(0, cursorPos - currentLine.length);
            const afterCursor = content.substring(cursorPos);
            const newContent = beforeCursor + '\n' + afterCursor;
            onChange(newContent);
            return;
          }
          
          // Otherwise, continue the list
          const nextMarker = marker.match(/\d+/) ? `${parseInt(marker) + 1}.` : marker;
          const newContent = content.substring(0, cursorPos) + 
                           `\n${indent}${nextMarker} ` + 
                           content.substring(cursorPos);
          onChange(newContent);
          
          // Set cursor position after the new marker
          setTimeout(() => {
            if (editorRef.current) {
              const newCursorPos = cursorPos + `\n${indent}${nextMarker} `.length;
              const textNode = editorRef.current.firstChild as Text;
              if (textNode) {
                const range = document.createRange();
                range.setStart(textNode, Math.min(newCursorPos, textNode.length));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }, 0);
        }
      }
    }
  }, [onChange, readOnly]);

  const formatText = useCallback((format: string) => {
    if (readOnly || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    const content = editorRef.current.textContent || '';
    
    if (selectedText) {
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      
      let formattedText = '';
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText}*`;
          break;
        case 'code':
          formattedText = `\`${selectedText}\``;
          break;
        case 'header':
          // For headers, format the entire line
          const lines = content.split('\n');
          const charCount = content.substring(0, startOffset).split('\n').length - 1;
          const currentLine = lines[charCount];
          const newLine = currentLine.startsWith('## ') ? currentLine.substring(3) : `## ${currentLine}`;
          lines[charCount] = newLine;
          onChange(lines.join('\n'));
          return;
      }
      
      // Find the actual character positions in the text content
      const beforeText = content.substring(0, startOffset);
      const afterText = content.substring(endOffset);
      const newContent = beforeText + formattedText + afterText;
      
      onChange(newContent);
      
      // Restore selection after formatting
      setTimeout(() => {
        if (editorRef.current && editorRef.current.firstChild) {
          const textNode = editorRef.current.firstChild as Text;
          const newRange = document.createRange();
          const newStart = startOffset;
          const newEnd = startOffset + formattedText.length;
          
          try {
            newRange.setStart(textNode, Math.min(newStart, textNode.length));
            newRange.setEnd(textNode, Math.min(newEnd, textNode.length));
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {
            // If selection fails, just place cursor at end
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }, 0);
    }
  }, [onChange, readOnly]);

  const insertTable = (rows: number, cols: number) => {
    if (readOnly || !editorRef.current) return;
    
    const headers = Array(cols).fill('Header').map((h, i) => `${h} ${i + 1}`).join(' | ');
    const separator = Array(cols).fill('---').join(' | ');
    const tableRows = Array(rows - 1).fill('').map((_, rowIndex) => 
      Array(cols).fill('Cell').map((c, colIndex) => `${c} ${rowIndex + 1}-${colIndex + 1}`).join(' | ')
    );
    
    const table = `\n\n| ${headers} |\n| ${separator} |\n${tableRows.map(row => `| ${row} |`).join('\n')}\n\n`;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPos = range.startOffset;
      const content = editorRef.current.textContent || '';
      const newContent = content.substring(0, cursorPos) + table + content.substring(cursorPos);
      onChange(newContent);
    } else {
      onChange(value + table);
    }
  };

  const insertMermaidDiagram = (type: string) => {
    if (readOnly || !editorRef.current) return;
    
    const diagrams = {
      flowchart: `\n\n\`\`\`mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E\n\`\`\`\n\n`,
      sequence: `\n\n\`\`\`mermaid\nsequenceDiagram\n    participant A as User\n    participant B as System\n    A->>B: Request\n    B-->>A: Response\n\`\`\`\n\n`,
      gantt: `\n\n\`\`\`mermaid\ngantt\n    title Project Timeline\n    dateFormat  YYYY-MM-DD\n    section Planning\n    Research    :2024-01-01, 7d\n    Design      :2024-01-08, 5d\n    section Development\n    Backend     :2024-01-13, 10d\n    Frontend    :2024-01-20, 8d\n\`\`\`\n\n`
    };
    
    const diagram = diagrams[type as keyof typeof diagrams];
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cursorPos = range.startOffset;
      const content = editorRef.current.textContent || '';
      const newContent = content.substring(0, cursorPos) + diagram + content.substring(cursorPos);
      onChange(newContent);
    } else {
      onChange(value + diagram);
    }
    
    setMermaidOpen(false);
  };

  // Parse markdown and apply styling while preserving syntax
  const parseMarkdownToHTML = (content: string): string => {
    let html = content;
    
    // Escape HTML characters first
    html = html
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>');
    
    // Headers (preserve the # symbols but style the text)
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, text) => {
      const level = hashes.length;
      const headerClass = `markdown-h${level}`;
      return `<span class="${headerClass}">${hashes} ${text}</span>`;
    });
    
    // Bold text (**text** or __text__)
    html = html.replace(/(\*\*|__)([^*_]+)\1/g, '<span class="markdown-bold">$1$2$1</span>');
    
    // Italic text (*text* or _text_)
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<span class="markdown-italic">*$1*</span>');
    html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<span class="markdown-italic">_$1_</span>');
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<span class="markdown-code">`$1`</span>');
    
    // Code blocks (```language\ncode\n```)
    html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, 
      '<span class="markdown-code-block">```$1\n$2\n```</span>');
    
    // Strikethrough (~~text~~)
    html = html.replace(/~~([^~]+)~~/g, '<span class="markdown-strikethrough">~~$1~~</span>');
    
    // Blockquotes (> text)
    html = html.replace(/^>\s+(.+)$/gm, '<span class="markdown-blockquote">> $1</span>');
    
    // Lists (- item, * item, + item, 1. item)
    html = html.replace(/^(\s*)([-*+]|\d+\.)\s+(.+)$/gm, 
      '<span class="markdown-list">$1$2 $3</span>');
    
    // Links ([text](url))
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
      '<span class="markdown-link">[<span class="markdown-link-text">$1</span>](<span class="markdown-link-url">$2</span>)</span>');
    
    // Horizontal rules (--- or ***)
    html = html.replace(/^(---|\*\*\*|___)$/gm, '<span class="markdown-hr">$1</span>');
    
    // Template variables ({{VariableName}})
  html = html.replace(/\{\{([^}]+)\}\}/g, (_match, variableName) => {
      const trimmedName = variableName.trim();
      const variable = variables.find(v => v.name.toLowerCase() === trimmedName.toLowerCase());
      
      if (variable) {
        return `<span class="markdown-variable" title="${variable.description || variable.name}: ${variable.value}">{{${trimmedName}}}</span>`;
      } else {
        return `<span class="markdown-variable-undefined" title="Undefined variable: ${trimmedName}">{{${trimmedName}}}</span>`;
      }
    });
    
    return html;
  };

  // Parse and render content with visual components for tables and diagrams
  const renderContent = () => {
    // Use preview content for rendering if available, but edit the original value
  const content = previewContent || value;
  const parts: ReactNode[] = [];
    let currentIndex = 0;
    let partKey = 0;

    // Find tables and mermaid blocks
    const tableRegex = /(\|[^\n]*\|[\n\r]+(?:\|[^\n]*\|[\n\r]*)*)/gm;
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/gm;
    
    // Combine all matches with their positions
    const matches: Array<{ start: number; end: number; type: 'table' | 'mermaid'; content: string }> = [];
    
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'table',
        content: match[0].trim()
      });
    }
    
    // Reset regex
    mermaidRegex.lastIndex = 0;
    while ((match = mermaidRegex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'mermaid',
        content: match[1].trim()
      });
    }
    
    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);
    
    // If there are visual components, render them separately from editable text
    if (matches.length > 0) {
      matches.forEach((match) => {
        // Add text before this match
        if (currentIndex < match.start) {
          const beforeText = content.slice(currentIndex, match.start);
          if (beforeText.trim()) {
            const styledHTML = parseMarkdownToHTML(beforeText);
            parts.push(
              <div
                key={partKey++}
                ref={currentIndex === 0 ? editorRef : undefined}
                contentEditable={!readOnly}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                className="min-h-[1.5em] outline-none whitespace-pre-wrap font-mono text-sm leading-relaxed focus:ring-0 markdown-content"
                style={{ wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: styledHTML }}
              />
            );
          }
        }
        
        // Add the visual component
        if (match.type === 'table') {
          parts.push(
            <VisualTable
              key={partKey++}
              markdown={match.content}
              onChange={(newMarkdown) => {
                const newContent = content.slice(0, match.start) + newMarkdown + content.slice(match.end);
                onChange(newContent);
              }}
              readOnly={readOnly}
            />
          );
        } else if (match.type === 'mermaid') {
          parts.push(
            <VisualMermaid
              key={partKey++}
              code={match.content}
              onChange={(newCode) => {
                const newMarkdown = `\`\`\`mermaid\n${newCode}\n\`\`\``;
                const newContent = content.slice(0, match.start) + newMarkdown + content.slice(match.end);
                onChange(newContent);
              }}
              readOnly={readOnly}
            />
          );
        }
        
        currentIndex = match.end;
      });
      
      // Add remaining text
      if (currentIndex < content.length) {
        const remainingText = content.slice(currentIndex);
        if (remainingText.trim()) {
          const styledHTML = parseMarkdownToHTML(remainingText);
          parts.push(
            <div
              key={partKey++}
              contentEditable={!readOnly}
              suppressContentEditableWarning={true}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              className="min-h-[1.5em] outline-none whitespace-pre-wrap font-mono text-sm leading-relaxed focus:ring-0 markdown-content"
              style={{ wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: styledHTML }}
            />
          );
        }
      }
      
      return parts;
    }
    
    // If no visual components, render single editable area with markdown styling
    if (!content) {
      return (
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className="min-h-[1.5em] outline-none whitespace-pre-wrap font-mono text-sm leading-relaxed focus:ring-0 markdown-content"
          style={{ wordBreak: 'break-word' }}
          data-placeholder="Start writing your prompt here..."
        />
      );
    }

    const styledHTML = parseMarkdownToHTML(content);
    return (
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        className="min-h-[1.5em] outline-none whitespace-pre-wrap font-mono text-sm leading-relaxed focus:ring-0 markdown-content"
        style={{ wordBreak: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: styledHTML }}
      />
    );
  };

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
                <Button variant="ghost" size="sm" className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0">
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
        </div>
      )}

      {/* Editor with Visual Markdown Rendering */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 min-h-full">
          <div className="max-w-none">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}