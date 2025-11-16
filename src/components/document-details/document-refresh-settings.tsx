"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

import { InlineEditableRefreshSettings } from "@/components/elements/inline-editable-refresh-settings";
import { Label } from "@/components/ui/label";

import type { RefreshFrequency } from "@/db";

type DocumentRefreshSettingsProps = {
  documentId: string;
  projectId: string;
  refreshFrequency: RefreshFrequency | null;
};

export function DocumentRefreshSettings({
  documentId,
  projectId,
  refreshFrequency,
}: DocumentRefreshSettingsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (frequency: RefreshFrequency | null) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          refresh_frequency: frequency,
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

  const handleUpdateRefreshSettings = React.useCallback(
    (_enabled: boolean, frequency: RefreshFrequency | null) => {
      mutate(frequency);
    },
    [mutate],
  );

  return (
    <div>
      <Label className="text-xs text-muted-foreground">Refresh Schedule</Label>
      <div className="relative group">
        <InlineEditableRefreshSettings
          refreshFrequency={refreshFrequency}
          onSave={handleUpdateRefreshSettings}
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
