"use client";

import { useParams, useRouter } from "next/navigation";
import React from "react";

import { InlineEditableField } from "@/components/elements/inline-editable-field";
import { InlineEditableRefreshSettings } from "@/components/elements/inline-editable-refresh-settings";
import { InlineEditableTextarea } from "@/components/elements/inline-editable-textarea";
import { InlineEditableFolder } from "@/components/inline-editable-folder";
import { Label } from "@/components/ui/label";

import type { RefreshFrequency } from "@/db";
import { DocumentCollection } from "@/db/collections";
import type { ContentProps } from "./props";

export function DocumentDetailsContent({ projectId, document }: ContentProps) {
  const router = useRouter();
  const { slug } = useParams<{
    slug: string;
  }>();

  const handleUpdateName = React.useCallback(
    (name: string) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.name = name;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const handleUpdateDescription = React.useCallback(
    (description: string | null) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.description = description;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const handleUpdateFolder = React.useCallback(
    (newFolder: string) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.folder = newFolder;
        doc.updated_at = new Date().toISOString();
      });
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents${newFolder}${document.name}.md`;
      router.push(newUrl);
    },
    [router, projectId, document, slug],
  );

  const handleUpdateRefreshSettings = React.useCallback(
    (_enabled: boolean, frequency: RefreshFrequency | null) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.refresh_frequency = frequency;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const validateName = React.useCallback(
    (_name: string) => {
      if (!document)
        return {
          valid: false,
          message: "Document not found",
        };

      return {
        valid: true,
        message: undefined,
      };
    },
    [document],
  );

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p className="text-sm">Select a document to view details</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Name</Label>
          <InlineEditableField
            value={document.name}
            onSave={handleUpdateName}
            onValidate={validateName}
            className="text-lg font-semibold"
            required
            sanitizeName
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <InlineEditableTextarea
            value={document.description}
            onSave={handleUpdateDescription}
            className="text-sm"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Folder</Label>
          <InlineEditableFolder
            value={document.folder}
            projectId={projectId}
            onSave={handleUpdateFolder}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">
            Refresh Schedule
          </Label>
          <InlineEditableRefreshSettings
            refreshFrequency={document.refresh_frequency}
            onSave={handleUpdateRefreshSettings}
            className="text-sm"
          />
        </div>

        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Updated</Label>
          <div className="text-sm">
            {new Date(document.updated_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
