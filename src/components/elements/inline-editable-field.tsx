"use client";

import { Check, Pencil, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InlineEditableFieldProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  required?: boolean;
  sanitizeName?: boolean;
}

export function InlineEditableField({
  value,
  onSave,
  className,
  placeholder = "Click to edit",
  required = false,
  sanitizeName = false,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sanitizeValue = (val: string) => {
    if (!sanitizeName) return val;
    return val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
  };

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (required && !editValue.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => {
            const newValue = sanitizeValue(e.target.value);
            setEditValue(newValue);
          }}
          onKeyDown={handleKeyDown}
          className={cn("h-8", className)}
          disabled={isSaving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleSave}
          disabled={isSaving || (required && !editValue.trim())}
        >
          <Check className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/50 group",
        className,
      )}
    >
      <span>{value || placeholder}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}
