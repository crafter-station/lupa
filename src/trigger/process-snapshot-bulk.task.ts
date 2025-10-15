import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { processSnapshotTask } from "./process-snapshot.task";

// TODO: handle errors
export const processSnapshotBulkTask = schemaTask({
  id: "process-snapshot-bulk",
  schema: z.object({
    snapshotIds: z.string().array(),
  }),
  run: async ({ snapshotIds }) => {
    const FIRECRAWL_KEYS_COUNT = 6;

    for (
      let index = 0;
      index < snapshotIds.length;
      index += FIRECRAWL_KEYS_COUNT
    ) {
      const runs = [];

      for (let offset = 0; offset < FIRECRAWL_KEYS_COUNT; offset++) {
        const snapshotIndex = index + offset;
        if (snapshotIndex >= snapshotIds.length) break;

        const run = {
          payload: { snapshotId: snapshotIds[snapshotIndex] },
          ...(offset > 0 && { options: { tags: [`firecrawl_${offset + 1}`] } }),
        };

        runs.push(run);
      }

      await processSnapshotTask.batchTriggerAndWait(runs);
    }
  },
});
