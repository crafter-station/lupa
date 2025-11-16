"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { InlineEditableField } from "@/components/elements/inline-editable-field";
import { Label } from "@/components/ui/label";

type DocumentNameProps = {
  documentId: string;
  projectId: string;
  name: string;
  folder: string;
};

export function DocumentName({
  documentId,
  projectId,
  name,
  folder,
}: DocumentNameProps) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          name: newName,
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
    onSuccess: (_data, newName) => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents${folder}${newName}.md`;
      router.push(newUrl);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  const handleUpdateName = React.useCallback(
    (newName: string) => {
      mutate(newName);
    },
    [mutate],
  );

  const validateName = React.useCallback((_name: string) => {
    return {
      valid: true,
      message: undefined,
    };
  }, []);

  return (
    <div>
      <Label className="text-xs text-muted-foreground">Name</Label>
      <div className="relative group">
        <InlineEditableField
          value={name}
          onSave={handleUpdateName}
          onValidate={validateName}
          className="text-lg font-semibold"
          required
          sanitizeName
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
