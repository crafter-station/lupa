"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { SNAPSHOT_TABLE, type SnapshotSelect } from "@/db/schema";

export const SnapshotCollection = ({
  document_id,
  snapshot_id,
}: {
  document_id?: string;
  snapshot_id?: string;
} = {}) =>
  createCollection<SnapshotSelect>(
    electricCollectionOptions<SnapshotSelect>({
      id: SNAPSHOT_TABLE + (document_id ?? "") + (snapshot_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/snapshots`,
        params: {
          where: snapshot_id
            ? `"id"='${snapshot_id}'`
            : document_id
              ? `"document_id"='${document_id}'`
              : undefined,
        },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/snapshots`,
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
            `Failed to insert document snapshot: ${response.statusText}`,
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
