import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Table } from 'lucide-react';

interface TableSizePickerProps {
  onTableSelect: (rows: number, cols: number) => void;
}

export function TableSizePicker({ onTableSelect }: TableSizePickerProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [open, setOpen] = useState(false);

  const maxRows = 8;
  const maxCols = 8;

  const handleCellHover = (row: number, col: number) => {
    setHoveredCell({ row, col });
  };

  const handleCellClick = (row: number, col: number) => {
    onTableSelect(row + 1, col + 1);
    setOpen(false);
    setHoveredCell(null);
  };

  const getCellClass = (row: number, col: number) => {
    const isHighlighted = hoveredCell && row <= hoveredCell.row && col <= hoveredCell.col;
    return `w-4 h-4 border border-border cursor-pointer transition-colors ${
      isHighlighted 
        ? 'bg-primary/20 border-primary' 
        : 'bg-background hover:bg-accent'
    }`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 sm:h-7 md:h-8 px-1 sm:px-1.5 md:px-2 min-w-0">
          <Table className="h-2.5 sm:h-3 w-2.5 sm:w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground mb-2">
            {hoveredCell 
              ? `${hoveredCell.row + 1} × ${hoveredCell.col + 1} table`
              : 'Select table size'
            }
          </div>
          <div 
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {Array.from({ length: maxRows }, (_, row) =>
              Array.from({ length: maxCols }, (_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={getCellClass(row, col)}
                  onMouseEnter={() => handleCellHover(row, col)}
                  onClick={() => handleCellClick(row, col)}
                />
              ))
            )}
          </div>
          <div className="text-xs text-muted-foreground text-center pt-1">
            Click to insert table
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}