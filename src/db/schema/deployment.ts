import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

export const DEPLOYMENT_TABLE = "deployment";

export const DeploymentStatus = pgEnum("deployment_status_enum", [
  "cancelled",
  "queued",
  "building",
  "error",
  "ready",
]);

export type DeploymentStatus = (typeof DeploymentStatus.enumValues)[number];

export const DeploymentLogLevel = pgEnum("deployment_log_level_enum", [
  "info",
  "warning",
  "error",
]);

export const DeploymentLogLevelSchema = createSelectSchema(DeploymentLogLevel);

export type DeploymentLogLevel = (typeof DeploymentLogLevel.enumValues)[number];

export const DeploymentLogSchema = z.object({
  message: z.string(),
  timestamp: z.number(),
  level: DeploymentLogLevelSchema,
});

export type DeploymentLog = z.infer<typeof DeploymentLogSchema>;

export const Deployment = pgTable(DEPLOYMENT_TABLE, {
  id: text("id").primaryKey(),

  project_id: text("project_id").notNull(),

  vector_index_id: text("vector_index_id"),

  status: DeploymentStatus("status").notNull(),
  logs: jsonb("logs")
    .$type<DeploymentLog[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),

  created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const DeploymentInsertSchema = createInsertSchema(Deployment);
export const DeploymentSelectSchema = createSelectSchema(Deployment);

export type DeploymentSelect = typeof Deployment.$inferSelect;
export type DeploymentInsert = typeof Deployment.$inferInsert;
