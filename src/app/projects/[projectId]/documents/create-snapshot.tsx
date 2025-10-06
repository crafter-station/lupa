"use client";

import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection";
import { createOptimisticAction } from "@tanstack/react-db";
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
import type { SnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

export function CreateSnapshot({ documentId }: { documentId: string }) {
  const [open, setOpen] = React.useState(false);

  const { SnapshotCollection } = useCollections();

  const createSnapshot = createOptimisticAction<SnapshotSelect>({
    onMutate: (snapshot) => {
      SnapshotCollection.insert({
        ...snapshot,
      });
    },
    mutationFn: async (snapshot) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/snapshots`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(snapshot),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to insert snapshot: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      await (SnapshotCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );

      return {
        txid: data.txid,
      };
    },
  });

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      const snapshotId = generateId();

      createSnapshot({
        id: snapshotId,
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
    [documentId, createSnapshot],
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
          <Input id="url" type="text" placeholder="URL" name="url" required />
          <Button type="submit">Create Snapshot</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
