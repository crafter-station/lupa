"use client";

import { Check, Folder, Pencil, X } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import type { DocumentSelect } from "@/db";
import { cn } from "@/lib/utils";
import { FolderPathSelector } from "../elements/folder-path-selector";
import type { ContentProps } from "./props";

export function InlineEditableFolderContent({
  value,
  documents,
  onSave,
  className,
}: ContentProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
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

  if (isEditing) {
    return (
      <div className="space-y-2">
        <FolderPathSelector
          documents={documents as DocumentSelect[]}
          initialFolder={editValue}
          onChange={setEditValue}
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
        "flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/50 group text-sm",
        className,
      )}
    >
      <Folder className="size-4" />
      <span>{value === "/" ? "Root" : value}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}
