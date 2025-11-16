import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DeploymentSelectorContent } from "./content";

export const DeploymentSelector = async ({
  projectId,
}: {
  projectId: string;
}) => {
  const [preloadedProject] = await db
    .select()
    .from(schema.Project)
    .where(eq(schema.Project.id, projectId));

  if (!preloadedProject) {
    throw new Error("Project not found");
  }

  const deployments = await db
    .select()
    .from(schema.Deployment)
    .where(
      and(
        eq(schema.Deployment.project_id, projectId),
        eq(schema.Deployment.status, "ready"),
      ),
    );

  return <DeploymentSelectorContent deployments={deployments} />;
};
