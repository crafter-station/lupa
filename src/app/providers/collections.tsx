import type { Collection } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import * as React from "react";
import {
  DeploymentCollection,
  DocumentCollection,
  ProjectCollection,
  SnapshotCollection,
} from "@/db/collections";
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

export const CollectionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { projectId, deploymentId } = useParams<{
    projectId: string;
    deploymentId: string;
  }>();

  const _ProjectCollection = React.useMemo(
    () => ProjectCollection({ project_id: projectId }),
    [projectId],
  );

  const _DocumentCollection = React.useMemo(
    () =>
      DocumentCollection({
        project_id: projectId,
      }),
    [projectId],
  );

  const _DeploymentCollection = React.useMemo(
    () =>
      DeploymentCollection({
        project_id: projectId,
        deployment_id: deploymentId,
      }),
    [projectId, deploymentId],
  );

  const _SnapshotCollection = React.useMemo(() => SnapshotCollection(), []);

  return (
    <CollectionsContext
      value={{
        ProjectCollection: _ProjectCollection,
        DocumentCollection: _DocumentCollection,
        SnapshotCollection: _SnapshotCollection,
        DeploymentCollection: _DeploymentCollection,
      }}
    >
      {children}
    </CollectionsContext>
  );
};
