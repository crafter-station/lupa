import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

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

  return <pre>Here we can put graphs, metrics, and more</pre>;
}
