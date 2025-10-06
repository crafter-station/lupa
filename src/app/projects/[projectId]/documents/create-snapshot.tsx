"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

export function CreateSnapshot({ documentId }: { documentId: string }) {
  const [open, setOpen] = React.useState(false);

  const { SnapshotCollection } = useCollections();

  const { data: snapshots } = useLiveQuery((q) =>
    q
      .from({ snapshot: SnapshotCollection })
      .select(({ snapshot }) => ({ ...snapshot }))
      .where(({ snapshot }) => eq(snapshot.document_id, documentId)),
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      SnapshotCollection.insert({
        id: generateId(),
        document_id: documentId,
        markdown_url: null,
        chunks_count: null,
        type: "website",
        status: "queued",
        url: formData.get("url") as string,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setOpen(false);
    },
    [documentId, SnapshotCollection],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Snapshot
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Snapshot</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="url"
            type="text"
            placeholder="URL"
            name="url"
            required
            defaultValue={
              snapshots.toSorted(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              )[0]?.url
            }
          />
          <Button type="submit">Create Snapshot</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
