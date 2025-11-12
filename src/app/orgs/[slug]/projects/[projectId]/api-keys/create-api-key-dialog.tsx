"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  FlaskConical,
  Lock,
  Rocket,
} from "lucide-react";
import { useState } from "react";
import { ApiKeyPermissionsDisplay } from "@/components/elements/api-key-permissions-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import type { ApiKeyEnvironment, ApiKeyType } from "@/db/schema/api-key";
import { cn } from "@/lib/utils";
import type { ApiKey } from "./client";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  projectId,
}: CreateApiKeyDialogProps) {
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>("test");
  const [keyType, setKeyType] = useState<ApiKeyType>("sk");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const { mutate, isPending, data, error, reset } = useMutation({
    mutationFn: async (params: {
      name: string;
      environment: ApiKeyEnvironment;
      keyType: ApiKeyType;
    }) => {
      const response = await fetch(`/api/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name.trim(),
          projectId,
          environment: params.environment,
          keyType: params.keyType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create API key");
      }

      const data = await response.json();
      return data as {
        id: string;
        name: string;
        api_key: string;
        key_preview: string;
        environment: ApiKeyEnvironment;
        key_type: ApiKeyType;
        created_at: string;
        last_used_at: null;
      };
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["api-keys", projectId] });

      const previousKeys = queryClient.getQueryData<ApiKey[]>([
        "api-keys",
        projectId,
      ]);

      queryClient.setQueryData<ApiKey[]>(["api-keys", projectId], (old) =>
        old
          ? [
              ...old,
              {
                id: "temp",
                name: params.name,
                key_preview: "",
                environment: params.environment,
                key_type: params.keyType,
                created_at: new Date().toISOString(),
                last_used_at: null,
              },
            ]
          : [
              {
                id: "temp",
                name: params.name,
                key_preview: "",
                environment: params.environment,
                key_type: params.keyType,
                created_at: new Date().toISOString(),
                last_used_at: null,
              },
            ],
      );

      return { previousKeys };
    },
    onError: (_err, _params, context) => {
      queryClient.setQueryData<ApiKey[]>(
        ["api-keys", projectId],
        context?.previousKeys,
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ApiKey[]>(["api-keys", projectId], (old) =>
        old
          ? [
              ...old.filter((k) => k.id !== "temp"),
              {
                id: data.id,
                name: data.name,
                key_preview: data.key_preview,
                environment: data.environment,
                key_type: data.key_type,
                created_at: data.created_at,
                last_used_at: null,
              },
            ]
          : [
              {
                id: data.id,
                name: data.name,
                key_preview: data.key_preview,
                environment: data.environment,
                key_type: data.key_type,
                created_at: data.created_at,
                last_used_at: null,
              },
            ],
      );

      navigator.clipboard.writeText(data.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
  });

  const handleClose = () => {
    setEnvironment("test");
    setKeyType("sk");
    setName("");
    setCopied(false);
    reset();
    onOpenChange(false);
  };

  const handleCreate = () => {
    mutate({ name, environment, keyType });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {!data?.api_key ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Configure your API key with the appropriate permissions for your
                use case
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    1. Choose Default Target
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select which deployment this key targets by default (can be
                    overridden with Deployment-Id header)
                  </p>
                </div>

                <RadioGroup
                  value={environment}
                  onValueChange={(value) =>
                    setEnvironment(value as ApiKeyEnvironment)
                  }
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem
                      value="test"
                      id="env-test"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="env-test"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">Staging</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        Targets staging deployment by default. Override with
                        Deployment-Id header.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem
                      value="live"
                      id="env-live"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="env-live"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Production</span>
                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        Targets production deployment by default. Use with
                        caution.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    2. Choose Access Level
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Select the access level for this key
                  </p>
                </div>

                <RadioGroup
                  value={keyType}
                  onValueChange={(value) => setKeyType(value as ApiKeyType)}
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="sk" id="type-sk" className="mt-1" />
                    <Label
                      htmlFor="type-sk"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">
                          Secret Key (Read+Write)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        Full access to all operations. Keep secure - never
                        expose in client-side code.
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="pk" id="type-pk" className="mt-1" />
                    <Label
                      htmlFor="type-pk"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">
                          Public Key (Read-only)
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        Read-only access. Safe for client-side applications,
                        mobile apps, and browser extensions.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-base font-semibold">
                    3. Permissions Summary
                  </Label>
                </div>

                <ApiKeyPermissionsDisplay
                  keyType={keyType}
                  environment={environment}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-base font-semibold">
                    4. Name Your Key
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose a descriptive name to identify this key
                  </p>
                </div>

                <Input
                  id="name"
                  placeholder={`${environment === "live" ? "Production" : "Staging"} ${keyType === "sk" ? "Backend" : "Frontend"} Key`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim() && !isPending) {
                      handleCreate();
                    }
                  }}
                  className={cn(error && "border-destructive")}
                />
                {error && (
                  <p className="text-sm text-destructive">
                    {error instanceof Error
                      ? error.message
                      : "An error occurred"}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || isPending}
              >
                {isPending ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Make sure to copy your API key now. You won&apos;t be able to
                see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <div className="text-sm font-medium">{data.name}</div>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={data?.api_key}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(data.api_key);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Copied to clipboard
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
