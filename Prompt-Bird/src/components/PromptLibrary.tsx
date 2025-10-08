import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  FileText, 
  MoreVertical, 
  Search, 
  Calendar,
  Edit,
  Trash2,
  Copy,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { ScrollArea } from './ui/scroll-area';

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  description?: string;
  folderId?: string | null;
}

export interface PromptFolder {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string | null;
  isExpanded?: boolean;
}

interface PromptLibraryProps {
  prompts: SavedPrompt[];
  folders: PromptFolder[];
  onOpenPrompt: (prompt: SavedPrompt) => void;
  onDeletePrompt: (id: string) => void;
  onDuplicatePrompt: (prompt: SavedPrompt) => void;
  onRenamePrompt: (id: string, newTitle: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onMovePrompt: (promptId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onToggleFolder: (id: string) => void;
  onNewPrompt: () => void;
}

const ItemTypes = {
  PROMPT: 'prompt',
  FOLDER: 'folder'
};

// Draggable Prompt Component
interface DraggablePromptProps {
  prompt: SavedPrompt;
  onOpen: (prompt: SavedPrompt) => void;
  onRename: (id: string, newTitle: string) => void;
  onDuplicate: (prompt: SavedPrompt) => void;
  onDelete: (id: string) => void;
  level?: number;
}

function DraggablePrompt({ 
  prompt, 
  onOpen, 
  onRename, 
  onDuplicate, 
  onDelete,
  level = 0 
}: DraggablePromptProps) {
  const [editingTitle, setEditingTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.PROMPT,
    item: { id: prompt.id, type: 'prompt' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const cardRef = useRef<HTMLDivElement | null>(null);
  drag(cardRef);

  const handleRename = () => {
    setIsEditing(true);
    setEditingTitle(prompt.title);
  };

  const handleSaveRename = () => {
    if (editingTitle.trim()) {
      onRename(prompt.id, editingTitle.trim());
    }
    setIsEditing(false);
    setEditingTitle('');
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setEditingTitle('');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getPreview = (content: string) => {
    const cleanContent = content.replace(/[#*`>-]/g, '').trim();
    return cleanContent.length > 60 ? cleanContent.substring(0, 60) + '...' : cleanContent;
  };

  return (
    <Card 
      ref={cardRef}
      className={`cursor-pointer hover:bg-accent/50 transition-colors group ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{ marginLeft: `${level * 16}px` }}
      onClick={() => !isEditing && onOpen(prompt)}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') handleCancelRename();
                  }}
                  className="h-6 text-xs flex-1"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveRename}
                  className="h-6 w-6 p-0"
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelRename}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            ) : (
              <CardTitle className="text-xs truncate flex items-center gap-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                {prompt.title}
              </CardTitle>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
              <CardDescription className="text-xs">
                {formatDate(prompt.updatedAt)}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onOpen(prompt);
              }}>
                <FileText className="mr-2 h-3 w-3" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}>
                <Edit className="mr-2 h-3 w-3" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicate(prompt);
              }}>
                <Copy className="mr-2 h-3 w-3" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete prompt?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the prompt "{prompt.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(prompt.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {getPreview(prompt.content)}
        </p>
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prompt.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1 h-4">
                {tag}
              </Badge>
            ))}
            {prompt.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs px-1 h-4">
                +{prompt.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Draggable and Droppable Folder Component
interface DraggableFolderProps {
  folder: PromptFolder;
  prompts: SavedPrompt[];
  children: ReactNode;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onDrop: (itemId: string, itemType: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  level?: number;
}

function DraggableFolder({ 
  folder, 
  prompts,
  children, 
  onRename, 
  onDelete, 
  onToggle, 
  onDrop,
  onCreateSubfolder,
  level = 0 
}: DraggableFolderProps) {
  const [editingName, setEditingName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.FOLDER,
    item: { id: folder.id, type: 'folder' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: [ItemTypes.PROMPT, ItemTypes.FOLDER],
    drop: (item: { id: string; type: string }) => {
      if (item.id !== folder.id) {
        onDrop(item.id, item.type);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  drop(containerRef);
  drag(containerRef);

  const handleRename = () => {
    setIsEditing(true);
    setEditingName(folder.name);
  };

  const handleSaveRename = () => {
    if (editingName.trim()) {
      onRename(folder.id, editingName.trim());
    }
    setIsEditing(false);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setIsEditing(false);
    setEditingName('');
  };

  const promptCount = prompts.filter(p => p.folderId === folder.id).length;

  return (
    <div ref={containerRef}>
      <div 
        className={`flex items-center gap-1 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors group ${
          isDragging ? 'opacity-50' : ''
        } ${isOver ? 'bg-accent' : ''}`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={() => onToggle(folder.id)}
        >
          {folder.isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
        
        <Folder className="h-3 w-3 text-blue-600" />
        
        {isEditing ? (
          <div className="flex gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
              className="h-5 text-xs flex-1"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveRename}
              className="h-5 w-5 p-0"
            >
              ✓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelRename}
              className="h-5 w-5 p-0"
            >
              ×
            </Button>
          </div>
        ) : (
          <span className="text-xs flex-1 truncate">{folder.name}</span>
        )}
        
        <span className="text-xs text-muted-foreground">{promptCount}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-2.5 w-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}>
              <FolderPlus className="mr-2 h-3 w-3" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleRename();
            }}>
              <Edit className="mr-2 h-3 w-3" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  className="text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the folder "{folder.name}" and move all its contents to the root.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(folder.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {folder.isExpanded && children}
    </div>
  );
}

// Root Drop Zone Component
interface RootDropZoneProps {
  onDrop: (itemId: string, itemType: string) => void;
  children: ReactNode;
}

function RootDropZone({ onDrop, children }: RootDropZoneProps) {
  const [{ isOver }, drop] = useDrop({
    accept: [ItemTypes.PROMPT, ItemTypes.FOLDER],
    drop: (item: { id: string; type: string }) => {
      onDrop(item.id, item.type);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  drop(containerRef);

  return (
    <div ref={containerRef} className={`h-full ${isOver ? 'bg-accent/30' : ''}`}>
      {children}
    </div>
  );
}

export function PromptLibrary({ 
  prompts, 
  folders,
  onOpenPrompt, 
  onDeletePrompt, 
  onDuplicatePrompt,
  onRenamePrompt,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMovePrompt,
  onMoveFolder,
  onToggleFolder,
  onNewPrompt
}: PromptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPrompts = prompts.filter(prompt =>
    prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFolder = () => {
    const name = prompt('Folder name:');
    if (name?.trim()) {
      onCreateFolder(name.trim());
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    const name = prompt('Subfolder name:');
    if (name?.trim()) {
      onCreateFolder(name.trim(), parentId);
    }
  };

  const handleRootDrop = (itemId: string, itemType: string) => {
    if (itemType === 'prompt') {
      onMovePrompt(itemId, null);
    } else if (itemType === 'folder') {
      onMoveFolder(itemId, null);
    }
  };

  const handleFolderDrop = (folderId: string) => (itemId: string, itemType: string) => {
    if (itemType === 'prompt') {
      onMovePrompt(itemId, folderId);
    } else if (itemType === 'folder') {
      onMoveFolder(itemId, folderId);
    }
  };

  const renderFolderTree = (parentId: string | null = null, level: number = 0): ReactNode[] => {
    const childFolders = filteredFolders.filter(f => f.parentId === parentId);
    const childPrompts = filteredPrompts.filter(p => p.folderId === parentId);
    
    const result: ReactNode[] = [];
    
    // Render folders first
    childFolders.forEach(folder => {
      result.push(
        <DraggableFolder
          key={folder.id}
          folder={folder}
          prompts={prompts}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
          onToggle={onToggleFolder}
          onDrop={handleFolderDrop(folder.id)}
          onCreateSubfolder={handleCreateSubfolder}
          level={level}
        >
          {renderFolderTree(folder.id, level + 1)}
        </DraggableFolder>
      );
    });
    
    // Then render prompts
    childPrompts.forEach(prompt => {
      result.push(
        <DraggablePrompt
          key={prompt.id}
          prompt={prompt}
          onOpen={onOpenPrompt}
          onRename={onRenamePrompt}
          onDuplicate={onDuplicatePrompt}
          onDelete={onDeletePrompt}
          level={level}
        />
      );
    });
    
    return result;
  };

  if (prompts.length === 0 && folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-sm font-medium text-foreground mb-2">No prompts yet</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Your saved prompts will appear here
        </p>
        <Button variant="outline" size="sm" className="text-xs">
          Create your first prompt
        </Button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Search Bar */}
        <div className="p-2 sm:p-4 border-b border-border">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search prompts and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <Button 
            onClick={handleCreateFolder}
            variant="outline" 
            size="sm" 
            className="w-full text-xs h-7 mb-2"
          >
            <FolderPlus className="h-3 w-3 mr-1" />
            New Folder
          </Button>
          <Button 
            onClick={onNewPrompt}
            size="sm" 
            className="w-full text-xs h-7"
          >
            <FileText className="h-3 w-3 mr-1" />
            New Prompt
          </Button>
        </div>

        {/* File Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2 sm:p-4 space-y-1">
            <RootDropZone onDrop={handleRootDrop}>
              {renderFolderTree()}
            </RootDropZone>
          </div>
        </ScrollArea>
      </div>
    </DndProvider>
  );
}