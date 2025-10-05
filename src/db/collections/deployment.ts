"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { DEPLOYMENT_TABLE, type DeploymentSelect } from "@/db/schema";

export const DeploymentCollection = ({
  bucket_id,
  deployment_id,
}: {
  bucket_id?: string;
  deployment_id?: string;
} = {}) =>
  createCollection<DeploymentSelect>(
    electricCollectionOptions<DeploymentSelect>({
      id: DEPLOYMENT_TABLE + (bucket_id ?? "") + (deployment_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/deployments`,
        params: {
          where: deployment_id
            ? `"id"='${deployment_id}'`
            : bucket_id
              ? `"bucket_id"='${bucket_id}'`
              : undefined,
        },
      },
      getKey: (item) => item.id,
      onInsert: async (item) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/collections/deployments`,
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
            `Failed to insert deployment: ${response.statusText}`,
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
