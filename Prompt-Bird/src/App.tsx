import { useState } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { ResizableLayout } from './components/ResizableLayout';
import { MobileLayout } from './components/MobileLayout';
import { VisualMarkdownEditor } from './components/VisualMarkdownEditor';
import { VersionHistory } from './components/VersionHistory';
import { TemplatePreview } from './components/TemplatePreview';
import type { SavedPrompt, PromptFolder } from './components/PromptLibrary';
import { PromptLibrary } from './components/PromptLibrary';
import { EditableTitle } from './components/EditableTitle';
import { SettingsDialog } from './components/SettingsDialog';
import { VariablesPanel } from './components/VariablesPanel';
import type { TemplateVariable } from './components/VariablesPanel';
import { substituteVariables } from './components/utils/variableSubstitution';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Share2, Settings, Sun, Moon, FileText, BookOpen, Copy, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { Badge } from './components/ui/badge';
import { useMobile } from './components/hooks/use-mobile';

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useMobile();
  const [currentPrompt, setCurrentPrompt] = useState('# Welcome to PromptBook\n\nYour **AI prompt engineering** workspace.\n\n## Getting Started\n\nStart writing your prompt here. Use **markdown** syntax for formatting.\n\n```javascript\n// Code blocks are supported\nconst prompt = "Your AI prompt here";\n```\n\n### Features\n- Rich markdown editing with *visible syntax*\n- Version history tracking\n- Built-in templates for software engineering\n- Easy table and diagram insertion\n- Comments and documentation\n- Sharing capabilities\n\n> This is a blockquote example\n\n## Visual Tables\n\nTables render visually and can be edited inline:\n\n| Feature | Status | Priority |\n| --- | --- | --- |\n| Visual Tables | ✅ Complete | High |\n| Mermaid Diagrams | ✅ Complete | High |\n| Drag & Drop Folders | ✅ Complete | Medium |\n\n## Mermaid Diagrams\n\nDiagrams render visually with editing capabilities:\n\n```mermaid\nflowchart TD\n    A[Start Prompt] --> B[Need Table?]\n    B --> C[Insert Table]\n    A --> D[Need Diagram?]\n    D --> E[Insert Mermaid]\n    A --> F[Continue Writing]\n    C --> G[Save & Share]\n    E --> G\n    F --> G\n```\n\n#### Checklist Example\n- [ ] Task 1\n- [x] Completed task\n- [ ] Task 2');
  
  const [documentTitle, setDocumentTitle] = useState('Welcome Guide');
  const [activeTab, setActiveTab] = useState('templates');
  
  const [versionHistory, setVersionHistory] = useState([
    {
      id: '1',
      content: currentPrompt,
      timestamp: new Date(),
      version: '1.0',
      comment: 'Initial prompt creation'
    }
  ]);

  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([
    {
      id: 'demo-1',
      title: 'API Integration Guide',
      content: '# API Integration Guide\n\nWrite clear instructions for integrating with external APIs...',
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: new Date(Date.now() - 86400000 * 1),
      tags: ['api', 'integration'],
      description: 'Guide for API integration best practices',
      folderId: 'folder-1'
    },
    {
      id: 'demo-2', 
      title: 'User Story Template',
      content: '# User Story\n\nAs a [user type], I want [functionality] so that [benefit]...',
      createdAt: new Date(Date.now() - 86400000 * 7),
      updatedAt: new Date(Date.now() - 86400000 * 2),
      tags: ['template', 'agile'],
      description: 'Template for writing user stories',
      folderId: 'folder-1'
    },
    {
      id: 'demo-3',
      title: 'Bug Report Template',
      content: '# Bug Report\n\n## Description\nBrief description of the bug...\n\n## Steps to Reproduce\n1. Step 1\n2. Step 2\n3. Step 3',
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 86400000 * 1),
      tags: ['bug', 'template'],
      description: 'Template for bug reports',
      folderId: null
    }
  ]);

  const [folders, setFolders] = useState<PromptFolder[]>([
    {
      id: 'folder-1',
      name: 'Templates',
      createdAt: new Date(Date.now() - 86400000 * 7),
      updatedAt: new Date(Date.now() - 86400000 * 2),
      parentId: null,
      isExpanded: true
    },
    {
      id: 'folder-2',
      name: 'Work Projects',
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 86400000 * 1),
      parentId: null,
      isExpanded: false
    }
  ]);

  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);
  const [viewedVersionId, setViewedVersionId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [variablesCollapsed, setVariablesCollapsed] = useState(true);

  // Template Variables State
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([
    {
      id: 'var-1',
      name: 'ProjectName',
      value: 'My Awesome Project',
      type: 'string',
      description: 'The name of the current project',
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000)
    },
    {
      id: 'var-2',
      name: 'Description',
      value: 'A comprehensive solution for managing AI prompts and templates',
      type: 'string',
      description: 'Project description for templates',
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(Date.now() - 86400000)
    },
    {
      id: 'var-3',
      name: 'CodeExample',
      value: 'const prompt = "Your AI prompt here";\nconsole.log(prompt);',
      type: 'code',
      description: 'Sample code snippet',
      createdAt: new Date(Date.now() - 86400000 * 3),
      updatedAt: new Date(Date.now() - 86400000)
    }
  ]);

  const handleSaveVersion = (comment: string) => {
    const newVersion = {
      id: Date.now().toString(),
      content: currentPrompt,
      timestamp: new Date(),
      version: `1.${versionHistory.length}`,
      comment
    };
    setVersionHistory([newVersion, ...versionHistory]);
  };

  const handleTemplateInsert = (template: string) => {
    // Substitute variables in template before inserting
    const substitutedTemplate = substituteVariables(template, templateVariables);
    setCurrentPrompt(prev => prev + '\n\n' + substitutedTemplate);
  };

  const handleOpenPrompt = (prompt: SavedPrompt) => {
    setCurrentPrompt(prompt.content);
    setDocumentTitle(prompt.title);
    setCurrentPromptId(prompt.id);
    setViewedVersionId(null);
    
    // Reset version history for the opened prompt
    setVersionHistory([{
      id: '1',
      content: prompt.content,
      timestamp: prompt.updatedAt,
      version: '1.0',
      comment: 'Opened from library'
    }]);
  };

  const handleDeletePrompt = (id: string) => {
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    if (currentPromptId === id) {
      // If we're deleting the currently open prompt, create a new one
      setCurrentPrompt('');
      setDocumentTitle('New Prompt');
      setCurrentPromptId(null);
      setVersionHistory([]);
    }
  };

  const handleDuplicatePrompt = (prompt: SavedPrompt) => {
    const newPrompt: SavedPrompt = {
      ...prompt,
      id: Date.now().toString(),
      title: `${prompt.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setSavedPrompts(prev => [newPrompt, ...prev]);
  };

  const handleRenamePrompt = (id: string, newTitle: string) => {
    setSavedPrompts(prev => prev.map(p => 
      p.id === id ? { ...p, title: newTitle, updatedAt: new Date() } : p
    ));
    if (currentPromptId === id) {
      setDocumentTitle(newTitle);
    }
  };

  const handleNewPrompt = () => {
    setCurrentPrompt('');
    setDocumentTitle('New Prompt');
    setCurrentPromptId(null);
    setViewedVersionId(null);
    setVersionHistory([]);
  };

  const handleCreateFolder = (name: string, parentId?: string) => {
    const newFolder: PromptFolder = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: parentId || null,
      isExpanded: true
    };
    setFolders(prev => [...prev, newFolder]);
  };

  const handleDeleteFolder = (id: string) => {
    // Move all prompts in this folder to root
    setSavedPrompts(prev => prev.map(p => 
      p.folderId === id ? { ...p, folderId: null, updatedAt: new Date() } : p
    ));
    
    // Move all subfolders to root
    setFolders(prev => prev.map(f => 
      f.parentId === id ? { ...f, parentId: null, updatedAt: new Date() } : f
    ));
    
    // Delete the folder
    setFolders(prev => prev.filter(f => f.id !== id));
  };

  const handleRenameFolder = (id: string, newName: string) => {
    setFolders(prev => prev.map(f => 
      f.id === id ? { ...f, name: newName, updatedAt: new Date() } : f
    ));
  };

  const handleMovePrompt = (promptId: string, folderId: string | null) => {
    setSavedPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, folderId, updatedAt: new Date() } : p
    ));
  };

  const handleMoveFolder = (folderId: string, parentId: string | null) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, parentId, updatedAt: new Date() } : f
    ));
  };

  const handleToggleFolder = (id: string) => {
    setFolders(prev => prev.map(f => 
      f.id === id ? { ...f, isExpanded: !f.isExpanded } : f
    ));
  };

  const handleRestoreVersion = (content: string) => {
    setCurrentPrompt(content);
    setViewedVersionId(null); // Return to current version view
  };

  const handleViewVersion = (versionId: string) => {
    setViewedVersionId(versionId);
  };

  const handleReturnToCurrent = () => {
    setViewedVersionId(null);
  };

  // Variable Management Functions
  const handleCreateVariable = (variableData: Omit<TemplateVariable, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVariable: TemplateVariable = {
      ...variableData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTemplateVariables(prev => [...prev, newVariable]);
  };

  const handleUpdateVariable = (updatedVariable: TemplateVariable) => {
    setTemplateVariables(prev => 
      prev.map(v => v.id === updatedVariable.id ? updatedVariable : v)
    );
  };

  const handleDeleteVariable = (variableId: string) => {
    setTemplateVariables(prev => prev.filter(v => v.id !== variableId));
  };

  const handleCopyPrompt = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(displayedContent);
        toast.success('Prompt copied to clipboard!');
        return;
      }
    } catch (err) {
      console.log('Clipboard API failed, using fallback');
    }

    // Fallback method for browsers without clipboard API or when permissions are denied
    try {
      const textArea = document.createElement('textarea');
      textArea.value = displayedContent;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast.success('Prompt copied to clipboard!');
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy prompt. Please select and copy manually.');
    }
  };

  // Get the content to display in the editor
  const viewedVersion = viewedVersionId ? versionHistory.find(v => v.id === viewedVersionId) : null;
  const baseContent = viewedVersion ? viewedVersion.content : currentPrompt;
  
  // Apply variable substitution to displayed content
  const displayedContent = substituteVariables(baseContent, templateVariables);
  const isViewingHistory = !!viewedVersionId;

  // Left Panel - Templates and Prompt Library
  const leftPanel = (
    <div className={`h-full bg-background ${!isMobile ? 'border-r border-border' : ''}`}>
      {!isMobile && (
        <div className="p-2 sm:p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm sm:text-lg font-medium text-foreground truncate min-w-0">PromptBook</h1>
            <div className="flex gap-1 sm:gap-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 sm:h-9 sm:w-9">
                {theme === 'light' ? <Moon className="h-3 w-3 sm:h-4 sm:w-4" /> : <Sun className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-2 sm:px-4 pt-2 sm:pt-4">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="templates" className="text-xs flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="library" className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">My Prompts</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="templates" className="flex-1 mt-2 overflow-hidden">
            <div className="p-2 sm:p-4 pt-0 h-full overflow-hidden">
              <TemplatePreview onTemplateSelect={handleTemplateInsert} />
            </div>
          </TabsContent>
          
          <TabsContent value="library" className="flex-1 mt-2 overflow-hidden">
            <div className="h-full overflow-hidden">
              <PromptLibrary
                prompts={savedPrompts}
                folders={folders}
                onOpenPrompt={handleOpenPrompt}
                onDeletePrompt={handleDeletePrompt}
                onDuplicatePrompt={handleDuplicatePrompt}
                onRenamePrompt={handleRenamePrompt}
                onCreateFolder={handleCreateFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={handleRenameFolder}
                onMovePrompt={handleMovePrompt}
                onMoveFolder={handleMoveFolder}
                onToggleFolder={handleToggleFolder}
                onNewPrompt={handleNewPrompt}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Center Panel - Editor
  const centerPanel = (
    <div className="flex-1 flex flex-col min-w-0">
      {!isMobile && (
        <div className="p-2 sm:p-4 border-b border-border bg-background/50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isViewingHistory ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 truncate">
                      Viewing v{viewedVersion?.version}
                    </h2>
                    <Badge variant="secondary" className="text-xs shrink-0">Read-only</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{viewedVersion?.comment}</p>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <EditableTitle
                      value={documentTitle}
                      onChange={setDocumentTitle}
                      className="text-xs sm:text-sm text-muted-foreground font-medium"
                      placeholder="Untitled Prompt"
                      size="sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Version {versionHistory[0]?.version || '1.0'}</p>
                </>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2 shrink-0">
              {isViewingHistory ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReturnToCurrent}
                  className="text-xs px-2 h-7 sm:h-8"
                >
                  <span className="hidden sm:inline">Return to Current</span>
                  <span className="sm:hidden">Return</span>
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      const comment = prompt('Version comment:') || 'Manual save';
                      handleSaveVersion(comment);
                    }}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="default" 
                    size="icon"
                    onClick={handleCopyPrompt}
                    className="h-7 w-7 sm:h-8 sm:w-8"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <VisualMarkdownEditor 
        value={isViewingHistory ? displayedContent : baseContent}
        onChange={isViewingHistory ? () => {} : setCurrentPrompt}
        readOnly={isViewingHistory}
        previewContent={isViewingHistory ? undefined : displayedContent}
        variables={templateVariables}
      />
    </div>
  );

  // Right Panel - Version History & Variables
  const rightPanel = (
    <div className="h-full bg-background/30 flex flex-col">
      <div className="p-2 sm:p-4 border-b border-border">
        <h3 className="text-xs sm:text-sm text-muted-foreground truncate">Version History</h3>
      </div>
      <div className="flex-1 overflow-hidden">
        <VersionHistory 
          versions={versionHistory}
          currentVersion={versionHistory[0]?.id}
          viewedVersionId={viewedVersionId}
          onRestoreVersion={handleRestoreVersion}
          onViewVersion={handleViewVersion}
        />
      </div>
      <VariablesPanel
        variables={templateVariables}
        onCreateVariable={handleCreateVariable}
        onUpdateVariable={handleUpdateVariable}
        onDeleteVariable={handleDeleteVariable}
        isCollapsed={variablesCollapsed}
        onToggleCollapsed={() => setVariablesCollapsed(!variablesCollapsed)}
      />
    </div>
  );

  return (
    <div className="h-screen bg-background">
      {isMobile ? (
        <MobileLayout
          leftPanel={leftPanel}
          centerPanel={centerPanel}
          rightPanel={rightPanel}
          theme={theme}
          toggleTheme={toggleTheme}
          isViewingHistory={isViewingHistory}
          viewedVersion={viewedVersion}
          onReturnToCurrent={handleReturnToCurrent}
          onSaveVersion={handleSaveVersion}
        />
      ) : (
        <ResizableLayout
          leftPanel={leftPanel}
          centerPanel={centerPanel}
          rightPanel={rightPanel}
        />
      )}
      
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={(newTheme) => {
          if (newTheme === 'system') {
            // Handle system theme - for now just toggle between light/dark
            toggleTheme();
          } else {
            // This would typically integrate with the theme provider
            toggleTheme();
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toaster />
    </ThemeProvider>
  );
}