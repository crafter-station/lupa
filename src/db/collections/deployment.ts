"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { DEPLOYMENT_TABLE, type DeploymentSelect } from "@/db/schema";
import { appBaseURL, getAPIBaseURL } from "@/lib/utils";

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
        url: `${appBaseURL}/api/collections/deployments`,
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
        if (!project_id) throw new Error("Project ID is required");

        const response = await fetch(
          `${getAPIBaseURL(project_id)}/api/deployments`,
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
