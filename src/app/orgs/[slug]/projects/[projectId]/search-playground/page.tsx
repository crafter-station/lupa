import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SearchPlaygroundClient } from "./client";

export default async function SearchPlaygroundPage({
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
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.project_id, projectId));

  return <SearchPlaygroundClient preloadedDeployments={preloadedDeployments} />;
}
