"use client";

import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const CreateDeployment = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create deployment");
      }

      const deployment = await response.json();
      toast.success(`Deployment "${deployment.name}" created!`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create deployment",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Creating..." : "Create Deployment"}
    </Button>
  );
};
