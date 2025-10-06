import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DeploymentDetails } from "./deployment-details";

export const revalidate = 60;

export default async function DeploymentPage({
  params,
}: {
  params: Promise<{ projectId: string; deploymentId: string }>;
}) {
  const { deploymentId } = await params;

  const [preloadedDeployment] = await db
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.id, deploymentId));

  if (!preloadedDeployment) {
    throw new Error("Deployment not found");
  }

  return <DeploymentDetails preloadedDeployment={preloadedDeployment} />;
}
