"use client";

import { useLiveQuery } from "@tanstack/react-db";
import React from "react";

import { ProjectCollection } from "@/db/collections";
import type { ProjectSwitcherLoadingContextProps } from "./client";
import { ProjectSwitcherContent } from "./content";

export function ProjectSwitcherLive({
  preloadedProjects,
}: ProjectSwitcherLoadingContextProps) {
  const { data: freshProjects, status } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project })),
  );

  const projects = React.useMemo(() => {
    if (status !== "ready") {
      return preloadedProjects;
    }

    if (freshProjects.length === 0) return [];
    if (preloadedProjects.length === 0) return [...freshProjects];

    const lastFresh = freshProjects.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[freshProjects.length - 1];

    const lastPreloaded = preloadedProjects.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[preloadedProjects.length - 1];

    if (
      new Date(lastFresh.updated_at).getTime() >
      new Date(lastPreloaded.updated_at).getTime()
    ) {
      return [...freshProjects];
    }
    return [...preloadedProjects];
  }, [status, freshProjects, preloadedProjects]);

  return <ProjectSwitcherContent projects={projects} />;
}
