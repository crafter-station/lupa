"use client";

import { Key, Plus } from "lucide-react";
import { useState } from "react";
import { CreateApiKeyDialog } from "@/components/elements/api-key-dialog";
import { ApiKeyList } from "@/components/elements/api-key-list";
import { Button } from "@/components/ui/button";
import { getAPIBaseURL } from "@/lib/utils";

interface ApiKey {
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
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(preloadedApiKeys);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshKeys = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/api-keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error("Failed to refresh API keys:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">API Keys</h2>
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
            {apiKeys.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshKeys}
                disabled={refreshing}
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            )}
          </div>

          <ApiKeyList
            apiKeys={apiKeys}
            projectId={projectId}
            onDelete={refreshKeys}
          />
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
        onSuccess={refreshKeys}
      />
    </div>
  );
}
