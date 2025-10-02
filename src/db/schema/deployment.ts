import z from "zod";
import { BaseConvexSchema } from "./_convex";

export const DEPLOYMENT_TABLE = "deployment";

export const DeploymentStatus = z.enum([
  "cancelled",
  "queued",
  "building",
  "error",
  "ready",
]);
export const DeploymentLogLevel = z.enum(["info", "warning", "error"]);

export const DeploymentSelectSchema = z.object({
  ...BaseConvexSchema,
  id: z.string(),
  bucketId: z.string(),
  status: DeploymentStatus,
  logs: z.array(
    z.object({
      message: z.string(),
      timestamp: z.number(),
      level: DeploymentLogLevel,
    }),
  ),
  changesDetected: z.boolean(),
  vectorIndexId: z.string().nullable(),
});

export const DeploymentInsertSchema = DeploymentSelectSchema.omit({
  _id: true,
  _creationTime: true,
});

export type DeploymentSelect = z.infer<typeof DeploymentSelectSchema>;
export type DeploymentInsert = z.infer<typeof DeploymentInsertSchema>;
