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
      id: `${DOCUMENT_TABLE}|${project_id ?? ""}|${document_id ?? ""}`,
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/documents`,
        params: document_id
          ? {
              where: `"id"=$1`,
              params: [document_id],
            }
          : project_id
            ? {
                where: `"project_id"=$1`,
                params: [project_id],
              }
            : {
                where: undefined,
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
      onUpdate: async (item) => {
        const documentId = item.transaction.mutations[0].key;
        const changes = item.transaction.mutations[0].changes;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/documents/${documentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(changes),
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
