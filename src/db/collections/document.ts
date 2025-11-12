"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { DOCUMENT_TABLE, type DocumentSelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const DocumentCollection = createCollection<DocumentSelect>(
  electricCollectionOptions<DocumentSelect>({
    id: DOCUMENT_TABLE,
    shapeOptions: {
      url: `${appBaseURL}/api/collections/documents`,
    },
    getKey: (item) => item.id,
    onUpdate: async (item) => {
      const documentId = item.transaction.mutations[0].key;
      const changes = item.transaction.mutations[0].changes;
      const original = item.transaction.mutations[0].original;

      const response = await fetch(
        `${appBaseURL}/api/documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...changes,
            project_id: original.project_id,
            updated_at: undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
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
