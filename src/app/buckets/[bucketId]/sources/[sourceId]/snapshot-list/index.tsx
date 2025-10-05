"use client";

import dynamic from "next/dynamic";

export const SnapshotList = dynamic(
  () => import("./client").then((m) => m.SnapshotList),
  { ssr: false },
);
