"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { SOURCE_TABLE, type SourceSelect } from "@/db/schema";

export const SourceCollection = createCollection<SourceSelect>(
  electricCollectionOptions<SourceSelect>({
    id: SOURCE_TABLE,
    shapeOptions: {
      url: `${process.env.NEXT_PUBLIC_URL}/api/collections/sources`,
    },
    getKey: (item) => item.id,
    onInsert: async (item) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/sources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
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
  }),
);
