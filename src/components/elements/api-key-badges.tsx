import { Eye, FlaskConical, Lock, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ApiKeyEnvironment, ApiKeyType } from "@/db/schema/api-key";
import { cn } from "@/lib/utils";

interface EnvironmentKeyBadgeProps {
  environment: ApiKeyEnvironment;
  className?: string;
}

interface KeyTypeBadgeProps {
  type: ApiKeyType;
  className?: string;
}

const environmentConfig: Record<
  ApiKeyEnvironment,
  {
    label: string;
    icon: typeof Rocket;
    className: string;
  }
> = {
  live: {
    label: "Production",
    icon: Rocket,
    className:
      "bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20",
  },
  test: {
    label: "Staging",
    icon: FlaskConical,
    className:
      "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/20",
  },
};

const keyTypeConfig: Record<
  ApiKeyType,
  {
    label: string;
    icon: typeof Lock;
    className: string;
  }
> = {
  sk: {
    label: "Secret Key",
    icon: Lock,
    className:
      "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20",
  },
  pk: {
    label: "Public Key",
    icon: Eye,
    className:
      "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/20",
  },
};

export function EnvironmentKeyBadge({
  environment,
  className,
}: EnvironmentKeyBadgeProps) {
  const config = environmentConfig[environment];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {environment}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function KeyTypeBadge({ type, className }: KeyTypeBadgeProps) {
  const config = keyTypeConfig[type];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {type}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
