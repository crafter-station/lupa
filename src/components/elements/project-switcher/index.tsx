"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { ProjectSwitcherContent } from "./client";

export type ProjectSwitcherProps = {
  collapsed: boolean;
};

const ProjectSwitcherLoadingContext = React.createContext<ProjectSwitcherProps>(
  {
    collapsed: false,
  },
);

export const ProjectSwitcherDynamic = dynamic(
  () => import("./client").then((module) => module.ProjectSwitcherLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { collapsed } = React.useContext(ProjectSwitcherLoadingContext);
      return <ProjectSwitcherContent projects={[]} collapsed={collapsed} />;
    },
  },
);

export const ProjectSwitcher = ({ collapsed }: ProjectSwitcherProps) => {
  return (
    <ProjectSwitcherLoadingContext.Provider value={{ collapsed }}>
      <ProjectSwitcherDynamic collapsed={collapsed} />
    </ProjectSwitcherLoadingContext.Provider>
  );
};
