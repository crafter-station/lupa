"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  LoaderIcon,
  Rocket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UpdateDeploymentEnvironmentAction } from "./action";

type DialogAction = "promote-staging" | "promote-production" | "demote";

interface ChangeEnvironmentClientProps {
  projectId: string;
  deploymentId: string;
  currentEnvironment: "production" | "staging" | null;
  currentStatus: string;
  productionDeploymentId: string | null;
  stagingDeploymentId: string | null;
}

export function ChangeEnvironmentClient({
  projectId,
  deploymentId,
  currentEnvironment,
  currentStatus,
  productionDeploymentId,
  stagingDeploymentId,
}: ChangeEnvironmentClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);

  const isProduction = currentEnvironment === "production";
  const isStaging = currentEnvironment === "staging";
  const hasNoEnvironment = !currentEnvironment;
  const isReady = currentStatus === "ready";

  const getTargetEnvironment = (
    action: DialogAction | null,
  ): "production" | "staging" | null => {
    if (action === "promote-production") return "production";
    if (action === "promote-staging") return "staging";
    if (action === "demote") {
      return currentEnvironment === "production" ? "staging" : null;
    }
    return null;
  };

  const [state, formAction, pending] = useActionState(
    UpdateDeploymentEnvironmentAction,
    {
      ok: false,
      error: "",
      form_data: {
        projectId,
        deploymentId,
        environment: getTargetEnvironment(dialogAction),
      },
    },
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.action_data.message);
      setDialogOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  const handleActionSelect = (action: DialogAction) => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  const getDialogContent = () => {
    if (dialogAction === "promote-production") {
      return {
        title: "🚀 Promote to Production?",
        description:
          "This deployment will become the active production deployment.",
        items: [
          `Set ${deploymentId} as the production deployment`,
          ...(productionDeploymentId
            ? [
                `Demote ${productionDeploymentId} (current production) to staging`,
              ]
            : []),
          "All API search requests will use this deployment",
          "Changes take effect immediately",
        ],
        buttonText: "Promote to Production",
        buttonClassName: "bg-green-600 hover:bg-green-700 text-white",
      };
    }

    if (dialogAction === "promote-staging") {
      return {
        title: "Promote to Staging?",
        description:
          "This deployment will become the active staging deployment.",
        items: [
          `Set ${deploymentId} as the staging deployment`,
          ...(stagingDeploymentId
            ? [
                `Demote ${stagingDeploymentId} (current staging) to no environment`,
              ]
            : []),
          "Test API keys will use this deployment",
        ],
        buttonText: "Promote to Staging",
        buttonClassName: "bg-yellow-600 hover:bg-yellow-700 text-white",
      };
    }

    if (dialogAction === "demote") {
      const targetLabel =
        currentEnvironment === "production" ? "Staging" : "No Environment";

      return {
        title: `Demote from ${currentEnvironment === "production" ? "Production" : "Staging"}?`,
        description: `This deployment will be moved to ${targetLabel.toLowerCase()}.`,
        items: [
          `Move ${deploymentId} to ${targetLabel.toLowerCase()}`,
          ...(currentEnvironment === "production"
            ? [
                "Live API keys will no longer use this deployment by default",
                "Test API keys will use this deployment instead",
              ]
            : [
                "Test API keys will no longer use this deployment by default",
                "This deployment will be unassigned from any environment",
              ]),
          "Changes take effect immediately",
        ],
        buttonText: `Demote from ${currentEnvironment === "production" ? "Production" : "Staging"}`,
        buttonClassName:
          currentEnvironment === "production"
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "",
      };
    }

    return null;
  };

  const dialogContent = getDialogContent();
  const targetEnvironment = getTargetEnvironment(dialogAction);

  if (!isReady) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions
            <ChevronDown className="ml-2 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {hasNoEnvironment && (
            <DropdownMenuItem
              onClick={() => handleActionSelect("promote-staging")}
            >
              <ArrowUp className="mr-2 size-4" />
              Promote to Staging
            </DropdownMenuItem>
          )}

          {isStaging && (
            <>
              <DropdownMenuItem
                onClick={() => handleActionSelect("promote-production")}
              >
                <Rocket className="mr-2 size-4" />
                Promote to Production
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleActionSelect("demote")}>
                <ArrowDown className="mr-2 size-4" />
                Demote from Staging
              </DropdownMenuItem>
            </>
          )}

          {isProduction && (
            <DropdownMenuItem
              onClick={() => handleActionSelect("demote")}
              variant="destructive"
            >
              <ArrowDown className="mr-2 size-4" />
              Demote from Production
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogContent && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <form action={formAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="deploymentId" value={deploymentId} />
              <input
                type="hidden"
                name="environment"
                value={targetEnvironment || "null"}
              />
              <DialogHeader>
                <DialogTitle>{dialogContent.title}</DialogTitle>
                <DialogDescription>
                  {dialogContent.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <p className="text-sm font-medium">This will:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  {dialogContent.items.map((item) => (
                    <li key={item}>
                      {item.includes(deploymentId) ||
                      item.includes(productionDeploymentId || "") ||
                      item.includes(stagingDeploymentId || "") ? (
                        <>
                          {item.split(deploymentId)[0]}
                          {item.includes(deploymentId) && (
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {deploymentId}
                            </code>
                          )}
                          {item.split(deploymentId)[1] ||
                            item.split(
                              productionDeploymentId ||
                                stagingDeploymentId ||
                                "",
                            )[1]}
                        </>
                      ) : (
                        item
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  className={dialogContent.buttonClassName}
                >
                  {pending ? (
                    <>
                      Processing
                      <LoaderIcon className="ml-2 size-4 animate-spin" />
                    </>
                  ) : (
                    dialogContent.buttonText
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
