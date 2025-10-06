"use client";

import dynamic from "next/dynamic";

export const DocumentDetails = dynamic(
  () => import("./client").then((m) => m.DocumentDetails),
  { ssr: false },
);
