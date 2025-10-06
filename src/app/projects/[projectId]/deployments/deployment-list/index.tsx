"use client";

import dynamic from "next/dynamic";

export const DeploymentList = dynamic(
  () => import("./client").then((m) => m.DeploymentList),
  { ssr: false },
);
