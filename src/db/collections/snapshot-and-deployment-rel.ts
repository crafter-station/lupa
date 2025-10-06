"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import {
  SNAPSHOT_AND_DEPLOYMENT_REL_TABLE,
  type SnapshotDeploymentRelSelect,
} from "@/db/schema";

export const SnapshotDeploymentRelCollection =
  createCollection<SnapshotDeploymentRelSelect>(
    electricCollectionOptions<SnapshotDeploymentRelSelect>({
      id: SNAPSHOT_AND_DEPLOYMENT_REL_TABLE,
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/snapshot-and-deployment-rel`,
      },
      getKey: (item) => `${item.snapshot_id}-${item.deployment_id}`,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/snapshot-and-deployment-rel`,
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
            `Failed to insert document snapshot deployment relation: ${response.statusText}`,
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
