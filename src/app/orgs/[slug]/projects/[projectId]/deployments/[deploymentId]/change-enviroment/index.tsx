import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ChangeEnvironmentClient } from "./client";

export const ChangeEnvironment = async ({
  projectId,
  deploymentId,
  currentDeployment,
}: {
  projectId: string;
  deploymentId: string;
  currentDeployment: schema.DeploymentSelect;
}) => {
  const deployments = await db
    .select({
      id: schema.Deployment.id,
      environment: schema.Deployment.environment,
    })
    .from(schema.Deployment)
    .where(
      and(
        eq(schema.Deployment.project_id, projectId),
        isNotNull(schema.Deployment.environment),
      ),
    );

  const production = deployments.find((d) => d.environment === "production");
  const staging = deployments.find((d) => d.environment === "staging");

  return (
    <ChangeEnvironmentClient
      projectId={projectId}
      deploymentId={deploymentId}
      currentEnvironment={currentDeployment.environment}
      currentStatus={currentDeployment.status}
      productionDeploymentId={production?.id ?? null}
      stagingDeploymentId={staging?.id ?? null}
    />
  );
};
