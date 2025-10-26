import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Project } from "./project";

export const API_KEY_TABLE = "api_key";

export const ApiKey = pgTable(API_KEY_TABLE, {
  id: text("id").primaryKey(),

  org_id: text("org_id").notNull(),

  project_id: text("project_id")
    .notNull()
    .references(() => Project.id, { onDelete: "cascade" }),

  name: text("name").notNull(),

  key_hash: text("key_hash").notNull().unique(),

  key_preview: text("key_preview").notNull(),

  is_active: boolean("is_active").notNull().default(true),

  last_used_at: timestamp("last_used_at", {
    withTimezone: true,
    mode: "string",
  }),

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

export const ApiKeyInsertSchema = createInsertSchema(ApiKey);
export const ApiKeySelectSchema = createSelectSchema(ApiKey);

export type ApiKeySelect = typeof ApiKey.$inferSelect;
export type ApiKeyInsert = typeof ApiKey.$inferInsert;
