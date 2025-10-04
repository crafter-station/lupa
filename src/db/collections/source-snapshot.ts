"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { SOURCE_SNAPSHOT_TABLE, type SourceSnapshotSelect } from "@/db/schema";

export const SourceSnapshotCollection = ({
  bucket_id,
  source_id,
  snapshot_id,
}: {
  bucket_id?: string;
  source_id?: string;
  snapshot_id?: string;
} = {}) =>
  createCollection<SourceSnapshotSelect>(
    electricCollectionOptions<SourceSnapshotSelect>({
      id: SOURCE_SNAPSHOT_TABLE,
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/source-snapshots`,
        params: {
          where: snapshot_id
            ? `"id"='${snapshot_id}'`
            : source_id
              ? `"source_id"='${source_id}'`
              : bucket_id
                ? `"bucket_id"='${bucket_id}'`
                : undefined,
        },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/source-snapshots`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to insert source snapshot: ${response.statusText}`,
          );
        }

        const data = (await response.json()) as {
          success: boolean;
          txid: number;
        };

        return {
          txid: data.txid,
        };
      },
    }),
  );
