"use client";

import { Eye, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { EnvironmentKeyBadge } from "@/components/elements/api-key-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  environment: "live" | "test";
  key_type: "sk" | "pk";
  last_used_at: string | null;
  created_at: string;
}

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  projectId: string;
}

export function ApiKeyList({ projectId, apiKeys }: ApiKeyListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (keyId: string, keyName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(keyId);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/api-keys/${keyId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete API key");
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      alert("Failed to delete API key");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return formatDate(dateString);
  };

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Default Target</TableHead>
            <TableHead>Access Level</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => {
            const isReadOnly = key.key_type === "pk";
            const AccessIcon = isReadOnly ? Eye : Lock;

            return (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <EnvironmentKeyBadge environment={key.environment} />
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      isReadOnly
                        ? "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/20"
                        : "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20",
                    )}
                  >
                    <AccessIcon className="h-3 w-3" />
                    {isReadOnly ? "Read-only" : "Read+Write"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {key.key_preview}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <time>{formatRelativeTime(key.last_used_at)}</time>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <time>{formatDate(key.created_at)}</time>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === key.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(key.id, key.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
