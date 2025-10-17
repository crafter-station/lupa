import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const revalidate = 30;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [preloadedProject] = await db
    .select()
    .from(schema.Project)
    .where(eq(schema.Project.id, projectId));

  if (!preloadedProject) {
    throw new Error("Project not found");
  }

  const preloadedDeployments = await db
    .select({
      id: schema.Deployment.id,
      project_id: schema.Deployment.project_id,
      status: schema.Deployment.status,
      created_at: schema.Deployment.created_at,
    })
    .from(schema.Deployment)
    .where(eq(schema.Deployment.project_id, projectId));

  const preloadedDocuments = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.project_id, projectId));

  return (
    <AnalyticsDashboard
      preloadedProject={preloadedProject}
      preloadedDeployments={preloadedDeployments}
      preloadedDocuments={preloadedDocuments}
    />
  );
}
