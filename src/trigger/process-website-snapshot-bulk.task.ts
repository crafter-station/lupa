import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod/v3";
import { FIRECRAWL_API_KEYS } from "@/clients/firecrawl";
import { processSnapshotTask } from "./process-snapshot.task";

// TODO: handle errors
export const processWebsiteSnapshotBulkTask = schemaTask({
  id: "process-website-snapshot-bulk",
  schema: z.object({
    snapshotIds: z.string().array(),
  }),
  run: async ({ snapshotIds }) => {
    const runs = [];
    for (
      let index = 0;
      index < snapshotIds.length;
      index += FIRECRAWL_API_KEYS.length
    ) {
      for (let offset = 0; offset < FIRECRAWL_API_KEYS.length; offset++) {
        const snapshotIndex = index + offset;
        if (snapshotIndex >= snapshotIds.length) break;

        const run = {
          payload: { snapshotId: snapshotIds[snapshotIndex] },
          options: {
            queue: `parsing-queue-${offset + 1}`,
          },
        };

        runs.push(run);
      }
    }

    await processSnapshotTask.batchTriggerAndWait(runs);
  },
});
