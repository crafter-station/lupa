"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { InlineEditableTextarea } from "@/components/elements/inline-editable-textarea";
import { Label } from "@/components/ui/label";

type DocumentDescriptionProps = {
  documentId: string;
  projectId: string;
  description: string | null;
};

export function DocumentDescription({
  documentId,
  projectId,
  description,
}: DocumentDescriptionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (newDescription: string | null) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          description: newDescription,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  const handleUpdateDescription = React.useCallback(
    (newDescription: string | null) => {
      mutate(newDescription);
    },
    [mutate],
  );

  return (
    <div>
      <Label className="text-xs text-muted-foreground">Description</Label>
      <div className="relative group">
        <InlineEditableTextarea
          value={description}
          onSave={handleUpdateDescription}
          className="text-sm"
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
