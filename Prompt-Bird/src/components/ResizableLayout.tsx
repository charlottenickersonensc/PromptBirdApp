import { useState } from 'react';
import type { ReactNode } from 'react';
import { Resizable } from 're-resizable';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResizableLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export function ResizableLayout({ leftPanel, centerPanel, rightPanel }: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const minLeftWidth = 150;
  const maxLeftWidth = 600;
  const minRightWidth = 150;
  const maxRightWidth = 600;

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <Resizable
        size={{ width: leftCollapsed ? 0 : leftWidth, height: '100%' }}
        onResizeStop={(_event, _direction, _ref, d) => {
          if (!leftCollapsed) {
            setLeftWidth(leftWidth + d.width);
          }
        }}
        minWidth={leftCollapsed ? 0 : minLeftWidth}
        maxWidth={leftCollapsed ? 0 : maxLeftWidth}
        enable={{ 
          right: !leftCollapsed,
          top: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          topLeft: false,
          bottomLeft: false
        }}
        handleStyles={{
          right: {
            width: leftCollapsed ? 0 : '4px',
            background: 'transparent',
            cursor: leftCollapsed ? 'default' : 'col-resize'
          }
        }}
        className={`border-r border-border transition-all duration-300 ${leftCollapsed ? 'border-r-0' : ''}`}
      >
        <div className={`h-full transition-all duration-300 overflow-hidden ${leftCollapsed ? 'w-0' : 'w-full'}`}>
          {leftPanel}
        </div>
      </Resizable>

      {/* Left Panel Toggle */}
      <div className="flex flex-col justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          className="h-8 w-4 rounded-none border-y border-border bg-background/50 hover:bg-accent"
        >
          {leftCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Center Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {centerPanel}
      </div>

      {/* Right Panel Toggle */}
      <div className="flex flex-col justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRightCollapsed(!rightCollapsed)}
          className="h-8 w-4 rounded-none border-y border-border bg-background/50 hover:bg-accent"
        >
          {rightCollapsed ? (
            <ChevronLeft className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Right Panel */}
      <Resizable
        size={{ width: rightCollapsed ? 0 : rightWidth, height: '100%' }}
        onResizeStop={(_event, _direction, _ref, d) => {
          if (!rightCollapsed) {
            setRightWidth(rightWidth - d.width);
          }
        }}
        minWidth={rightCollapsed ? 0 : minRightWidth}
        maxWidth={rightCollapsed ? 0 : maxRightWidth}
        enable={{ 
          left: !rightCollapsed,
          top: false,
          bottom: false,
          right: false,
          topRight: false,
          bottomRight: false,
          topLeft: false,
          bottomLeft: false
        }}
        handleStyles={{
          left: {
            width: rightCollapsed ? 0 : '4px',
            background: 'transparent',
            cursor: rightCollapsed ? 'default' : 'col-resize'
          }
        }}
        className={`border-l border-border transition-all duration-300 ${rightCollapsed ? 'border-l-0' : ''}`}
      >
        <div className={`h-full transition-all duration-300 overflow-hidden ${rightCollapsed ? 'w-0' : 'w-full'}`}>
          {rightPanel}
        </div>
      </Resizable>
    </div>
  );
}