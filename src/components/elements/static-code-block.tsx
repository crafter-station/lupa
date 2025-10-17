"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StaticCodeBlockProps {
  html: string;
  code: string;
  className?: string;
}

export function StaticCodeBlock({
  html,
  code,
  className,
}: StaticCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border bg-background text-foreground",
        className,
      )}
    >
      <div className="relative">
        <div
          className="[&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:overflow-y-hidden [&_pre]:rounded-[0.3em] [&_pre]:p-3 sm:[&_pre]:p-4 [&_pre]:text-xs sm:[&_pre]:text-sm [&_code]:font-mono [&_code]:text-xs sm:[&_code]:text-sm [&_pre]:max-h-[400px] sm:[&_pre]:max-h-[500px]"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: needed
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
          <Button
            className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
            onClick={copyToClipboard}
            size="icon"
            variant="ghost"
          >
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
