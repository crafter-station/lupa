"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

export const CreateDocument = dynamic(
  () => import("./client").then((m) => m.CreateDocument),
  {
    loading: () => <Button variant="outline">Create Document</Button>,
    ssr: false,
  },
);
