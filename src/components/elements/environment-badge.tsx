import { Badge } from "@/components/ui/badge";
import type { DeploymentEnvironment } from "@/db/schema";
import { cn } from "@/lib/utils";

interface EnvironmentBadgeProps {
  environment: DeploymentEnvironment | null;
  className?: string;
}

const environmentConfig: Record<
  "production" | "staging" | "none",
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    className: string;
  }
> = {
  production: {
    label: "Production",
    variant: "default",
    className:
      "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20",
  },
  staging: {
    label: "Staging",
    variant: "secondary",
    className:
      "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/20",
  },
  none: {
    label: "No Environment",
    variant: "outline",
    className:
      "bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-500/20",
  },
};

export function EnvironmentBadge({
  environment,
  className,
}: EnvironmentBadgeProps) {
  const config = environmentConfig[environment ?? "none"];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
