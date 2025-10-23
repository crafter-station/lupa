import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiKeysClient } from "./client";

export const revalidate = 0;

export default async function ApiKeysPage({
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

  const preloadedApiKeys = await db
    .select({
      id: schema.ApiKey.id,
      name: schema.ApiKey.name,
      key_preview: schema.ApiKey.key_preview,
      last_used_at: schema.ApiKey.last_used_at,
      created_at: schema.ApiKey.created_at,
    })
    .from(schema.ApiKey)
    .where(eq(schema.ApiKey.project_id, projectId));

  return (
    <ApiKeysClient projectId={projectId} preloadedApiKeys={preloadedApiKeys} />
  );
}
