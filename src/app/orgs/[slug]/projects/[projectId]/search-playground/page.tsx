import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { DeploymentSelector } from "@/components/deployment-selector";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SearchPlayground } from "./search-playground";

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 shrink-0">
        <h1 className="text-xl font-bold">Search Playground</h1>
        <Suspense>
          <DeploymentSelector projectId={projectId} />
        </Suspense>
      </div>

      <div className="flex-1 min-h-0">
        <SearchPlayground />
      </div>
    </div>
  );
}
