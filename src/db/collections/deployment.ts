"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import { toast } from "sonner";
import { DEPLOYMENT_TABLE, type DeploymentSelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const DeploymentCollection = createCollection<DeploymentSelect>(
  electricCollectionOptions<DeploymentSelect>({
    id: DEPLOYMENT_TABLE,
    shapeOptions: {
      url: `${appBaseURL}/api/collections/deployments`,
    },
    startSync: true,
    getKey: (item) => item.id,
    onInsert: async (item) => {
      const response = await fetch(`${appBaseURL}/api/deployments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deploymentId: item.transaction.mutations[0].changes.id,
          projectId: item.transaction.metadata.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to insert deployment: ${response.statusText}`);
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
      const deploymentId = item.transaction.mutations[0].key;
      const changes = item.transaction.mutations[0].changes;

      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...changes,
          projectId: item.transaction.mutations[0].original.project_id,
        }),
      });

      if (!response.ok) {
        if ("name" in changes) {
          toast.error("Failed to update deployment name");
        } else if ("environment" in changes) {
          toast.error("Failed to update deployment environment");
        }
      }

      const data = (await response.json()) as {
        txid: number;
      };

      return {
        txid: data.txid,
      };
    },
  }),
);
