import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, Grid3X3, Code } from 'lucide-react';
import { Separator } from './ui/separator';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableOpen, setTableOpen] = useState(false);
  const [mermaidOpen, setMermaidOpen] = useState(false);

  const insertTable = () => {
    const headers = Array(tableCols).fill('Header').map((h, i) => `${h} ${i + 1}`).join(' | ');
    const separator = Array(tableCols).fill('---').join(' | ');
    const rows = Array(tableRows - 1).fill('').map((_, rowIndex) => 
      Array(tableCols).fill('Cell').map((c, colIndex) => `${c} ${rowIndex + 1}-${colIndex + 1}`).join(' | ')
    );
    
    const table = `\n\n| ${headers} |\n| ${separator} |\n${rows.map(row => `| ${row} |`).join('\n')}\n\n`;
    onChange(value + table);
    setTableOpen(false);
  };

  const insertMermaidDiagram = (type: string) => {
    const diagrams = {
      flowchart: `\n\n\`\`\`mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E\n\`\`\`\n\n`,
      sequence: `\n\n\`\`\`mermaid\nsequenceDiagram\n    participant A as User\n    participant B as System\n    A->>B: Request\n    B-->>A: Response\n\`\`\`\n\n`,
      gantt: `\n\n\`\`\`mermaid\ngantt\n    title Project Timeline\n    dateFormat  YYYY-MM-DD\n    section Planning\n    Research    :2024-01-01, 7d\n    Design      :2024-01-08, 5d\n    section Development\n    Backend     :2024-01-13, 10d\n    Frontend    :2024-01-20, 8d\n\`\`\`\n\n`
    };
    
    onChange(value + diagrams[type as keyof typeof diagrams]);
    setMermaidOpen(false);
  };

  const insertCodeBlock = (language: string) => {
    const codeBlock = `\n\n\`\`\`${language}\n// Your code here\n\`\`\`\n\n`;
    onChange(value + codeBlock);
  };

  const formatText = (format: string) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
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
          formattedText = `## ${selectedText}`;
          break;
      }
      
      const newValue = value.substring(0, start) + formattedText + value.substring(end);
      onChange(newValue);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b border-border bg-background/50 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => formatText('bold')}
            className="h-8 px-2"
          >
            <span className="font-bold">B</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => formatText('italic')}
            className="h-8 px-2"
          >
            <span className="italic">I</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => formatText('code')}
            className="h-8 px-2"
          >
            <Code className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => formatText('header')}
            className="h-8 px-2"
          >
            H2
          </Button>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Dialog open={tableOpen} onOpenChange={setTableOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Table className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Insert Table</DialogTitle>
                <DialogDescription>
                  Configure the dimensions for your new table
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rows">Rows</Label>
                    <Input
                      id="rows"
                      type="number"
                      value={tableRows}
                      onChange={(e) => setTableRows(Number(e.target.value))}
                      min="1"
                      max="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cols">Columns</Label>
                    <Input
                      id="cols"
                      type="number"
                      value={tableCols}
                      onChange={(e) => setTableCols(Number(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
                <Button onClick={insertTable} className="w-full">
                  Insert Table
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={mermaidOpen} onOpenChange={setMermaidOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <Grid3X3 className="h-3 w-3" />
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

        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => insertCodeBlock('javascript')}
            className="h-8 px-2 text-xs"
          >
            JS
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => insertCodeBlock('python')}
            className="h-8 px-2 text-xs"
          >
            PY
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => insertCodeBlock('typescript')}
            className="h-8 px-2 text-xs"
          >
            TS
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full p-4 bg-background border-0 resize-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed"
          placeholder="Start writing your prompt here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
}