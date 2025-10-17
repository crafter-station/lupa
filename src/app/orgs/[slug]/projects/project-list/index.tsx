"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { ProjectSelect } from "@/db/schema";

import { ProjectListContent } from "./client";

export type ProjectListLoadingContextProps = {
  preloadedProjects: ProjectSelect[];
};

const ProjectListLoadingContext =
  React.createContext<ProjectListLoadingContextProps>({
    preloadedProjects: [],
  });

export const ProjectListDynamic = dynamic(
  () => import("./client").then((module) => module.ProjectListLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedProjects } = React.useContext(ProjectListLoadingContext);
      return <ProjectListContent projects={preloadedProjects} />;
    },
  },
);

export const ProjectList = ({
  preloadedProjects,
}: ProjectListLoadingContextProps) => {
  return (
    <ProjectListLoadingContext.Provider value={{ preloadedProjects }}>
      <ProjectListDynamic preloadedProjects={preloadedProjects} />
    </ProjectListLoadingContext.Provider>
  );
};
