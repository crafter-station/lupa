import type { Collection } from "@tanstack/react-db";
import * as React from "react";
import type {
  BucketSelect,
  SourceSelect,
  SourceSnapshotSelect,
} from "@/db/schema";

export const CollectionsContext = React.createContext<{
  BucketCollection: Collection<BucketSelect>;
  SourceCollection: Collection<SourceSelect>;
  SourceSnapshotCollection: Collection<SourceSnapshotSelect>;
} | null>(null);
