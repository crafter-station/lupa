import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { DeploymentSelector } from "@/components/deployment-selector";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { APIPlayground } from "./api-playground";

export default async function APIPlaygroundPage({
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 px-1 shrink-0">
        <div>
          <h1 className="text-xl font-bold">API Playground</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test search, tree, and cat APIs with live examples
          </p>
        </div>
        <Suspense>
          <DeploymentSelector projectId={projectId} />
        </Suspense>
      </div>

      <div className="flex-1 min-h-0 px-1 pb-4">
        <APIPlayground />
      </div>
    </div>
  );
}
