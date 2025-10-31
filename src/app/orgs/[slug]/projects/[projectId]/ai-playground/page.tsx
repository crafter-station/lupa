import { Suspense } from "react";
import { DeploymentSelectorClient } from "@/components/deployment-selector/client";
import { DeploymentSelectorServer } from "@/components/deployment-selector/server";
import { AIPlayground } from "./ai-playground";

export default async function AIPlaygroundPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end py-3 shrink-0">
        <Suspense
          fallback={<DeploymentSelectorClient preloadedDeployments={[]} />}
        >
          <DeploymentSelectorServer projectId={projectId} />
        </Suspense>
      </div>

      <div className="flex-1 min-h-0">
        <AIPlayground />
      </div>
    </div>
  );
}
