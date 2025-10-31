"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DeploymentSelect } from "@/db/schema";

import { DeploymentSelectorContent } from "./client";

export type DeploymentSelectorLoadingContextProps = {
  preloadedDeployments: DeploymentSelect[];
  selectedDeploymentId: string;
  onDeploymentChange: (deploymentId: string) => void;
};

const DeploymentSelectorLoadingContext =
  React.createContext<DeploymentSelectorLoadingContextProps>({
    preloadedDeployments: [],
    selectedDeploymentId: "",
    onDeploymentChange: () => {},
  });

export const DeploymentSelectorDynamic = dynamic(
  () => import("./client").then((module) => module.DeploymentSelectorLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedDeployments, selectedDeploymentId, onDeploymentChange } =
        React.useContext(DeploymentSelectorLoadingContext);
      return (
        <DeploymentSelectorContent
          deployments={preloadedDeployments}
          selectedDeploymentId={selectedDeploymentId}
          onDeploymentChange={onDeploymentChange}
        />
      );
    },
  },
);

export const DeploymentSelector = ({
  preloadedDeployments,
  selectedDeploymentId,
  onDeploymentChange,
}: DeploymentSelectorLoadingContextProps) => {
  return (
    <DeploymentSelectorLoadingContext.Provider
      value={{ preloadedDeployments, selectedDeploymentId, onDeploymentChange }}
    >
      <DeploymentSelectorDynamic
        preloadedDeployments={preloadedDeployments}
        selectedDeploymentId={selectedDeploymentId}
        onDeploymentChange={onDeploymentChange}
      />
    </DeploymentSelectorLoadingContext.Provider>
  );
};
