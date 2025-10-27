"use client";

import { useQuery } from "@tanstack/react-query";
import { Key, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAPIBaseURL } from "@/lib/utils";
import { ApiKeyList } from "./api-key-list";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

export interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  last_used_at: string | null;
  created_at: string;
}

interface ApiKeysClientProps {
  projectId: string;
  preloadedApiKeys: ApiKey[];
}

export function ApiKeysClient({
  projectId,
  preloadedApiKeys,
}: ApiKeysClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    data: apiKeys,
    status,
    fetchStatus,
  } = useQuery<ApiKey[]>({
    queryKey: ["api-keys", projectId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/api-keys?projectId=${projectId}`);
        if (!response.ok) {
          throw new Error("not ok");
        }
        const data = await response.json();
        return data;
      } catch {
        throw new Error("unknown error");
      }
    },
    initialData: preloadedApiKeys,
    enabled: !!projectId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2
            className="text-2xl font-bold tracking-tight"
            key={JSON.stringify({ status, fetchStatus })}
          >
            API Keys {JSON.stringify({ status, fetchStatus })}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys to authenticate programmatic access to your project.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Key
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Use API keys to authenticate requests to Lupa endpoints like
              search, upload, and retrieval. Include the key in the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Authorization
              </code>{" "}
              header as{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                Bearer YOUR_API_KEY
              </code>
              .
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Active Keys</h4>
          </div>

          <ApiKeyList apiKeys={apiKeys} projectId={projectId} />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Example Usage</h3>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Search</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              <code>{`curl -X GET "${getAPIBaseURL(projectId)}/search/?query=YOUR_QUERY" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
            </pre>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Create Document</p>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              <code>{`curl -X POST "${getAPIBaseURL(projectId)}/documents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: multipart/form-data" \\
  -F "project_id=${projectId}" \\
  -F "name=My Document" \\
  -F "snapshot.type=website" \\
  -F "snapshot.url=https://example.com"`}</code>
            </pre>
          </div>
        </div>
      </div>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
      />
    </div>
  );
}
