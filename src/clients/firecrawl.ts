import Firecrawl from "@mendable/firecrawl-js";

export const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export const FIRECRAWL_API_KEYS = [
  process.env.FIRECRAWL_API_KEY_1,
  process.env.FIRECRAWL_API_KEY_2,
  process.env.FIRECRAWL_API_KEY_3,
  process.env.FIRECRAWL_API_KEY_4,
  process.env.FIRECRAWL_API_KEY_5,
  process.env.FIRECRAWL_API_KEY_6,
  process.env.FIRECRAWL_API_KEY_7,
];
