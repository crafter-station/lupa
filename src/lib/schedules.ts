import { schedules } from "@trigger.dev/sdk/v3";
import type { RefreshFrequency } from "@/db/schema";

const CRON_PATTERNS: Record<RefreshFrequency, string> = {
  daily: "0 0 * * *",
  weekly: "0 0 * * 0",
  monthly: "0 0 1 * *",
};

export async function createDocumentSchedule(
  document_id: string,
  frequency: RefreshFrequency,
) {
  const cronPattern = CRON_PATTERNS[frequency];

  const schedule = await schedules.create({
    task: "refetch-website",
    cron: cronPattern,
    externalId: document_id,
    deduplicationKey: `doc-refresh-${document_id}`,
    timezone: "UTC",
  });

  return schedule;
}

export async function updateDocumentSchedule(
  schedule_id: string,
  document_id: string,
  frequency: RefreshFrequency,
) {
  const cronPattern = CRON_PATTERNS[frequency];

  const schedule = await schedules.update(schedule_id, {
    task: "refetch-website",
    cron: cronPattern,
    externalId: document_id,
  });

  return schedule;
}

export async function deleteDocumentSchedule(schedule_id: string) {
  const schedule = await schedules.del(schedule_id);
  return schedule;
}

export async function deactivateDocumentSchedule(schedule_id: string) {
  const schedule = await schedules.deactivate(schedule_id);
  return schedule;
}

export async function activateDocumentSchedule(schedule_id: string) {
  const schedule = await schedules.activate(schedule_id);
  return schedule;
}
