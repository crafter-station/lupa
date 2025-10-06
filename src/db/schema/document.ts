import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const DOCUMENT_TABLE = "document";

export const Document = pgTable(DOCUMENT_TABLE, {
  id: text("id").primaryKey(),

  path: text("path").notNull().default("/"), // Path to the document
  name: text("name").notNull(),
  description: text("description"),

  project_id: text("project_id").notNull(),

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
