"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Rocket } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { EnvironmentBadge } from "@/components/elements/environment-badge";
import { InlineEditableField } from "@/components/elements/inline-editable-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeploymentSelect } from "@/db";
import { DeploymentCollection, ProjectCollection } from "@/db/collections";
import { getAPIBaseURL } from "@/lib/utils";
import type { DeploymentDetailsLoadingContextProps } from "./index";

export function DeploymentDetailsLiveQuery({
  preloadedDeployment,
  preloadedProject,
}: DeploymentDetailsLoadingContextProps) {
  const { deploymentId, projectId } = useParams<{
    deploymentId: string;
    projectId: string;
  }>();

  const { data: freshData, status } = useLiveQuery(
    (q) =>
      q
        .from({ deployment: DeploymentCollection })
        .where(({ deployment }) => eq(deployment.id, deploymentId))
        .select(({ deployment }) => ({ ...deployment })),
    [],
  );

  const { data: freshProjectData, status: projectStatus } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project }))
      .where(({ project }) => eq(project.id, projectId)),
  );

  const deployment = React.useMemo(() => {
    if (status !== "ready") {
      return preloadedDeployment;
    }
    if (
      new Date(freshData[0]?.updated_at) >
      new Date(preloadedDeployment.updated_at)
    ) {
      return freshData[0];
    } else {
      return preloadedDeployment;
    }
  }, [status, freshData, preloadedDeployment]);

  const project = React.useMemo(() => {
    if (projectStatus !== "ready" || !freshProjectData?.[0]) {
      return preloadedProject;
    }
    if (
      new Date(freshProjectData[0].updated_at) >
      new Date(preloadedProject.updated_at)
    ) {
      return freshProjectData[0];
    }
    return preloadedProject;
  }, [projectStatus, freshProjectData, preloadedProject]);

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
  const router = useRouter();

  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    action: "promote-staging" | "promote-production" | "demote" | null;
  }>({ open: false, action: null });
  const [isLoading, setIsLoading] = React.useState(false);

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

  const apiUrl = `${getAPIBaseURL(projectId)}/search?query=<query>`;

  const isProduction = deployment.environment === "production";
  const isStaging = deployment.environment === "staging";
  const hasNoEnvironment = !deployment.environment;
  const isReady = deployment.status === "ready";

  const handleNameUpdate = React.useCallback(
    (newName: string) => {
      DeploymentCollection.update(deployment.id, (depl) => {
        depl.name = newName;
        depl.updated_at = new Date().toISOString();
      });
    },
    [deployment.id],
  );

  const handleCopyApi = () => {
    const apiCode = `GET ${apiUrl}
Header: Deployment-Id = ${deployment.id}`;
    navigator.clipboard.writeText(apiCode);
    toast.success("API endpoint copied to clipboard!");
  };

  const handleEnvironmentChange = async (
    targetEnvironment: "production" | "staging" | null,
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deployments/${deployment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, environment: targetEnvironment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update environment");
      }

      const action = confirmDialog.action;
      const message =
        action === "promote-production"
          ? "Successfully promoted to production!"
          : action === "promote-staging"
            ? "Successfully promoted to staging!"
            : targetEnvironment === "staging"
              ? "Successfully demoted to staging!"
              : "Successfully demoted to no environment!";

      toast.success(message);
      setConfirmDialog({ open: false, action: null });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update environment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirmDialog = (
    action: "promote-staging" | "promote-production" | "demote",
  ) => {
    setConfirmDialog({ open: true, action });
  };

  const getDialogContent = () => {
    const { action } = confirmDialog;

    if (action === "promote-production") {
      return {
        title: "🚀 Promote to Production?",
        description:
          "This deployment will become the active production deployment.",
        items: [
          `Set ${deployment.id} as the production deployment`,
          ...(productionDeploymentId
            ? [
                `Demote ${productionDeploymentId} (current production) to staging`,
              ]
            : []),
          "All API search requests will use this deployment",
          "Changes take effect immediately",
        ],
        onConfirm: () => handleEnvironmentChange("production"),
        buttonText: "Promote to Production",
        buttonClassName: "bg-green-600 hover:bg-green-700 text-white",
      };
    }

    if (action === "promote-staging") {
      return {
        title: "Promote to Staging?",
        description:
          "This deployment will become the active staging deployment.",
        items: [
          `Set ${deployment.id} as the staging deployment`,
          ...(stagingDeploymentId
            ? [
                `Demote ${stagingDeploymentId} (current staging) to no environment`,
              ]
            : []),
          "Test API keys will use this deployment",
        ],
        onConfirm: () => handleEnvironmentChange("staging"),
        buttonText: "Promote to Staging",
        buttonClassName: "bg-yellow-600 hover:bg-yellow-700 text-white",
      };
    }

    if (action === "demote") {
      const targetEnv = isProduction ? "staging" : null;
      const targetLabel = isProduction ? "Staging" : "No Environment";

      return {
        title: `Demote from ${isProduction ? "Production" : "Staging"}?`,
        description: `This deployment will be moved to ${targetLabel.toLowerCase()}.`,
        items: [
          `Move ${deployment.id} to ${targetLabel.toLowerCase()}`,
          ...(isProduction
            ? [
                "Live API keys will no longer use this deployment by default",
                "Test API keys will use this deployment instead",
              ]
            : [
                "Test API keys will no longer use this deployment by default",
                "This deployment will be unassigned from any environment",
              ]),
          "Changes take effect immediately",
        ],
        onConfirm: () => handleEnvironmentChange(targetEnv),
        buttonText: `Demote from ${isProduction ? "Production" : "Staging"}`,
        buttonClassName: isProduction
          ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          : "",
      };
    }

    return null;
  };

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <InlineEditableField
              value={deployment.name}
              onSave={handleNameUpdate}
              placeholder="Deployment name"
              className="text-2xl font-bold"
            />
            <Badge className={statusColor}>{deployment.status}</Badge>
            <EnvironmentBadge environment={deployment.environment} />
          </div>

          {isReady && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions
                  <ChevronDown className="ml-2 size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {hasNoEnvironment && (
                  <DropdownMenuItem
                    onClick={() => openConfirmDialog("promote-staging")}
                  >
                    <ArrowUp className="mr-2 size-4" />
                    Promote to Staging
                  </DropdownMenuItem>
                )}

                {isStaging && (
                  <>
                    <DropdownMenuItem
                      onClick={() => openConfirmDialog("promote-production")}
                    >
                      <Rocket className="mr-2 size-4" />
                      Promote to Production
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openConfirmDialog("demote")}
                    >
                      <ArrowDown className="mr-2 size-4" />
                      Demote from Staging
                    </DropdownMenuItem>
                  </>
                )}

                {isProduction && (
                  <DropdownMenuItem
                    onClick={() => openConfirmDialog("demote")}
                    variant="destructive"
                  >
                    <ArrowDown className="mr-2 size-4" />
                    Demote from Production
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Dialog
          open={confirmDialog.open}
          onOpenChange={(open) =>
            setConfirmDialog({ open, action: confirmDialog.action })
          }
        >
          <DialogContent>
            {dialogContent && (
              <>
                <DialogHeader>
                  <DialogTitle>{dialogContent.title}</DialogTitle>
                  <DialogDescription>
                    {dialogContent.description}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  <p className="text-sm font-medium">This will:</p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    {dialogContent.items.map((item) => (
                      <li key={item}>
                        {item.includes(deployment.id) ||
                        item.includes(productionDeploymentId || "") ||
                        item.includes(stagingDeploymentId || "") ? (
                          <>
                            {item.split(deployment.id)[0]}
                            {item.includes(deployment.id) && (
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {deployment.id}
                              </code>
                            )}
                            {item.split(deployment.id)[1] ||
                              item.split(
                                productionDeploymentId ||
                                  stagingDeploymentId ||
                                  "",
                              )[1]}
                          </>
                        ) : (
                          item
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setConfirmDialog({ open: false, action: null })
                    }
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={dialogContent.onConfirm}
                    disabled={isLoading}
                    className={dialogContent.buttonClassName}
                  >
                    {isLoading ? "Processing..." : dialogContent.buttonText}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {deployment.id}
          </code>
          <span>•</span>
          <span>
            Created {new Date(deployment.created_at).toLocaleDateString()}
          </span>
          <span>•</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 hover:bg-transparent"
            onClick={handleCopyApi}
          >
            <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
              <span>Copy API</span>
              <Copy className="size-3" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
