"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { VECTOR_INDEX_TABLE, type VectorIndexSelect } from "@/db/schema";

export const VectorIndexCollection = createCollection<VectorIndexSelect>(
  electricCollectionOptions<VectorIndexSelect>({
    id: VECTOR_INDEX_TABLE,
    shapeOptions: {
      url: `${process.env.NEXT_PUBLIC_URL}/api/collections/vector-indexes`,
    },
    getKey: (item) => item.id,
    onInsert: async (item) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/vector-indexes`,
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
          `Failed to insert vector index: ${response.statusText}`,
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
