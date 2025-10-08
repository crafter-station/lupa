"use client";

import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

export const CreateDeployment = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { DeploymentCollection } = useCollections();

  const handleClick = React.useCallback(() => {
    DeploymentCollection.insert({
      id: generateId(),

      project_id: projectId,
      vector_index_id: null,

      status: "queued",
      changes_detected: true,
      logs: [],

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [projectId, DeploymentCollection]);

  return (
    <Button variant="outline" onClick={handleClick}>
      Deploy
    </Button>
  );
};
