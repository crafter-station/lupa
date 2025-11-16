"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { InlineEditableFolder } from "@/components/inline-editable-folder";
import { Label } from "@/components/ui/label";

import type { DocumentSelect } from "@/db";

type DocumentFolderProps = {
  documentId: string;
  projectId: string;
  folder: string;
  documentName: string;
  documents: DocumentSelect[];
};

export function DocumentFolder({
  documentId,
  projectId,
  folder,
  documentName,
  documents,
}: DocumentFolderProps) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (newFolder: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          folder: newFolder,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: "Failed to update document",
        }));
        throw new Error(error.message || "Failed to update document");
      }

      return response.json();
    },
    onSuccess: (_data, newFolder) => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents${newFolder}${documentName}.md`;
      router.push(newUrl);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  const handleUpdateFolder = React.useCallback(
    (newFolder: string) => {
      mutate(newFolder);
    },
    [mutate],
  );

  return (
    <div>
      <Label className="text-xs text-muted-foreground">Folder</Label>
      <div className="relative group">
        <InlineEditableFolder
          value={folder}
          documents={documents}
          onSave={handleUpdateFolder}
        />
        {isPending && (
          <LoaderIcon className="absolute right-2 top-2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && (
        <p className="text-xs text-destructive mt-1">{error.message}</p>
      )}
    </div>
  );
}
