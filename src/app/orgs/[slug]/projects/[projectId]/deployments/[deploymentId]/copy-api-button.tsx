"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyApiButton({
  apiUrl,
  deploymentId,
}: {
  apiUrl: string;
  deploymentId: string;
}) {
  const handleCopyApi = () => {
    const apiCode = `GET ${apiUrl}
Header: Deployment-Id = ${deploymentId}`;
    navigator.clipboard.writeText(apiCode);
    toast.success("API endpoint copied to clipboard!");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 hover:bg-transparent"
      onClick={handleCopyApi}
    >
      <span className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
        <span>Copy API</span>
        <Copy className="size-3" />
      </span>
    </Button>
  );
}
