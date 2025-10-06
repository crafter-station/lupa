"use client";

import dynamic from "next/dynamic";

export const DeploymentDetails = dynamic(
  () => import("./client").then((m) => m.DeploymentDetails),
  { ssr: false },
);
