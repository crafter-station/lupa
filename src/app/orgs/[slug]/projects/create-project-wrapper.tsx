"use client";

import dynamic from "next/dynamic";

export const CreateProject = dynamic(
  () =>
    import("./create-project").then((mod) => ({ default: mod.CreateProject })),
  { ssr: false },
);
