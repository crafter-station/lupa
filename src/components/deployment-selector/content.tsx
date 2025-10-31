"use client";

import { Rocket } from "lucide-react";
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

  const selectedDeploymentId =
    deploymentId ??
    (deployments.length
      ? deployments.find((d) => d.environment === "production")?.id ||
        deployments.toSorted(
          (a, b) =>
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        )[0].id
      : undefined);

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
