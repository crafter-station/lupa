import type { Collection } from "@tanstack/react-db";
import * as React from "react";
import type {
  BucketSelect,
  DeploymentSelect,
  SourceSelect,
  SourceSnapshotSelect,
} from "@/db/schema";

export const CollectionsContext = React.createContext<{
  BucketCollection: Collection<BucketSelect>;
  SourceCollection: Collection<SourceSelect>;
  DeploymentCollection: Collection<DeploymentSelect>;
  SourceSnapshotCollection: Collection<SourceSnapshotSelect>;
} | null>(null);
