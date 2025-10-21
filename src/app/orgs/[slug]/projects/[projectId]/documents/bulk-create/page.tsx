"use client";

import dynamic from "next/dynamic";

const BulkCreateClient = dynamic(
  () => import("./client").then((m) => ({ default: m.BulkCreateClient })),
  {
    ssr: false,
  },
);

export default BulkCreateClient;
