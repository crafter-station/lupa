"use client";

import dynamic from "next/dynamic";

export const SourceList = dynamic(
  () => import("./client").then((m) => m.SourceList),
  { ssr: false },
);
