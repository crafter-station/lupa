"use client";

import dynamic from "next/dynamic";

export const ProjectDetails = dynamic(
  () => import("./client").then((m) => m.ProjectDetails),
  { ssr: false },
);
