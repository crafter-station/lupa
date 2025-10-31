"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarToggleButton({
  variant,
}: {
  variant: "expanded" | "collapsed";
}) {
  const handleToggle = () => {
    const layout = document.getElementById("app-layout");

    console.log(layout);

    if (!layout) return;

    const isSidebarCollapsed =
      layout.getAttribute("data-sidebar-collapsed") === "true";
    const newState = !isSidebarCollapsed;

    layout.setAttribute("data-sidebar-collapsed", String(newState));
  };

  if (variant === "collapsed") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          "ml-2 size-7 transition-opacity duration-300",

          "group-data-[sidebar-collapsed=false]/layout:opacity-0 group-data-[sidebar-collapsed=true]/layout:opacity-100 group-data-[sidebar-collapsed=false]/layout:pointer-events-none",
        )}
      >
        <ChevronRight className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={cn(
        "size-7 transition-opacity duration-300",

        "group-data-[sidebar-collapsed=true]/layout:opacity-0 group-data-[sidebar-collapsed=false]/layout:opacity-100 group-data-[sidebar-collapsed=true]/layout:pointer-events-none",
      )}
    >
      <ChevronLeft className="size-4 " />
    </Button>
  );
}
