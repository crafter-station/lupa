"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { Check, Folder, Pencil, X } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import type { DocumentSelect } from "@/db";
import { DocumentCollection } from "@/db/collections";
import { cn } from "@/lib/utils";
import { FolderPathSelector } from "./folder-path-selector";

interface InlineEditableFolderProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  projectId: string;
  className?: string;
}

export function InlineEditableFolder({
  value,
  onSave,
  projectId,
  className,
}: InlineEditableFolderProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isSaving, setIsSaving] = React.useState(false);

  const { data: documents = [] } = useLiveQuery(
    (q) =>
      isEditing
        ? q
            .from({ document: DocumentCollection })
            .select(({ document }) => ({ ...document }))
            .where(({ document }) => eq(document.project_id, projectId))
        : null,
    [isEditing, projectId],
  );

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
        "flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/50 group",
        className,
      )}
    >
      <Folder className="size-4" />
      <span>{value === "/" ? "Root" : value}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}
