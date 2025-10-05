import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const BUCKET_TABLE = "bucket";

export const Bucket = pgTable(BUCKET_TABLE, {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

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

export const BucketInsertSchema = createInsertSchema(Bucket);
export const BucketSelectSchema = createSelectSchema(Bucket);

export type BucketSelect = typeof Bucket.$inferSelect;
export type BucketInsert = typeof Bucket.$inferInsert;
