import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Edit3, Copy, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface VisualTableProps {
  markdown: string;
  onChange: (newMarkdown: string) => void;
  readOnly?: boolean;
}

export function VisualTable({ markdown, onChange, readOnly = false }: VisualTableProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Parse markdown table to data structure
  const parseTable = (md: string) => {
    const lines = md.trim().split('\n');
    if (lines.length < 3) return { headers: [], rows: [] };

    const headers = lines[0]
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(h => h.trim());

    const rows = lines.slice(2).map(line =>
      line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map(cell => cell.trim())
    );

    return { headers, rows };
  };

  // Convert data structure back to markdown
  const generateMarkdown = (headers: string[], rows: string[][]) => {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
    
    return [headerRow, separatorRow, ...dataRows].join('\n');
  };

  const { headers, rows } = parseTable(markdown);

  const handleCellEdit = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = [...rows];
    if (rowIndex === -1) {
      // Editing header
      const newHeaders = [...headers];
      newHeaders[cellIndex] = value;
      onChange(generateMarkdown(newHeaders, rows));
    } else {
      // Editing data cell
      newRows[rowIndex][cellIndex] = value;
      onChange(generateMarkdown(headers, newRows));
    }
  };

  const addRow = () => {
    const newRow = new Array(headers.length).fill('New Cell');
    const newRows = [...rows, newRow];
    onChange(generateMarkdown(headers, newRows));
  };

  const addColumn = () => {
    const newHeaders = [...headers, 'New Header'];
    const newRows = rows.map(row => [...row, 'New Cell']);
    onChange(generateMarkdown(newHeaders, newRows));
  };

  const deleteRow = (rowIndex: number) => {
    const newRows = rows.filter((_, index) => index !== rowIndex);
    onChange(generateMarkdown(headers, newRows));
  };

  const deleteColumn = (colIndex: number) => {
    const newHeaders = headers.filter((_, index) => index !== colIndex);
    const newRows = rows.map(row => row.filter((_, index) => index !== colIndex));
    onChange(generateMarkdown(newHeaders, newRows));
  };

  const copyAsMarkdown = () => {
    navigator.clipboard.writeText(markdown);
    toast.success('Table copied as markdown!');
  };

  if (headers.length === 0) {
    return (
      <div className="p-4 border border-dashed border-muted-foreground/30 rounded-md">
        <p className="text-sm text-muted-foreground">Invalid table format</p>
      </div>
    );
  }

  return (
    <div className="my-4 border border-border rounded-md overflow-hidden">
      {/* Table Controls */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 border-b border-border">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 px-2 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {isEditing ? 'Done' : 'Edit'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyAsMarkdown}
            className="h-6 px-2 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          {isEditing && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={addRow}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Row
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={addColumn}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Column
              </Button>
            </>
          )}
        </div>
      )}

      {/* Visual Table */}
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={index} className="relative group">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={header}
                      onChange={(e) => handleCellEdit(-1, index, e.target.value)}
                      className="h-6 text-xs border-0 bg-transparent p-0"
                    />
                    {headers.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteColumn(index)}
                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="font-medium">{header}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="group">
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="relative">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={cell}
                        onChange={(e) => handleCellEdit(rowIndex, cellIndex, e.target.value)}
                        className="h-6 text-xs border-0 bg-transparent p-0"
                      />
                      {cellIndex === 0 && rows.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRow(rowIndex)}
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span>{cell}</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}