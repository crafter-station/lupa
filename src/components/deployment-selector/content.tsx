"use client";

import { Rocket } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DeploymentSelect } from "@/db/schema";
import { useDeploymentId } from "@/hooks/use-deployment-id";

export function DeploymentSelectorContent({
  deployments,
}: {
  deployments: DeploymentSelect[];
}) {
  const [deploymentId, setDeploymentId] = useDeploymentId();

  const selectedDeploymentId = React.useMemo(() => {
    if (deploymentId) return deploymentId;

    if (!deployments.length) return undefined;

    const productionDeployment = deployments.find(
      (d) => d.environment === "production",
    );
    if (productionDeployment) return productionDeployment.id;

    const newest = deployments.toSorted(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];

    return newest.id;
  }, [deploymentId, deployments]);

  React.useEffect(() => {
    if (!deploymentId && selectedDeploymentId) {
      setDeploymentId(selectedDeploymentId);
    }
  }, [deploymentId, selectedDeploymentId, setDeploymentId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Rocket className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Deployments</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedDeploymentId}
          onValueChange={setDeploymentId}
        >
          {deployments.map((deployment) => (
            <DropdownMenuRadioItem key={deployment.id} value={deployment.id}>
              {deployment.name || deployment.id}{" "}
              {deployment.environment && (
                <span className="text-muted-foreground">
                  ({deployment.environment})
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
