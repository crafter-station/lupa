import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const DOCUMENT_TABLE = "document";

export type MetadataSchemaConfig = {
  mode: "infer" | "custom";
  schema?: Record<string, unknown>;
};

export const RefreshFrequency = pgEnum("refresh_frequency_enum", [
  "daily",
  "weekly",
  "monthly",
]);
export type RefreshFrequency = (typeof RefreshFrequency.enumValues)[number];

export const Document = pgTable(DOCUMENT_TABLE, {
  id: text("id").primaryKey(),

  // Path to the folder that contains the document.
  // Starts and ends with a slash
  folder: text("folder").notNull().default("/"),

  name: text("name").notNull(),
  description: text("description"),

  project_id: text("project_id").notNull(),

  metadata_schema: jsonb("metadata_schema").$type<MetadataSchemaConfig>(),

  refresh_enabled: boolean("refresh_enabled").notNull().default(false),
  refresh_frequency: RefreshFrequency("refresh_frequency"),
  refresh_schedule_id: text("refresh_schedule_id"),

  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
});

export const DocumentInsertSchema = createInsertSchema(Document);
export const DocumentSelectSchema = createSelectSchema(Document);

export type DocumentSelect = typeof Document.$inferSelect;
export type DocumentInsert = typeof Document.$inferInsert;

export const MetadataSchemaConfigSchema = z.object({
  mode: z.enum(["infer", "custom"]),
  schema: z.record(z.string(), z.unknown()).optional(),
});
