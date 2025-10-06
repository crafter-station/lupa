"use client";

import dynamic from "next/dynamic";

export const ProjectList = dynamic(
  () => import("./client").then((m) => m.ProjectList),
  { ssr: false },
);
