import z from "zod";
import { BaseConvexSchema } from "./convex";

export const DeploymentStatusSchema = z.enum([
  "cancelled",
  "queued",
  "building",
  "error",
  "ready",
]);
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;

export const DeploymentLogLevelSchema = z.enum(["info", "warning", "error"]);
export type DeploymentLogLevel = z.infer<typeof DeploymentLogLevelSchema>;

export const DeploymentSchemaSelect = z.object({
  ...BaseConvexSchema,

  id: z.string(),
  bucketId: z.string(),
  status: DeploymentStatusSchema,

  logs: z.array(
    z.object({
      message: z.string(),
      timestamp: z.number(),
      level: DeploymentLogLevelSchema,
    }),
  ),

  changesDetected: z.boolean(), // We will check if some sources have changed since the last deployment.

  vectorIndexId: z.string().nullable(), //  If no changes are detected, there is no need to create a new vector index
});

export const DeploymentSchemaInsert = DeploymentSchemaSelect.omit({
  _id: true,
  _creationTime: true,
});

export type DeploymentSelect = z.infer<typeof DeploymentSchemaSelect>;
export type DeploymentInsert = z.infer<typeof DeploymentSchemaInsert>;
