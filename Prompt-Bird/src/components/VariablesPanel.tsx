import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Variable, 
  Copy,
  MoreHorizontal,
  Code2,
  Type,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

export interface TemplateVariable {
  id: string;
  name: string;
  value: string;
  type: 'string' | 'number' | 'code';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VariablesPanelProps {
  variables: TemplateVariable[];
  onUpdateVariable: (variable: TemplateVariable) => void;
  onDeleteVariable: (id: string) => void;
  onCreateVariable: (variable: Omit<TemplateVariable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function VariablesPanel({ 
  variables, 
  onUpdateVariable, 
  onDeleteVariable, 
  onCreateVariable,
  isCollapsed,
  onToggleCollapsed
}: VariablesPanelProps) {
  const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newVariable, setNewVariable] = useState<{
    name: string;
    value: string;
    type: TemplateVariable['type'];
    description: string;
  }>({
    name: '',
    value: '',
    type: 'string',
    description: ''
  });

  const handleCreateVariable = () => {
    if (!newVariable.name.trim()) {
      toast.error('Variable name is required');
      return;
    }

    // Check for duplicate names
    if (variables.some(v => v.name.toLowerCase() === newVariable.name.toLowerCase())) {
      toast.error('Variable with this name already exists');
      return;
    }

    onCreateVariable({
      name: newVariable.name.trim(),
      value: newVariable.value,
      type: newVariable.type,
      description: newVariable.description
    });

    setNewVariable({
      name: '',
      value: '',
      type: 'string',
      description: ''
    });
    setIsCreateDialogOpen(false);
    toast.success('Variable created successfully');
  };

  const handleUpdateVariable = () => {
    if (!editingVariable) return;

    onUpdateVariable({
      ...editingVariable,
      updatedAt: new Date()
    });
    setEditingVariable(null);
    toast.success('Variable updated successfully');
  };

  const handleCopyVariableSyntax = (name: string) => {
    const syntax = `{{${name}}}`;
    navigator.clipboard.writeText(syntax).then(() => {
      toast.success('Variable syntax copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code':
        return <Code2 className="h-3 w-3" />;
      case 'number':
        return <Hash className="h-3 w-3" />;
      default:
        return <Type className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'code':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'number':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="border-t border-border">
      <Collapsible open={!isCollapsed} onOpenChange={onToggleCollapsed}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-2 sm:p-4 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4" />
              <span className="text-xs sm:text-sm text-muted-foreground">Variables</span>
              <Badge variant="secondary" className="text-xs">
                {variables.length}
              </Badge>
            </div>
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-0">
          <div className="p-2 sm:p-4 pt-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                Use {"{{VariableName}}"} in templates
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Variable</DialogTitle>
                    <DialogDescription>
                      Create a new template variable that can be used across all your prompts
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="var-name">Variable Name</Label>
                      <Input
                        id="var-name"
                        placeholder="e.g., ProjectName, Description"
                        value={newVariable.name}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Will be used as: {newVariable.name ? `{{${newVariable.name}}}` : "{{VariableName}}"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="var-type">Type</Label>
                      <select
                        id="var-type"
                        value={newVariable.type}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, type: e.target.value as TemplateVariable['type'] }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="string">Text</option>
                        <option value="number">Number</option>
                        <option value="code">Code</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="var-value">Value</Label>
                      {newVariable.type === 'code' ? (
                        <Textarea
                          id="var-value"
                          placeholder="Enter code value..."
                          value={newVariable.value}
                          onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                          className="font-mono text-sm"
                          rows={3}
                        />
                      ) : (
                        <Input
                          id="var-value"
                          placeholder="Enter variable value..."
                          value={newVariable.value}
                          onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                          type={newVariable.type === 'number' ? 'number' : 'text'}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="var-desc">Description (optional)</Label>
                      <Input
                        id="var-desc"
                        placeholder="Brief description of this variable"
                        value={newVariable.description}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleCreateVariable} className="flex-1">
                        Create Variable
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {variables.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <Variable className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">No variables defined</p>
                  <p className="text-xs text-muted-foreground">
                    Create variables to reuse values across templates
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {variables.map((variable) => (
                  <Card key={variable.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {variable.name}
                          </code>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs h-5 ${getTypeColor(variable.type)}`}
                          >
                            {getTypeIcon(variable.type)}
                            <span className="ml-1">{variable.type}</span>
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          {variable.type === 'code' ? (
                            <pre className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                              {variable.value || '<empty>'}
                            </pre>
                          ) : (
                            <p className="break-words">
                              {variable.value || '<empty>'}
                            </p>
                          )}
                        </div>
                        
                        {variable.description && (
                          <p className="text-xs text-muted-foreground italic">
                            {variable.description}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyVariableSyntax(variable.name)}>
                            <Copy className="h-3 w-3 mr-2" />
                            Copy {`{{${variable.name}}}`}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingVariable(variable)}>
                            <Edit2 className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteVariable(variable.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Variable Dialog */}
      {editingVariable && (
        <Dialog open={!!editingVariable} onOpenChange={() => setEditingVariable(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Variable</DialogTitle>
              <DialogDescription>
                Update the variable value and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Variable Name</Label>
                <Input
                  value={editingVariable.name}
                  onChange={(e) => setEditingVariable(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Variable name"
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={editingVariable.type}
                  onChange={(e) => setEditingVariable(prev => prev ? { ...prev, type: e.target.value as TemplateVariable['type'] } : null)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="code">Code</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Value</Label>
                {editingVariable.type === 'code' ? (
                  <Textarea
                    value={editingVariable.value}
                    onChange={(e) => setEditingVariable(prev => prev ? { ...prev, value: e.target.value } : null)}
                    className="font-mono text-sm"
                    rows={4}
                  />
                ) : (
                  <Input
                    value={editingVariable.value}
                    onChange={(e) => setEditingVariable(prev => prev ? { ...prev, value: e.target.value } : null)}
                    type={editingVariable.type === 'number' ? 'number' : 'text'}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingVariable.description || ''}
                  onChange={(e) => setEditingVariable(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Brief description"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateVariable} className="flex-1">
                  Update Variable
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingVariable(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}