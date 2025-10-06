"use client";

import dynamic from "next/dynamic";

export const DocumentList = dynamic(
  () => import("./client").then((m) => m.DocumentList),
  { ssr: false },
);
