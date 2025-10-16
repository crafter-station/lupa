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
          className="[&_pre]:m-0 [&_pre]:overflow-auto [&_pre]:rounded-[0.3em] [&_pre]:p-4 [&_pre]:text-sm [&_code]:font-mono [&_code]:text-sm"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: needed
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="absolute top-2 right-2">
          <Button
            className="shrink-0"
            onClick={copyToClipboard}
            size="icon"
            variant="ghost"
          >
            <Icon size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
