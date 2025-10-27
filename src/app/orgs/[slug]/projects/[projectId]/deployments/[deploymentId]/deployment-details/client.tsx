"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { Copy } from "lucide-react";
import { useParams } from "next/navigation";
import React from "react";
import { EnvironmentBadge } from "@/components/elements/environment-badge";
import { PromoteToProductionButton } from "@/components/elements/promote-to-production-button";
import { PromoteToStagingButton } from "@/components/elements/promote-to-staging-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { DeploymentSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { getAPIBaseURL } from "@/lib/utils";
import { AIPlayground } from "../ai-playground";
import { SearchPlayground } from "../search-playground";
import type { DeploymentDetailsLoadingContextProps } from "./index";

export function DeploymentDetailsLiveQuery({
  preloadedDeployment,
}: DeploymentDetailsLoadingContextProps) {
  const { deploymentId, projectId } = useParams<{
    deploymentId: string;
    projectId: string;
  }>();

  const { DeploymentCollection, ProjectCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ deployment: DeploymentCollection })
      .select(({ deployment }) => ({ ...deployment }))
      .where(({ deployment }) => eq(deployment.id, deploymentId)),
  );

  const { data: projectData } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project }))
      .where(({ project }) => eq(project.id, projectId)),
  );

  const deployment = React.useMemo(() => {
    const data = status === "ready" ? freshData : [preloadedDeployment];
    return data[0];
  }, [status, freshData, preloadedDeployment]);

  const project = projectData?.[0];

  return (
    <DeploymentDetailsContent
      deployment={deployment}
      productionDeploymentId={project?.production_deployment_id}
      stagingDeploymentId={project?.staging_deployment_id}
    />
  );
}

export function DeploymentDetailsContent({
  deployment,
  productionDeploymentId,
  stagingDeploymentId,
}: {
  deployment: DeploymentSelect;
  productionDeploymentId?: string | null;
  stagingDeploymentId?: string | null;
}) {
  const { projectId } = useParams<{
    deploymentId: string;
    projectId: string;
  }>();

  if (!deployment) {
    return <div>Deployment not found</div>;
  }

  const statusColor =
    deployment.status === "ready"
      ? "bg-green-100 text-green-800 border-green-200"
      : deployment.status === "building"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : deployment.status === "queued"
          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
          : deployment.status === "error"
            ? "bg-red-100 text-red-800 border-red-200"
            : "bg-gray-100 text-gray-800 border-gray-200";

  const apiUrl = `${getAPIBaseURL(projectId)}/search/?query=<query>`;

  const isProduction = deployment.environment === "production";
  const isStaging = deployment.environment === "staging";
  const hasNoEnvironment = !deployment.environment;
  const isReady = deployment.status === "ready";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Deployment</h1>
          <Badge className={statusColor}>{deployment.status}</Badge>
          <EnvironmentBadge environment={deployment.environment} />
          {isReady && hasNoEnvironment && (
            <PromoteToStagingButton
              deploymentId={deployment.id}
              projectId={projectId}
              currentStagingDeploymentId={stagingDeploymentId}
            />
          )}
          {isReady && isStaging && (
            <PromoteToProductionButton
              deploymentId={deployment.id}
              projectId={projectId}
              currentProductionDeploymentId={productionDeploymentId}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono text-xs">{deployment.id}</span>
          <span>•</span>
          <span>
            Created {new Date(deployment.created_at).toLocaleDateString()}
          </span>
          <span>•</span>
          <span>
            Updated {new Date(deployment.updated_at).toLocaleDateString()}
          </span>
          <span>•</span>
          <HoverCard>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(apiUrl);
                }}
              >
                <span>API</span>
                <Copy className="size-3" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-2">
                <p className="text-xs font-medium">API Endpoint</p>
                <code className="block rounded bg-muted p-2 text-xs break-all">
                  GET {apiUrl}
                  HEADER Deployment-Id = {deployment.id}
                </code>
                {deployment.vector_index_id && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Vector Index: {deployment.vector_index_id}
                    </p>
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>

      {deployment.status === "ready" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SearchPlayground />
          <AIPlayground />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Not Ready</CardTitle>
            <CardDescription>
              {deployment.status === "building"
                ? "Building deployment... Playgrounds will be available once ready."
                : deployment.status === "queued"
                  ? "Deployment queued... Playgrounds will be available once ready."
                  : deployment.status === "error"
                    ? "Deployment failed. Please check the logs."
                    : "Deployment status unknown."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
