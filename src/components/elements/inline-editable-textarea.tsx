"use client";

import { Check, Pencil, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface InlineEditableTextareaProps {
  value: string | null;
  onSave: (value: string | null) => void | Promise<void>;
  className?: string;
  placeholder?: string;
}

export function InlineEditableTextarea({
  value,
  onSave,
  className,
  placeholder = "Click to add description",
}: InlineEditableTextareaProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editValue.trim() || null);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setEditValue(value || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn("min-h-20", className)}
          disabled={isSaving}
          placeholder={placeholder}
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleSave}
            disabled={isSaving}
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
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex items-start gap-2 rounded px-2 py-1 text-left hover:bg-muted/50 group w-full",
        !value && "text-muted-foreground",
        className,
      )}
    >
      <span className="flex-1">{value || placeholder}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity mt-1" />
    </button>
  );
}
