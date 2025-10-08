"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DeploymentSelect } from "@/db/schema";

import { DeploymentListContent } from "./client";

// Tanstack DB doesnt have server side rendering support for now
// https://github.com/TanStack/db/issues/545
// and components that have useLiveQuery will fail
// when rendered on the server
//
// And Next.js does SSR by default
// We need to make some tricks to prevent SSR
//
// Inspired by https://github.com/vercel/next.js/issues/7906#issuecomment-787686440

export type DeploymentListLoadingContextProps = {
  preloadedDeployments: DeploymentSelect[];
};

const DeploymentListLoadingContext =
  React.createContext<DeploymentListLoadingContextProps>({
    preloadedDeployments: [],
  });

export const DeploymentListDynamic = dynamic(
  () => import("./client").then((module) => module.DeploymentListLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedDeployments } = React.useContext(
        DeploymentListLoadingContext,
      );
      return <DeploymentListContent deployments={preloadedDeployments} />;
    },
  },
);

export const DeploymentList = ({
  preloadedDeployments,
}: DeploymentListLoadingContextProps) => {
  return (
    <DeploymentListLoadingContext.Provider value={{ preloadedDeployments }}>
      <DeploymentListDynamic preloadedDeployments={preloadedDeployments} />
    </DeploymentListLoadingContext.Provider>
  );
};
