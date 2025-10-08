"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

export const CreateSnapshot = dynamic(
  () => import("./client").then((m) => m.CreateSnapshot),
  {
    loading: () => (
      <Button variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-1" />
        New Snapshot
      </Button>
    ),
    ssr: false,
  },
);
