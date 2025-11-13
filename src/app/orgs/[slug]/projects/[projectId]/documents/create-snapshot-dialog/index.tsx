"use client";

import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";

export const CreateSnapshotDialog = dynamic(
  () => import("./client").then((m) => m.CreateSnapshotDialog),
  {
    loading: () => (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Plus className="h-4 w-4" />
      </Button>
    ),
    ssr: false,
  },
);
