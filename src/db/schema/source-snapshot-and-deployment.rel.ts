import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Deployment } from "./deployment";
import { SourceSnapshot } from "./source-snapshot";

export const SOURCE_SNAPSHOT_AND_DEPLOYMENT_REL_TABLE =
  "source_snapshot_and_deployment_rel";

export const SourceSnapshotDeploymentRel = pgTable(
  SOURCE_SNAPSHOT_AND_DEPLOYMENT_REL_TABLE,
  {
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => SourceSnapshot.id, { onDelete: "cascade" }),

    deploymentId: text("deployment_id")
      .notNull()
      .references(() => Deployment.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.snapshotId, t.deploymentId] }),
  }),
);

export const SourceSnapshotDeploymentRelRelations = relations(
  SourceSnapshotDeploymentRel,
  ({ one }) => ({
    snapshot: one(SourceSnapshot, {
      fields: [SourceSnapshotDeploymentRel.snapshotId],
      references: [SourceSnapshot.id],
    }),
    deployment: one(Deployment, {
      fields: [SourceSnapshotDeploymentRel.deploymentId],
      references: [Deployment.id],
    }),
  }),
);

export const SourceSnapshotDeploymentRelInsertSchema = createInsertSchema(
  SourceSnapshotDeploymentRel,
);
export const SourceSnapshotDeploymentRelSelectSchema = createSelectSchema(
  SourceSnapshotDeploymentRel,
);

export type SourceSnapshotDeploymentRelInsert =
  typeof SourceSnapshotDeploymentRel.$inferInsert;
export type SourceSnapshotDeploymentRelSelect =
  typeof SourceSnapshotDeploymentRel.$inferSelect;
