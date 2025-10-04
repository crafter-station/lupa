"use client";

import dynamic from "next/dynamic";

export const BucketDetails = dynamic(
  () => import("./client").then((m) => m.BucketDetails),
  { ssr: false },
);
