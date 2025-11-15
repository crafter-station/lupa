import { Suspense } from "react";
import { DeploymentSelector } from "@/components/deployment-selector";
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
        <Suspense>
          <DeploymentSelector projectId={projectId} />
        </Suspense>
      </div>

      <div className="flex-1 min-h-0">
        <AIPlayground />
      </div>
    </div>
  );
}
