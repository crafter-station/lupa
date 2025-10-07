"use client";

import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";

import { FolderPathSelector } from "@/components/elements/folder-path-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentSelect, SnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";

export function CreateDocument() {
  const { projectId } = useParams<{ projectId: string }>();
  const [open, setOpen] = React.useState(false);

  const { folder: contextFolder } = useFolderDocumentVersion();
  const [selectedFolder, setSelectedFolder] = React.useState<string>(
    contextFolder ?? "/",
  );

  const { DocumentCollection, SnapshotCollection } = useCollections();

  const { data: allDocuments = [] } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  React.useEffect(() => {
    if (open) {
      setSelectedFolder(contextFolder ?? "/");
    }
  }, [open, contextFolder]);

  const createDocument = createOptimisticAction<
    DocumentSelect & {
      snapshot: SnapshotSelect;
    }
  >({
    onMutate: (document) => {
      DocumentCollection.insert({
        id: document.id,
        project_id: document.project_id,
        folder: document.folder,
        name: document.name,
        description: document.description,
        created_at: document.created_at,
        updated_at: document.updated_at,
      });
      SnapshotCollection.insert({
        ...document.snapshot,
      });
    },
    mutationFn: async (document) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(document),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to insert document: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      await (DocumentCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );
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

      const documentId = generateId();
      const snapshotId = generateId();

      createDocument({
        id: documentId,
        project_id: projectId,
        folder: selectedFolder || "/",
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        snapshot: {
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
        },
      });

      setOpen(false);
    },
    [projectId, createDocument, selectedFolder],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Document</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <FolderPathSelector
            documents={allDocuments}
            initialFolder={selectedFolder}
            onChange={setSelectedFolder}
          />
          <Input id="name" type="text" placeholder="Name" name="name" />
          <Input id="url" type="text" placeholder="URL" name="url" />
          <Textarea
            id="description"
            placeholder="Document Description"
            name="description"
          />
          <Button type="submit">Create Document</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
