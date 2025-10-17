import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const PROJECT_TABLE = "project";

export const Project = pgTable(PROJECT_TABLE, {
  id: text("id").primaryKey(),

  org_id: text("org_id").notNull(),

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

export const ProjectInsertSchema = createInsertSchema(Project);
export const ProjectSelectSchema = createSelectSchema(Project);

export type ProjectSelect = typeof Project.$inferSelect;
export type ProjectInsert = typeof Project.$inferInsert;
