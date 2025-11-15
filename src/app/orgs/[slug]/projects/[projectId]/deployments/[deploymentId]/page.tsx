import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { EnvironmentBadge } from "@/components/elements/environment-badge";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { cn, getAPIBaseURL } from "@/lib/utils";
import { ChangeEnvironment } from "./change-enviroment";
import { CopyApiButton } from "./copy-api-button";
import { UpdateName } from "./update-name";

export default async function DeploymentPage({
  params,
}: {
  params: Promise<{ projectId: string; deploymentId: string }>;
}) {
  const { deploymentId, projectId } = await params;

  const [deployment] = await db
    .select()
    .from(schema.Deployment)
    .where(
      and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
      ),
    );

  if (!deployment) {
    throw new Error("Deployment not found");
  }

  const apiUrl = `${getAPIBaseURL(projectId)}/search?query=<query>`;

  return (
    <div>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-wrap">
            <UpdateName initialName={deployment.name} />
            <Badge
              className={cn({
                "bg-green-500 text-foreground": deployment.status === "ready",
                "bg-red-500 text-foreground": deployment.status === "error",
                "bg-yellow-500 text-foreground":
                  deployment.status === "building",
                "bg-gray-500 text-foreground": deployment.status === "queued",
                "bg-muted text-muted-foreground":
                  deployment.status === "cancelled",
              })}
            >
              {deployment.status}
            </Badge>
            <EnvironmentBadge environment={deployment.environment} />
          </div>

          <Suspense>
            <ChangeEnvironment
              projectId={projectId}
              deploymentId={deploymentId}
              currentDeployment={deployment}
            />
          </Suspense>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {deploymentId}
          </code>
          <span>•</span>
          <span>
            Created{" "}
            <time dateTime={deployment.created_at}>
              {deployment.created_at}
            </time>
          </span>
          <span>•</span>
          <CopyApiButton apiUrl={apiUrl} deploymentId={deploymentId} />
        </div>
      </div>
    </div>
  );
}
