import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const VECTOR_INDEX_TABLE = "vector_index";

export const VectorIndex = pgTable(VECTOR_INDEX_TABLE, {
  id: text("id").primaryKey(),

  url: text("url").notNull(),
  token: text("token").notNull(),

  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const VectorIndexInsertSchema = createInsertSchema(VectorIndex);
export const VectorIndexSelectSchema = createSelectSchema(VectorIndex);

export type VectorIndexSelect = typeof VectorIndex.$inferSelect;
export type VectorIndexInsert = typeof VectorIndex.$inferInsert;
