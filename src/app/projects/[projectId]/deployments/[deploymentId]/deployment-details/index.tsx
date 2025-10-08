"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DeploymentSelect } from "@/db/schema";

import { DeploymentDetailsContent } from "./client";

export type DeploymentDetailsLoadingContextProps = {
  preloadedDeployment: DeploymentSelect;
};

const DeploymentDetailsLoadingContext =
  React.createContext<DeploymentDetailsLoadingContextProps>({
    preloadedDeployment: {} as DeploymentSelect,
  });

export const DeploymentDetailsDynamic = dynamic(
  () => import("./client").then((module) => module.DeploymentDetailsLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedDeployment } = React.useContext(
        DeploymentDetailsLoadingContext,
      );
      return <DeploymentDetailsContent deployment={preloadedDeployment} />;
    },
  },
);

export const DeploymentDetails = ({
  preloadedDeployment,
}: DeploymentDetailsLoadingContextProps) => {
  return (
    <DeploymentDetailsLoadingContext.Provider value={{ preloadedDeployment }}>
      <DeploymentDetailsDynamic preloadedDeployment={preloadedDeployment} />
    </DeploymentDetailsLoadingContext.Provider>
  );
};
