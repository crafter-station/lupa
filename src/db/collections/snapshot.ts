"use client";

import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";

import { SNAPSHOT_TABLE, type SnapshotSelect } from "@/db/schema";
import { appBaseURL } from "@/lib/utils";

export const SnapshotCollection = createCollection<SnapshotSelect>(
  electricCollectionOptions<SnapshotSelect>({
    id: SNAPSHOT_TABLE,
    shapeOptions: {
      url: `${appBaseURL}/api/collections/snapshots`,
    },
    getKey: (item) => item.id,
  }),
);
