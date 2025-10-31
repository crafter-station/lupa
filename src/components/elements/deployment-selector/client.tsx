"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeploymentSelect } from "@/db/schema";

import type { DeploymentSelectorLoadingContextProps } from "./index";

export function DeploymentSelectorLiveQuery({
  preloadedDeployments,
  selectedDeploymentId,
  onDeploymentChange,
}: DeploymentSelectorLoadingContextProps) {
  return (
    <DeploymentSelectorContent
      deployments={preloadedDeployments}
      selectedDeploymentId={selectedDeploymentId}
      onDeploymentChange={onDeploymentChange}
    />
  );
}

export function DeploymentSelectorContent({
  deployments,
  selectedDeploymentId,
  onDeploymentChange,
}: {
  deployments: DeploymentSelect[];
  selectedDeploymentId: string;
  onDeploymentChange: (deploymentId: string) => void;
}) {
  return (
    <Select value={selectedDeploymentId} onValueChange={onDeploymentChange}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select deployment" />
      </SelectTrigger>
      <SelectContent>
        {deployments.map((deployment) => (
          <SelectItem key={deployment.id} value={deployment.id}>
            {deployment.name || deployment.id}{" "}
            {deployment.environment && `(${deployment.environment})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
