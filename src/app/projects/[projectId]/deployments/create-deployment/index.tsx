"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

export const CreateDeployment = dynamic(
  () => import("./client").then((m) => m.CreateDeployment),
  {
    loading: () => <Button variant="outline">Deploy</Button>,
    ssr: false,
  },
);
