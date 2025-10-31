import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDeployment } from "./create-deployment";
import { DeploymentList } from "./deployment-list";

export default async function DeploymentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const preloadedDeployments = await db
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.project_id, projectId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployment environments
          </p>
        </div>
        <CreateDeployment />
      </div>
      <DeploymentList preloadedDeployments={preloadedDeployments} />
    </div>
  );
}
