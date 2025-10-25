"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { API_KEY_TABLE, type ApiKeySelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const ApiKeyCollection = ({
  project_id,
}: {
  project_id?: string;
} = {}) =>
  createCollection<ApiKeySelect>(
    electricCollectionOptions<ApiKeySelect>({
      id: `${API_KEY_TABLE}|${project_id ?? ""}`,
      shapeOptions: {
        url: `${appBaseURL}/api/collections/api-keys`,
        params: project_id
          ? {
              where: `"project_id"=$1`,
              params: [project_id],
            }
          : {
              where: undefined,
            },
      },
      getKey: (item) => item.id,
    }),
  );
