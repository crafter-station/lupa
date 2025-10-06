"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { DOCUMENT_TABLE, type DocumentSelect } from "@/db/schema";

export const DocumentCollection = ({
  project_id,
  document_id,
}: {
  project_id?: string;
  document_id?: string;
} = {}) =>
  createCollection<DocumentSelect>(
    electricCollectionOptions<DocumentSelect>({
      id: DOCUMENT_TABLE + (project_id ?? "") + (document_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/documents`,
        params: {
          where: document_id
            ? `"id"='${document_id}'`
            : project_id
              ? `"project_id"='${project_id}'`
              : undefined,
        },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/documents`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to insert document: ${response.statusText}`);
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
