"use client";

import { Rocket } from "lucide-react";
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

interface PromoteToProductionButtonProps {
  deploymentId: string;
  projectId: string;
  currentProductionDeploymentId?: string | null;
  onSuccess?: () => void;
}

export function PromoteToProductionButton({
  deploymentId,
  projectId,
  currentProductionDeploymentId,
  onSuccess,
}: PromoteToProductionButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePromote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, environment: "production" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || "Failed to promote to production",
        );
      }

      toast.success("Successfully promoted to production!");
      onSuccess?.();
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to promote to production",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        <Rocket />
        Promote to Production
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🚀 Promote to Production?</DialogTitle>
            <DialogDescription>
              This deployment will become the active production deployment.
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
                as the production deployment
              </li>
              {currentProductionDeploymentId && (
                <li>
                  Demote{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {currentProductionDeploymentId}
                  </code>{" "}
                  (current production) to staging
                </li>
              )}
              <li>All API search requests will use this deployment</li>
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
              onClick={handlePromote}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Promoting..." : "Promote to Production"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
