"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { PROJECT_TABLE, type ProjectSelect } from "@/db/schema";

export const ProjectCollection = ({
  project_id,
}: {
  project_id?: string;
} = {}) =>
  createCollection<ProjectSelect>(
    electricCollectionOptions<ProjectSelect>({
      id: PROJECT_TABLE + (project_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/projects`,
        params: project_id
          ? {
              where: `"id"=$1`,
              params: [project_id],
            }
          : {
              where: undefined,
            },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/projects`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...item.transaction.mutations[0].changes }),
          },
        );

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
