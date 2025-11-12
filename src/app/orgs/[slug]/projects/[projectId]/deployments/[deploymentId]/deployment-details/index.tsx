"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DeploymentSelect, ProjectSelect } from "@/db/schema";

import { DeploymentDetailsContent } from "./client";

export type DeploymentDetailsLoadingContextProps = {
  preloadedDeployment: DeploymentSelect;
  preloadedProject: ProjectSelect;
};

const DeploymentDetailsLoadingContext =
  React.createContext<DeploymentDetailsLoadingContextProps>({
    preloadedDeployment: {} as DeploymentSelect,
    preloadedProject: {} as ProjectSelect,
  });

export const DeploymentDetailsDynamic = dynamic(
  () => import("./client").then((module) => module.DeploymentDetailsLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedDeployment, preloadedProject } = React.useContext(
        DeploymentDetailsLoadingContext,
      );
      return (
        <DeploymentDetailsContent
          deployment={preloadedDeployment}
          productionDeploymentId={preloadedProject.production_deployment_id}
          stagingDeploymentId={preloadedProject.staging_deployment_id}
        />
      );
    },
  },
);

export const DeploymentDetails = ({
  preloadedDeployment,
  preloadedProject,
}: DeploymentDetailsLoadingContextProps) => {
  return (
    <DeploymentDetailsLoadingContext.Provider
      value={{ preloadedDeployment, preloadedProject }}
    >
      <DeploymentDetailsDynamic
        preloadedDeployment={preloadedDeployment}
        preloadedProject={preloadedProject}
      />
    </DeploymentDetailsLoadingContext.Provider>
  );
};
