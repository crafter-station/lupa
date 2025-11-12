"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";

import { DeploymentCollection } from "@/db/collections";
import type { DeploymentSelectorLoadingContextProps } from "./client";
import { DeploymentSelectorContent } from "./content";

export function DeploymentSelectorLive({
  preloadedDeployments,
}: DeploymentSelectorLoadingContextProps) {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const { data: freshDeployments, status } = useLiveQuery(
    (q) =>
      q
        .from({ deployment: DeploymentCollection })
        .where(({ deployment }) => eq(deployment.project_id, projectId))
        .select(({ deployment }) => ({ ...deployment })),
    [],
  );

  const deployments = React.useMemo(() => {
    if (status !== "ready") {
      return preloadedDeployments;
    }

    if (freshDeployments.length === 0) return [];
    if (preloadedDeployments.length === 0) return [...freshDeployments];

    const lastFresh = freshDeployments.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[freshDeployments.length - 1];

    const lastPreloaded = preloadedDeployments.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[preloadedDeployments.length - 1];

    if (
      new Date(lastFresh.updated_at).getTime() >
      new Date(lastPreloaded.updated_at).getTime()
    ) {
      return [...freshDeployments];
    }
    return [...preloadedDeployments];
  }, [status, freshDeployments, preloadedDeployments]);

  return <DeploymentSelectorContent deployments={deployments} />;
}
