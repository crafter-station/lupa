import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { MetadataSchemaConfig } from "@/db/schema";

const defaultMetadataSchema = z.object({
  category: z
    .string()
    .optional()
    .describe("The category or topic of the content"),
  keywords: z.array(z.string()).optional().describe("Key terms and concepts"),
  summary: z.string().optional().describe("A brief summary of the content"),
  language: z
    .string()
    .optional()
    .describe("The primary language of the content"),
  contentType: z
    .string()
    .optional()
    .describe("Type of content (article, documentation, tutorial, etc.)"),
});

export type DefaultMetadata = z.infer<typeof defaultMetadataSchema>;

function zodSchemaFromJsonSchema(
  jsonSchema: Record<string, unknown>,
): z.ZodType {
  const properties = jsonSchema.properties as
    | Record<string, unknown>
    | undefined;

  if (!properties) {
    return z.record(z.string(), z.unknown());
  }

  const shape: Record<string, z.ZodType> = {};

  for (const [key, value] of Object.entries(properties)) {
    const prop = value as {
      type?: string;
      description?: string;
      items?: unknown;
    };

    let fieldSchema: z.ZodType;

    switch (prop.type) {
      case "string":
        fieldSchema = z.string();
        break;
      case "number":
        fieldSchema = z.number();
        break;
      case "boolean":
        fieldSchema = z.boolean();
        break;
      case "array":
        if (
          prop.items &&
          typeof prop.items === "object" &&
          "type" in prop.items
        ) {
          const itemsType = (prop.items as { type: string }).type;
          if (itemsType === "string") {
            fieldSchema = z.array(z.string());
          } else if (itemsType === "number") {
            fieldSchema = z.array(z.number());
          } else {
            fieldSchema = z.array(z.unknown());
          }
        } else {
          fieldSchema = z.array(z.unknown());
        }
        break;
      default:
        fieldSchema = z.unknown();
    }

    if (prop.description) {
      fieldSchema = fieldSchema.describe(prop.description);
    }

    fieldSchema = fieldSchema.optional();
    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

export async function extractMetadata(
  content: string,
  config?: MetadataSchemaConfig | null,
): Promise<Record<string, unknown>> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, skipping metadata extraction");
    return {};
  }

  try {
    const mode = config?.mode || "infer";
    const preview = content.slice(0, 2000);

    let schema: z.ZodType;

    if (mode === "custom" && config?.schema) {
      schema = zodSchemaFromJsonSchema(config.schema);
    } else {
      schema = defaultMetadataSchema;
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: `Extract metadata from this document:\n\n${preview}`,
        },
      ],
    });

    return object as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to extract metadata:", error);
    return {};
  }
}
