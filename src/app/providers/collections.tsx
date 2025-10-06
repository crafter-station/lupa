import type { Collection } from "@tanstack/react-db";
import * as React from "react";
import type {
  DeploymentSelect,
  DocumentSelect,
  ProjectSelect,
  SnapshotSelect,
} from "@/db/schema";

export const CollectionsContext = React.createContext<{
  ProjectCollection: Collection<ProjectSelect>;
  DocumentCollection: Collection<DocumentSelect>;
  DeploymentCollection: Collection<DeploymentSelect>;
  SnapshotCollection: Collection<SnapshotSelect>;
} | null>(null);
