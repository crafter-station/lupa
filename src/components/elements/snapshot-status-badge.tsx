import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { SnapshotSelect } from "@/db";
import { cn } from "@/lib/utils";

interface SnapshotStatusBadgeProps {
  snapshot: SnapshotSelect;
  className?: string;
}

export function SnapshotStatusBadge({
  snapshot,
  className,
}: SnapshotStatusBadgeProps) {
  const getStatusInfo = () => {
    switch (snapshot.status) {
      case "queued":
        return {
          icon: Clock,
          label: "Queued",
          color:
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
        };
      case "running":
        return {
          icon: Loader2,
          label: "Processing",
          color:
            "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
          animate: true,
        };
      case "success":
        return {
          icon: CheckCircle2,
          label: "Success",
          color:
            "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
        };
      case "error":
        return {
          icon: XCircle,
          label: "Error",
          color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
        };
      default:
        return {
          icon: Clock,
          label: "Unknown",
          color:
            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        };
    }
  };

  const { icon: Icon, label, color, animate } = getStatusInfo();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
        color,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", animate && "animate-spin")} />
      <span>{label}</span>
    </span>
  );
}
