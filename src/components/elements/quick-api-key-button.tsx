"use client";

import { Key, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateId } from "@/lib/generate-id";

interface QuickApiKeyButtonProps {
  projectId: string;
}

export function QuickApiKeyButton({ projectId }: QuickApiKeyButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const keyName = `Playground Key (${timestamp})`;

      const response = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate API key");
      }

      const data = await response.json();

      await navigator.clipboard.writeText(data.key);

      toast.success("API key generated and copied!", {
        description: `Key "${keyName}" is ready to use`,
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to generate API key:", error);
      toast.error("Failed to generate API key", {
        description: "Please try again or create one manually",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateKey}
            disabled={isGenerating}
            className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Key className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">Get API Key</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">
            Instantly generate an API key for testing this playground
            programmatically. The key will be copied to your clipboard.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
