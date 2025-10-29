"use client";

import { ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DemoteDeploymentButtonProps {
  deploymentId: string;
  projectId: string;
  currentEnvironment: "production" | "staging";
  onSuccess?: () => void;
}

export function DemoteDeploymentButton({
  deploymentId,
  projectId,
  currentEnvironment,
  onSuccess,
}: DemoteDeploymentButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const targetEnvironment =
    currentEnvironment === "production" ? "staging" : null;
  const targetLabel =
    currentEnvironment === "production" ? "Staging" : "No Environment";

  const handleDemote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, environment: targetEnvironment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `Failed to demote from ${currentEnvironment}`,
        );
      }

      toast.success(`Successfully demoted to ${targetLabel.toLowerCase()}!`);
      onSuccess?.();
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to demote from ${currentEnvironment}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const buttonVariant =
    currentEnvironment === "production" ? "destructive" : "outline";
  const buttonLabel = `Demote from ${currentEnvironment === "production" ? "Production" : "Staging"}`;

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        variant={buttonVariant}
        size="sm"
      >
        <ArrowDown />
        {buttonLabel}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demote from {currentEnvironment}?</DialogTitle>
            <DialogDescription>
              This deployment will be moved to {targetLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">This will:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Move{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {deploymentId}
                </code>{" "}
                to {targetLabel.toLowerCase()}
              </li>
              {currentEnvironment === "production" && (
                <>
                  <li>
                    Live API keys will no longer use this deployment by default
                  </li>
                  <li>Test API keys will use this deployment instead</li>
                </>
              )}
              {currentEnvironment === "staging" && (
                <>
                  <li>
                    Test API keys will no longer use this deployment by default
                  </li>
                  <li>
                    This deployment will be unassigned from any environment
                  </li>
                </>
              )}
              <li>Changes take effect immediately</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDemote}
              disabled={isLoading}
              variant={buttonVariant}
            >
              {isLoading ? "Demoting..." : buttonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
