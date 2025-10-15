import Firecrawl, { SdkError } from "@mendable/firecrawl-js";
import { queue, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { FIRECRAWL_API_KEYS } from "@/lib/firecrawl";

export const parseWebsiteTask = schemaTask({
  id: "parse-website",
  schema: z.object({
    url: z.url(),
  }),
  retry: {
    maxAttempts: 5,
  },
  queue: {
    concurrencyLimit: 1,
  },
  run: async ({ url }, { ctx }) => {
    let api_key = process.env.FIRECRAWL_API_KEY;

    for (let i = 0; i < FIRECRAWL_API_KEYS.length; i++) {
      if (ctx.queue.name === `website-parsing-queue-${i + 1}`) {
        api_key = FIRECRAWL_API_KEYS[i];
        break;
      }
    }

    const fc = new Firecrawl({
      apiKey: api_key,
    });

    const doc = await fc.scrape(url, {
      timeout: 30_000,
      waitFor: 1_000,
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

export const websiteParsingQueue1 = queue({
  name: "website-parsing-queue-1",
  concurrencyLimit: 1,
});

export const websiteParsingQueue2 = queue({
  name: "website-parsing-queue-2",
  concurrencyLimit: 1,
});

export const websiteParsingQueue3 = queue({
  name: "website-parsing-queue-3",
  concurrencyLimit: 1,
});

export const websiteParsingQueue4 = queue({
  name: "website-parsing-queue-4",
  concurrencyLimit: 1,
});

export const websiteParsingQueue5 = queue({
  name: "website-parsing-queue-5",
  concurrencyLimit: 1,
});

export const websiteParsingQueue6 = queue({
  name: "website-parsing-queue-6",
  concurrencyLimit: 1,
});

export const websiteParsingQueue7 = queue({
  name: "website-parsing-queue-7",
  concurrencyLimit: 1,
});
