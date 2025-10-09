import {
  FileSpreadsheet,
  FileText,
  FileType,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { SnapshotSelect } from "@/db";
import { cn } from "@/lib/utils";

interface FileTypeBadgeProps {
  snapshot: SnapshotSelect;
  showLabel?: boolean;
  className?: string;
}

interface FileTypeInfo {
  icon: LucideIcon;
  label: string;
  color: string;
}

function getFileTypeInfo(snapshot: SnapshotSelect): FileTypeInfo {
  if (snapshot.type === "website") {
    return {
      icon: Globe,
      label: "Website",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    };
  }

  const fileName =
    (snapshot.metadata as { file_name?: string })?.file_name || "";
  const extension = fileName.toLowerCase().split(".").pop() || "";

  switch (extension) {
    case "pdf":
      return {
        icon: FileType,
        label: "PDF",
        color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
      };
    case "doc":
    case "docx":
      return {
        icon: FileText,
        label: "Word",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
      };
    case "xls":
    case "xlsx":
      return {
        icon: FileSpreadsheet,
        label: "Excel",
        color:
          "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
      };
    case "csv":
      return {
        icon: FileSpreadsheet,
        label: "CSV",
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "ppt":
    case "pptx":
      return {
        icon: FileType,
        label: "PowerPoint",
        color:
          "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
      };
    case "txt":
      return {
        icon: FileText,
        label: "Text",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      };
    case "md":
      return {
        icon: FileText,
        label: "Markdown",
        color:
          "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
      };
    case "html":
      return {
        icon: FileType,
        label: "HTML",
        color:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
      };
    case "json":
      return {
        icon: FileType,
        label: "JSON",
        color: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
      };
    default:
      return {
        icon: FileText,
        label: "File",
        color:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
  }
}

export function FileTypeBadge({
  snapshot,
  showLabel = true,
  className,
}: FileTypeBadgeProps) {
  const { icon: Icon, label, color } = getFileTypeInfo(snapshot);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
        color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

export function FileTypeIcon({
  snapshot,
  className,
}: {
  snapshot: SnapshotSelect;
  className?: string;
}) {
  const { icon: Icon, color } = getFileTypeInfo(snapshot);

  return (
    <div className={cn("flex items-center", className)}>
      <Icon className={cn("h-4 w-4", color.split(" ")[1])} />
    </div>
  );
}
