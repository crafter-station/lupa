"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import type { ProjectSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function ProjectDetails({
  preloadedProject,
}: {
  preloadedProject: ProjectSelect;
}) {
  const { ProjectCollection } = useCollections();
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project }))
      .where(({ project }) => eq(project.id, preloadedProject.id)),
  );

  const project = React.useMemo(() => {
    if (status === "ready" && freshData && freshData.length > 0) {
      return freshData[0];
    }
    return preloadedProject;
  }, [status, freshData, preloadedProject]);

  return (
    <div>
      <h1 className="text-2xl">
        Name: <span className="font-bold">{project.name}</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Description: {project.description}
      </p>
    </div>
  );
}
