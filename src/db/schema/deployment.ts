import {
  boolean,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
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

  bucketId: text("bucket_id").notNull(),

  vectorIndexId: text("vector_index_id"),

  status: DeploymentStatus("status").notNull(),
  logs: jsonb("logs").array().notNull().default([]).$type<DeploymentLog[]>(),
  changesDetected: boolean("changes_detected").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const DeploymentInsertSchema = createInsertSchema(Deployment);
export const DeploymentSelectSchema = createSelectSchema(Deployment);

export type DeploymentSelect = typeof Deployment.$inferSelect;
export type DeploymentInsert = typeof Deployment.$inferInsert;
