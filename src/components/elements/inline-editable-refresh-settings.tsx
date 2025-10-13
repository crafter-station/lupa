"use client";

import { Check, Pencil, RefreshCw, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RefreshFrequency } from "@/db";
import { cn } from "@/lib/utils";

interface InlineEditableRefreshSettingsProps {
  refreshEnabled: boolean;
  refreshFrequency: RefreshFrequency | null;
  onSave: (
    enabled: boolean,
    frequency: RefreshFrequency | null,
  ) => void | Promise<void>;
  className?: string;
}

export function InlineEditableRefreshSettings({
  refreshEnabled,
  refreshFrequency,
  onSave,
  className,
}: InlineEditableRefreshSettingsProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState<RefreshFrequency | "none">(
    refreshEnabled && refreshFrequency ? refreshFrequency : "none",
  );
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setEditValue(
      refreshEnabled && refreshFrequency ? refreshFrequency : "none",
    );
  }, [refreshEnabled, refreshFrequency]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const enabled = editValue !== "none";
      const frequency = enabled ? (editValue as RefreshFrequency) : null;
      await onSave(enabled, frequency);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setEditValue(
        refreshEnabled && refreshFrequency ? refreshFrequency : "none",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(
      refreshEnabled && refreshFrequency ? refreshFrequency : "none",
    );
    setIsEditing(false);
  };

  const getDisplayText = () => {
    if (!refreshEnabled || !refreshFrequency) {
      return "No automatic refresh";
    }
    switch (refreshFrequency) {
      case "daily":
        return "Daily (midnight UTC)";
      case "weekly":
        return "Weekly (Sundays at midnight UTC)";
      case "monthly":
        return "Monthly (1st day at midnight UTC)";
      default:
        return "No automatic refresh";
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor="refresh-frequency">
          Automatically refetch this website?
        </Label>
        <Select
          value={editValue}
          onValueChange={(value) =>
            setEditValue(value as RefreshFrequency | "none")
          }
          disabled={isSaving}
        >
          <SelectTrigger id="refresh-frequency">
            <SelectValue placeholder="Select refresh frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No automatic refresh</SelectItem>
            <SelectItem value="daily">Daily (midnight UTC)</SelectItem>
            <SelectItem value="weekly">
              Weekly (Sundays at midnight UTC)
            </SelectItem>
            <SelectItem value="monthly">
              Monthly (1st day at midnight UTC)
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/50 group",
        className,
      )}
    >
      <RefreshCw className="size-4" />
      <span>{getDisplayText()}</span>
      <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}
