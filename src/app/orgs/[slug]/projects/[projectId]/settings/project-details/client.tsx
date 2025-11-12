"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import type { ProjectSelect } from "@/db";
import { ProjectCollection } from "@/db/collections";

export function ProjectDetails({
  preloadedProject,
}: {
  preloadedProject: ProjectSelect;
}) {
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project }))
      .where(({ project }) => eq(project.id, preloadedProject.id)),
  );

  const project = React.useMemo(() => {
    if (status !== "ready" || !freshData?.[0]) {
      return preloadedProject;
    }
    if (
      new Date(freshData[0].updated_at) > new Date(preloadedProject.updated_at)
    ) {
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
