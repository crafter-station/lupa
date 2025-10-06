import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDeployment } from "./create-deployment";
import { DeploymentList } from "./deployment-list";

export const revalidate = 60;

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
    <>
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Deployment</h1>
        <CreateDeployment />
      </div>
      <DeploymentList preloadedDeployments={preloadedDeployments} />
    </>
  );
}
