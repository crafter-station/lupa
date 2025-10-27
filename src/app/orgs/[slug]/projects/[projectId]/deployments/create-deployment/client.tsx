"use client";

import { useOrganization } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

export const CreateDeployment = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const { DeploymentCollection } = useCollections();

  const { organization } = useOrganization();

  const handleClick = React.useCallback(() => {
    DeploymentCollection.insert({
      id: generateId(),

      project_id: projectId,
      vector_index_id: null,

      status: "queued",
      environment: "staging",
      logs: [],

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      org_id: organization?.id ?? "",
    });
  }, [projectId, DeploymentCollection, organization]);

  return (
    <Button variant="outline" onClick={handleClick}>
      Deploy
    </Button>
  );
};
