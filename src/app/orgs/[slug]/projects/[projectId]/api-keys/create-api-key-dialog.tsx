"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKey } from "./client";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  projectId,
}: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const { mutate, isPending, data } = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create API key");
      }

      const data = await response.json();
      return data as {
        id: string;
        name: string;
        api_key: string;
        key_preview: string;
        created_at: string;
        last_used_at: null;
      };
    },
    // When mutate is called:
    onMutate: async (name) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["api-keys", projectId] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<ApiKey[]>([
        "api-keys",
        projectId,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData<ApiKey[]>(["api-keys", projectId], (old) =>
        old
          ? [
              ...old,
              {
                id: "123",
                name,
                key_preview: "",
                created_at: new Date().toISOString(),
                last_used_at: null,
              },
            ]
          : [
              {
                id: "123",
                name,
                key_preview: "",
                created_at: new Date().toISOString(),
                last_used_at: null,
              },
            ],
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (_err, _name, context) => {
      queryClient.setQueryData<ApiKey[]>(
        ["api-keys", projectId],
        context?.previousTodos,
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onSuccess: (data) => {
      // Optimistically update to the new value
      queryClient.setQueryData<ApiKey[]>(["api-keys", projectId], (old) =>
        old
          ? [
              ...old.slice(0, old.length - 1),
              {
                id: data.id,
                name: data.name,
                key_preview: data.key_preview,
                created_at: data.created_at,
                last_used_at: null,
              },
            ]
          : [
              {
                id: data.id,
                name: data.name,
                key_preview: data.key_preview,
                created_at: data.created_at,
                last_used_at: null,
              },
            ],
      );

      navigator.clipboard.writeText(data.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const handleClose = () => {
    setName("");
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!data?.api_key ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key to authenticate requests to your project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  placeholder="Production Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isPending) {
                      mutate(name);
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => mutate(name)}
                disabled={!name.trim() || isPending}
              >
                {isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Make sure to copy your API key now. You won&apos;t be able to
                see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Key Name</Label>
                <div className="text-sm font-medium">{data.name}</div>
              </div>
              <div className="grid gap-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={data?.api_key}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(data.api_key);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
