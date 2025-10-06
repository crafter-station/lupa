"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { DEPLOYMENT_TABLE, type DeploymentSelect } from "@/db/schema";

export const DeploymentCollection = ({
  project_id,
  deployment_id,
}: {
  project_id?: string;
  deployment_id?: string;
} = {}) =>
  createCollection<DeploymentSelect>(
    electricCollectionOptions<DeploymentSelect>({
      id: DEPLOYMENT_TABLE + (project_id ?? "") + (deployment_id ?? ""),
      shapeOptions: {
        url: `${process.env.NEXT_PUBLIC_URL}/api/collections/deployments`,
        params: deployment_id
          ? {
              where: `"id"=$1`,
              params: [deployment_id],
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
