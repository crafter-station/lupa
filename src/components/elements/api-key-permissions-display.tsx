import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  Rocket,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import type { ApiKeyEnvironment, ApiKeyType } from "@/db/schema/api-key";
import { cn } from "@/lib/utils";

interface ApiKeyPermissionsDisplayProps {
  keyType: ApiKeyType;
  environment: ApiKeyEnvironment;
  className?: string;
}

interface PermissionConfig {
  id: string;
  title: string;
  descriptionFn: (env: string) => string;
  icon: typeof Search;
  requires: ApiKeyType | null;
}

const ALL_PERMISSIONS: PermissionConfig[] = [
  {
    id: "search",
    title: "Search deployment by default",
    descriptionFn: (env) =>
      `Queries target ${env} unless overridden with Deployment-Id header`,
    icon: Search,
    requires: null,
  },
  {
    id: "read",
    title: "Read project data",
    descriptionFn: () => "Access project configuration and metadata",
    icon: Eye,
    requires: null,
  },
  {
    id: "createDocuments",
    title: "Create/update documents",
    descriptionFn: () => "Upload new content and modify existing documents",
    icon: FileText,
    requires: "sk",
  },
  {
    id: "deleteDocuments",
    title: "Delete documents",
    descriptionFn: () => "Remove documents from your project",
    icon: Trash2,
    requires: "sk",
  },
  {
    id: "createSnapshots",
    title: "Create snapshots",
    descriptionFn: () => "Generate new content snapshots for deployment",
    icon: Camera,
    requires: "sk",
  },
  {
    id: "createDeployments",
    title: "Create deployments",
    descriptionFn: () => "Deploy content to any environment",
    icon: Rocket,
    requires: "sk",
  },
];

export function ApiKeyPermissionsDisplay({
  keyType,
  environment,
  className,
}: ApiKeyPermissionsDisplayProps) {
  const isSecretKey = keyType === "sk";
  const envLabel = environment === "live" ? "production" : "staging";

  const permissionsWithState = ALL_PERMISSIONS.map((perm) => ({
    ...perm,
    enabled: perm.requires === null || perm.requires === keyType,
    description: perm.descriptionFn(envLabel),
  }));

  const showWarning = isSecretKey && environment === "live";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">This key will be able to:</h4>
      </div>

      <div className="space-y-2">
        {permissionsWithState.map((permission) => {
          const Icon = permission.icon;
          const PermissionIcon = permission.enabled ? CheckCircle2 : XCircle;

          return (
            <div
              key={permission.id}
              className={cn(
                "flex items-start gap-3 rounded-lg p-2 transition-colors",
                permission.enabled ? "hover:bg-muted/50" : "opacity-60",
              )}
            >
              <PermissionIcon
                className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  permission.enabled
                    ? "text-green-600"
                    : "text-muted-foreground/40",
                )}
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      permission.enabled
                        ? "text-foreground"
                        : "text-muted-foreground/40",
                    )}
                  />
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !permission.enabled && "text-muted-foreground",
                    )}
                  >
                    {permission.title}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-xs",
                    permission.enabled
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60",
                  )}
                >
                  {permission.description}
                  {!permission.enabled && " (requires secret key)"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {showWarning && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Keep this key secure
            </p>
            <p className="text-xs text-orange-800 dark:text-orange-200">
              This key has full write access to your production environment.
              Never expose it in client-side code or public repositories.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
        <Eye className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {!isSecretKey
              ? "Safe for client-side use"
              : "Default targeting with override"}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {!isSecretKey
              ? "Public keys are read-only and safe to use in frontend applications, mobile apps, and browser extensions."
              : `By default, this key targets ${envLabel} deployments. You can override this by including a Deployment-Id header in your requests to access any other deployment.`}
          </p>
        </div>
      </div>
    </div>
  );
}
