"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { BUCKET_TABLE, type BucketSelect } from "@/db/schema";

export const BucketCollection = ({ bucket_id }: { bucket_id?: string } = {}) =>
  createCollection<BucketSelect>(
    electricCollectionOptions<BucketSelect>({
      id: BUCKET_TABLE + (bucket_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/buckets`,
        params: {
          where: bucket_id ? `"id"='${bucket_id}'` : undefined,
        },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/buckets`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to insert bucket: ${response.statusText}`);
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
