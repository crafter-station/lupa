import { z } from "zod";
import { BaseConvexSchema } from "./_convex";

export const SOURCE_SNAPSHOT_AND_DEPLOYMENT_REL_TABLE =
  "source_snapshot_deployment_rel";

export const SourceSnapshotDeploymentRelInsertSchema = z.object({
  snapshotId: z.string(),
  deploymentId: z.string(),
});

export const SourceSnapshotDeploymentRelSelectSchema =
  SourceSnapshotDeploymentRelInsertSchema.extend(BaseConvexSchema);

export type SourceSnapshotDeploymentRelInsert = z.infer<
  typeof SourceSnapshotDeploymentRelInsertSchema
>;
export type SourceSnapshotDeploymentRelSelect = z.infer<
  typeof SourceSnapshotDeploymentRelSelectSchema
>;
