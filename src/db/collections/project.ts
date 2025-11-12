"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { PROJECT_TABLE, type ProjectSelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const ProjectCollection = createCollection<ProjectSelect>(
  electricCollectionOptions<ProjectSelect>({
    id: PROJECT_TABLE,
    shapeOptions: {
      url: `${appBaseURL}/api/collections/projects`,
    },
    getKey: (item) => item.id,
    onInsert: async (item) => {
      const response = await fetch(`${appBaseURL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to insert project: ${response.statusText}`);
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
