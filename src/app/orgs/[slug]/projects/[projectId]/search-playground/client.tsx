"use client";

import { DeploymentSelectorClient } from "@/components/deployment-selector/client";
import type { DeploymentSelect } from "@/db/schema";
import { SearchPlayground } from "./search-playground";

type SearchPlaygroundClientProps = {
  preloadedDeployments: DeploymentSelect[];
};

export function SearchPlaygroundClient({
  preloadedDeployments,
}: SearchPlaygroundClientProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 shrink-0">
        <h1 className="text-xl font-bold">Search Playground</h1>
        <DeploymentSelectorClient preloadedDeployments={preloadedDeployments} />
      </div>

      <div className="flex-1 min-h-0">
        <SearchPlayground />
      </div>
    </div>
  );
}
