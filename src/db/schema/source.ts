import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const SOURCE_TABLE = "source";

export const Source = pgTable(SOURCE_TABLE, {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  bucket_id: text("bucket_id").notNull(),

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

export const SourceInsertSchema = createInsertSchema(Source);
export const SourceSelectSchema = createSelectSchema(Source);

export type SourceSelect = typeof Source.$inferSelect;
export type SourceInsert = typeof Source.$inferInsert;
