"use client";

import { ArrowUp } from "lucide-react";
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

interface PromoteToStagingButtonProps {
  deploymentId: string;
  projectId: string;
  currentStagingDeploymentId?: string | null;
  onSuccess?: () => void;
}

export function PromoteToStagingButton({
  deploymentId,
  projectId,
  currentStagingDeploymentId,
  onSuccess,
}: PromoteToStagingButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePromote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/deployments/${deploymentId}/environment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, environment: "staging" }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to promote to staging");
      }

      toast.success("Successfully promoted to staging!");
      onSuccess?.();
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to promote to staging",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        className="bg-yellow-600 hover:bg-yellow-700 text-white"
        size="sm"
      >
        <ArrowUp />
        Promote to Staging
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Staging?</DialogTitle>
            <DialogDescription>
              This deployment will become the active staging deployment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">This will:</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Set{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {deploymentId}
                </code>{" "}
                as the staging deployment
              </li>
              {currentStagingDeploymentId && (
                <li>
                  Unset environment for{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {currentStagingDeploymentId}
                  </code>{" "}
                  (current staging)
                </li>
              )}
              <li>Test API keys will use this deployment</li>
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
              onClick={handlePromote}
              disabled={isLoading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isLoading ? "Promoting..." : "Promote to Staging"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
