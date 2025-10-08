import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { RotateCcw, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Version {
  id: string;
  content: string;
  timestamp: Date;
  version: string;
  comment: string;
}

interface VersionHistoryProps {
  versions: Version[];
  currentVersion?: string;
  viewedVersionId?: string | null;
  onRestoreVersion: (content: string) => void;
  onViewVersion: (versionId: string) => void;
}

export function VersionHistory({ versions, currentVersion, viewedVersionId, onRestoreVersion, onViewVersion }: VersionHistoryProps) {
  return (
    <ScrollArea className="h-full p-2 sm:p-4">
      <div className="space-y-2 sm:space-y-3">
        {versions.map((version, index) => {
          const isCurrent = version.id === currentVersion;
          const isViewed = version.id === viewedVersionId;
          const isOlder = index > 0;
          
          return (
            <Card 
              key={version.id} 
              className={`p-2 sm:p-3 transition-all cursor-pointer ${
                isCurrent && !isViewed
                  ? 'border-primary bg-primary/5' 
                  : isViewed
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                    : isOlder 
                      ? 'opacity-60 hover:opacity-80 hover:bg-accent/50' 
                      : 'hover:bg-accent/50'
              }`}
              onClick={() => !isCurrent && onViewVersion(version.id)}
            >
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <Badge 
                      variant={isCurrent && !isViewed ? "default" : isViewed ? "outline" : "secondary"}
                      className={`text-xs shrink-0 ${isViewed ? 'border-amber-500 text-amber-600 dark:text-amber-400' : ''}`}
                    >
                      v{version.version}
                    </Badge>
                    {isViewed && <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">Viewing</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                    {formatDistanceToNow(version.timestamp, { addSuffix: true })}
                  </span>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {version.comment}
                  </p>

                  <div className="text-xs text-muted-foreground sm:hidden">
                    {formatDistanceToNow(version.timestamp, { addSuffix: true })}
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-muted/50 p-1.5 sm:p-2 rounded font-mono leading-relaxed hidden sm:block">
                    <div className="line-clamp-2 sm:line-clamp-3">
                      {version.content.split('\n').slice(0, 3).join('\n')}
                      {version.content.split('\n').length > 3 && '...'}
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <div className="flex gap-1 pt-0.5 sm:pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreVersion(version.content);
                      }}
                      className="h-5 sm:h-6 px-1.5 sm:px-2 text-xs"
                    >
                      <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Restore</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="h-5 sm:h-6 px-1.5 sm:px-2 text-xs hidden sm:flex"
                    >
                      <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Comment</span>
                    </Button>
                  </div>
                )}

                {isCurrent && !isViewed && (
                  <div className="pt-0.5 sm:pt-1">
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        
        {versions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No versions yet</p>
            <p className="text-xs mt-1">Save your first version to start tracking changes</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}