import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './ui/sheet';
import { History, FileText, Sun, Moon, Share2 } from 'lucide-react';
import { Badge } from './ui/badge';

interface MobileLayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
  theme: string;
  toggleTheme: () => void;
  isViewingHistory: boolean;
  viewedVersion?: any;
  onReturnToCurrent: () => void;
  onSaveVersion: (comment: string) => void;
}

export function MobileLayout({ 
  leftPanel, 
  centerPanel, 
  rightPanel, 
  theme, 
  toggleTheme,
  isViewingHistory,
  viewedVersion,
  onReturnToCurrent,
  onSaveVersion
}: MobileLayoutProps) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Close history sheet when viewing history changes
  useEffect(() => {
    if (isViewingHistory) {
      setHistoryOpen(false);
    }
  }, [isViewingHistory]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile Header */}
      <div className="p-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Templates Menu */}
            <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-left">Templates</SheetTitle>
                  <SheetDescription className="text-left">
                    Browse and insert prompt engineering templates
                  </SheetDescription>
                </SheetHeader>
                <div className="h-full overflow-hidden">
                  {leftPanel}
                </div>
              </SheetContent>
            </Sheet>

            {/* History Menu */}
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <History className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-left">Version History</SheetTitle>
                  <SheetDescription className="text-left">
                    View and manage different versions of your prompt
                  </SheetDescription>
                </SheetHeader>
                <div className="h-full overflow-hidden">
                  {rightPanel}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* App Title and Status */}
          <div className="flex-1 text-center min-w-0">
            {isViewingHistory ? (
              <div className="flex items-center justify-center gap-2 min-w-0">
                <span className="text-sm text-amber-600 dark:text-amber-400 truncate">
                  Viewing v{viewedVersion?.version}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0">Read-only</Badge>
              </div>
            ) : (
              <h1 className="text-sm font-medium text-foreground truncate">PromptCraft</h1>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {theme === 'light' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {centerPanel}
      </div>

      {/* Mobile Action Bar */}
      <div className="p-3 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-center gap-2">
          {isViewingHistory ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onReturnToCurrent}
              className="text-xs px-3 h-8"
            >
              Return to Current
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const comment = prompt('Version comment:') || 'Manual save';
                  onSaveVersion(comment);
                }}
                className="text-xs px-3 h-8"
              >
                Save Version
              </Button>
              <Button variant="default" size="sm" className="text-xs px-3 h-8">
                Share
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}