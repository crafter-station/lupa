import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { FIRECRAWL_API_KEYS } from "@/lib/firecrawl";
import { processSnapshotTask } from "./process-snapshot.task";

// TODO: handle errors
export const processSnapshotBulkTask = schemaTask({
  id: "process-snapshot-bulk",
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
          ...(offset > 0 && {
            options: {
              tags: [`firecrawl_${offset + 1}`],
              queue: `parsing-queue-${offset + 1}`,
            },
          }),
        };

        runs.push(run);
      }
    }

    await processSnapshotTask.batchTriggerAndWait(runs);
  },
});
