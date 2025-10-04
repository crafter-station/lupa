"use client";

import dynamic from "next/dynamic";

export const BucketList = dynamic(
  () => import("./client").then((m) => m.BucketList),
  { ssr: false },
);
