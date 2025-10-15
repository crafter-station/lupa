import Firecrawl, { SdkError } from "@mendable/firecrawl-js";
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

// TODO: handle errors
export const parseWebsiteTask = schemaTask({
  id: "parse-website",
  schema: z.object({
    url: z.url(),
  }),
  retry: {
    maxAttempts: 5,
  },
  queue: {
    concurrencyLimit: 12,
  },
  run: async ({ url }, { ctx }) => {
    const firecrawlKeys = [
      process.env.FIRECRAWL_API_KEY,
      process.env.FIRECRAWL_API_KEY_2,
      process.env.FIRECRAWL_API_KEY_3,
      process.env.FIRECRAWL_API_KEY_4,
      process.env.FIRECRAWL_API_KEY_5,
      process.env.FIRECRAWL_API_KEY_6,
    ];

    let api_key = firecrawlKeys[0];

    for (let i = 1; i < firecrawlKeys.length; i++) {
      if (ctx.run.tags.includes(`firecrawl_${i + 1}`)) {
        api_key = firecrawlKeys[i];
        break;
      }
    }

    const fc = new Firecrawl({
      apiKey: api_key,
    });
    const doc = await fc.scrape(url, {
      timeout: 60_000,
      waitFor: 2_000,
      formats: [
        "markdown",
        {
          type: "screenshot",
          fullPage: true,
        },
      ],
    });

    return doc;
  },
  catchError: async ({ error }) => {
    if (error instanceof SdkError) {
      if (
        error.message.includes("Rate limit exceeded") ||
        error.name.includes("Rate limit exceeded")
      ) {
        return {
          retryDelayInMs: 60_000, // 1 min
        };
      }
    }

    return {
      retryDelayInMs: 10_000, // 10 sec
    };
  },
});
