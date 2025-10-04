"use client";

import dynamic from "next/dynamic";

export const SnapshotViewer = dynamic(
  () => import("./client").then((m) => m.SnapshotViewer),
  { ssr: false },
);
