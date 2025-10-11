import { schedules } from "@trigger.dev/sdk/v3";
import type { RefreshFrequency } from "@/db/schema";

const CRON_PATTERNS: Record<RefreshFrequency, string> = {
  daily: "0 0 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
};

export async function createDocumentSchedule(
  documentId: string,
  frequency: RefreshFrequency,
) {
  const cronPattern = CRON_PATTERNS[frequency];

  const schedule = await schedules.create({
    task: "refetch-website",
    cron: cronPattern,
    externalId: documentId,
    deduplicationKey: `doc-refresh-${documentId}`,
    timezone: "UTC",
  });

  return schedule;
}

export async function updateDocumentSchedule(
  scheduleId: string,
  documentId: string,
  frequency: RefreshFrequency,
) {
  const cronPattern = CRON_PATTERNS[frequency];

  const schedule = await schedules.update(scheduleId, {
    task: "refetch-website",
    cron: cronPattern,
    externalId: documentId,
  });

  return schedule;
}

export async function deleteDocumentSchedule(scheduleId: string) {
  const schedule = await schedules.del(scheduleId);
  return schedule;
}

export async function deactivateDocumentSchedule(scheduleId: string) {
  const schedule = await schedules.deactivate(scheduleId);
  return schedule;
}

export async function activateDocumentSchedule(scheduleId: string) {
  const schedule = await schedules.activate(scheduleId);
  return schedule;
}
