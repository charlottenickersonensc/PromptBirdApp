import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

interface EditableTitleProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'base' | 'lg';
}

export function EditableTitle({ 
  value, 
  onChange, 
  className, 
  placeholder = "Untitled",
  size = 'base'
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onChange(trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const sizeClasses = {
    sm: 'text-xs h-6',
    base: 'text-sm h-7',
    lg: 'text-base h-8'
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          sizeClasses[size],
          "min-w-0 bg-background border-input",
          className
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={handleStartEdit}
      className={cn(
        "text-left truncate hover:bg-accent/50 rounded px-1 -mx-1 transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        size === 'sm' && 'text-xs',
        size === 'base' && 'text-sm',
        size === 'lg' && 'text-base',
        className
      )}
      title="Click to edit"
    >
      {value || placeholder}
    </button>
  );
}