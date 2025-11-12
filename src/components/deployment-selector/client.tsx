"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DeploymentSelect } from "@/db/schema";

import { DeploymentSelectorContent } from "./content";

export type DeploymentSelectorLoadingContextProps = {
  preloadedDeployments: DeploymentSelect[];
};

const DeploymentSelectorLoadingContext =
  React.createContext<DeploymentSelectorLoadingContextProps>({
    preloadedDeployments: [],
  });

export const DeploymentSelectorDynamic = dynamic(
  () => import("./live").then((module) => module.DeploymentSelectorLive),
  {
    ssr: false,

    loading: () => {
      const { preloadedDeployments } = React.useContext(
        DeploymentSelectorLoadingContext,
      );
      return <DeploymentSelectorContent deployments={preloadedDeployments} />;
    },
  },
);

export const DeploymentSelectorClient = ({
  preloadedDeployments,
}: DeploymentSelectorLoadingContextProps) => {
  return (
    <DeploymentSelectorLoadingContext.Provider value={{ preloadedDeployments }}>
      <DeploymentSelectorDynamic preloadedDeployments={preloadedDeployments} />
    </DeploymentSelectorLoadingContext.Provider>
  );
};
