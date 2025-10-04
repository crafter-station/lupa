import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const VECTOR_INDEX_TABLE = "vector_index";

export const VectorIndex = pgTable(VECTOR_INDEX_TABLE, {
  id: text("id").primaryKey(),

  url: text("url").notNull(),
  token: text("token").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const VectorIndexInsertSchema = createInsertSchema(VectorIndex);
export const VectorIndexSelectSchema = createSelectSchema(VectorIndex);

export type VectorIndexSelect = typeof VectorIndex.$inferSelect;
export type VectorIndexInsert = typeof VectorIndex.$inferInsert;
