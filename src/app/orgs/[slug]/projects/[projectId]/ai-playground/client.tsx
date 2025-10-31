"use client";

import { useState } from "react";
import { DeploymentSelector } from "@/components/elements/deployment-selector";
import type { DeploymentSelect } from "@/db/schema";
import { AIPlayground } from "./ai-playground";

type AIPlaygroundClientProps = {
  preloadedDeployments: DeploymentSelect[];
};

export function AIPlaygroundClient({
  preloadedDeployments,
}: AIPlaygroundClientProps) {
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>(
    preloadedDeployments.find((d) => d.environment === "production")?.id ||
      preloadedDeployments[0]?.id ||
      "",
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 shrink-0">
        <h1 className="text-xl font-bold">AI Playground</h1>
        <DeploymentSelector
          preloadedDeployments={preloadedDeployments}
          selectedDeploymentId={selectedDeploymentId}
          onDeploymentChange={setSelectedDeploymentId}
        />
      </div>

      {selectedDeploymentId ? (
        <div className="flex-1 min-h-0">
          <AIPlayground
            key={selectedDeploymentId}
            overrideDeploymentId={selectedDeploymentId}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No deployments available. Create a deployment first.
        </div>
      )}
    </div>
  );
}
