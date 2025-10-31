import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ProjectDetails } from "./project-details";

export default async function ProjectSettingsPage({
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your project configuration
        </p>
      </div>

      <ProjectDetails preloadedProject={preloadedProject} />
    </div>
  );
}
