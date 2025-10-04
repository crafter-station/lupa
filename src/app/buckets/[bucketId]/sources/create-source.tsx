"use client";
import { createOptimisticAction } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SourceSelect, SourceSnapshotSelect } from "@/db";
import { SourceCollection, SourceSnapshotCollection } from "@/db/collections";
import { generateId } from "@/lib/generate-id";

export function CreateSource() {
  const { bucketId } = useParams<{ bucketId: string }>();

  const createSource = createOptimisticAction<
    SourceSelect & {
      snapshot: SourceSnapshotSelect;
    }
  >({
    onMutate: (source) => {
      SourceCollection().insert({
        id: source.id,
        bucket_id: source.bucket_id,
        name: source.name,
        description: source.description,
        created_at: source.created_at,
        updated_at: source.updated_at,
      });
      SourceSnapshotCollection().insert({
        ...source.snapshot,
      });
    },
    mutationFn: async (source) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/sources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(source),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to insert source: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      return {
        txid: data.txid,
      };
    },
  });

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      const sourceId = generateId();
      const snapshotId = generateId();

      createSource({
        id: sourceId,
        bucket_id: bucketId,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        snapshot: {
          id: snapshotId,
          source_id: sourceId,
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
    },
    [bucketId, createSource],
  );

  return (
    <form onSubmit={handleSubmit}>
      <Input id="name" type="text" placeholder="Name" name="name" />
      <Input id="url" type="text" placeholder="URL" name="url" />
      <Textarea
        id="description"
        placeholder="Source Description"
        name="description"
      />
      <Button type="submit">Create Source</Button>
    </form>
  );
}
