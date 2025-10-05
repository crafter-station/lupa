"use client";

import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { useCollections } from "@/hooks/use-collections";
import { generateId } from "@/lib/generate-id";

export const CreateDeployment = () => {
  const { bucketId } = useParams<{ bucketId: string }>();

  const { DeploymentCollection } = useCollections();

  const handleClick = React.useCallback(() => {
    DeploymentCollection.insert({
      id: generateId(),

      bucket_id: bucketId,
      vector_index_id: null,

      status: "queued",
      changes_detected: true,
      logs: [],

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [bucketId, DeploymentCollection]);

  return <Button onClick={handleClick}>Deploy</Button>;
};
