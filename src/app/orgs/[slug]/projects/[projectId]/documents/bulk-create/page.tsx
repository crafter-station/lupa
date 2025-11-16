import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BulkCreateClient } from "./client";

export default async function BulkCreatePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const documents = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.project_id, projectId));

  return <BulkCreateClient projectId={projectId} documents={documents} />;
}
