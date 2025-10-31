"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { ProjectSelect } from "@/db/schema";
import { ProjectSwitcherContent } from "./content";

export type ProjectSwitcherLoadingContextProps = {
  preloadedProjects: ProjectSelect[];
};

const ProjectSwitcherLoadingContext =
  React.createContext<ProjectSwitcherLoadingContextProps>({
    preloadedProjects: [],
  });

const ProjectSwitcherDynamic = dynamic(
  () => import("./live").then((module) => module.ProjectSwitcherLive),
  {
    ssr: false,

    loading: () => {
      const { preloadedProjects } = React.useContext(
        ProjectSwitcherLoadingContext,
      );
      return <ProjectSwitcherContent projects={preloadedProjects} />;
    },
  },
);

export const ProjectSwitcherClient = ({
  preloadedProjects,
}: ProjectSwitcherLoadingContextProps) => {
  return (
    <ProjectSwitcherLoadingContext.Provider value={{ preloadedProjects }}>
      <ProjectSwitcherDynamic preloadedProjects={preloadedProjects} />
    </ProjectSwitcherLoadingContext.Provider>
  );
};
