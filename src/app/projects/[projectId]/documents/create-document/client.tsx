"use client";

import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { useParams, useRouter } from "next/navigation";
import React from "react";

import { FolderPathSelector } from "@/components/elements/folder-path-selector";
import { MetadataSchemaEditor } from "@/components/elements/metadata-schema-editor";
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
import type {
  DocumentSelect,
  MetadataSchemaConfig,
  SnapshotSelect,
} from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";

export function CreateDocument() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const { folder: contextFolder } = useFolderDocumentVersion();
  const [selectedFolder, setSelectedFolder] = React.useState<string>(
    contextFolder ?? "/",
  );
  const [metadataSchema, setMetadataSchema] =
    React.useState<MetadataSchemaConfig | null>(null);

  const { DocumentCollection, SnapshotCollection } = useCollections();

  const { data: allDocuments = [] } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.project_id, projectId)),
    [],
  );

  React.useEffect(() => {
    if (open) {
      setSelectedFolder(contextFolder ?? "/");
      setMetadataSchema(null);
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
        metadata_schema: document.metadata_schema,
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
      const folder = selectedFolder || "/";

      createDocument({
        id: documentId,
        project_id: projectId,
        folder,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        metadata_schema: metadataSchema,
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
          extracted_metadata: null,
          has_changed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      router.push(
        `/projects/${projectId}/documents/${folder}doc:${documentId}?newSnapshot=true`,
      );
      setOpen(false);
    },
    [projectId, createDocument, selectedFolder, metadataSchema, router],
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
          <Input
            id="name"
            type="text"
            placeholder="Name"
            name="name"
            required
          />
          <Input id="url" type="text" placeholder="URL" name="url" required />
          <Textarea
            id="description"
            placeholder="Document Description"
            name="description"
          />
          <MetadataSchemaEditor
            value={metadataSchema}
            onChange={setMetadataSchema}
          />
          <Button type="submit">Create Document</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
