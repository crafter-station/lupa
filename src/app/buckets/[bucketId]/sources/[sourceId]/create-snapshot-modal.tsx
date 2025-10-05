"use client";

import React from "react";
import { z } from "zod";
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
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

const urlSchema = z.url("Please enter a valid URL");

export function CreateSnapshotModal({
  sourceId,
  defaultUrl,
  open,
  onOpenChange,
}: {
  sourceId: string;
  defaultUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = React.useState(defaultUrl || "");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const { SourceSnapshotCollection } = useCollections();

  React.useEffect(() => {
    if (open && defaultUrl) {
      setUrl(defaultUrl);
    }
  }, [open, defaultUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);

    const validation = urlSchema.safeParse(url);
    if (!validation.success) {
      setUrlError(validation.error.issues[0].message);
      return;
    }

    SourceSnapshotCollection.insert({
      id: generateId(),
      source_id: sourceId,
      url: validation.data,
      status: "queued",
      type: "website",
      markdown_url: null,
      chunks_count: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    onOpenChange(false);
    setUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Snapshot</DialogTitle>
          <DialogDescription>
            Enter the URL you want to create a snapshot from.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError(null);
                }}
                className={urlError ? "border-red-500" : ""}
              />
              {urlError && <p className="text-sm text-red-500">{urlError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Snapshot</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
