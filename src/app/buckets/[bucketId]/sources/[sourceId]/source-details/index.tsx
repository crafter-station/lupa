"use client";

import dynamic from "next/dynamic";

export const SourceDetails = dynamic(
  () => import("./client").then((m) => m.SourceDetails),
  { ssr: false },
);
