"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { SNAPSHOT_TABLE, type SnapshotSelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const SnapshotCollection = ({
  document_id,
  snapshot_id,
}: {
  document_id?: string;
  snapshot_id?: string;
} = {}) =>
  createCollection<SnapshotSelect>(
    electricCollectionOptions<SnapshotSelect>({
      id: `${SNAPSHOT_TABLE}|${document_id ?? ""}|${snapshot_id ?? ""}`,
      shapeOptions: {
        url: `${appBaseURL}/api/collections/snapshots`,
        params: snapshot_id
          ? {
              where: `"id"=$1`,
              params: [snapshot_id],
            }
          : document_id
            ? {
                where: `"document_id"=$1`,
                params: [document_id],
              }
            : {
                where: undefined,
              },
      },
      getKey: (item) => item.id,
    }),
  );
