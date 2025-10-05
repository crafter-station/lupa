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
    snapshot_id: text("snapshot_id")
      .notNull()
      .references(() => SourceSnapshot.id, { onDelete: "cascade" }),

    deployment_id: text("deployment_id")
      .notNull()
      .references(() => Deployment.id, { onDelete: "cascade" }),

    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.snapshot_id, t.deployment_id] })],
);

export const SourceSnapshotDeploymentRelRelations = relations(
  SourceSnapshotDeploymentRel,
  ({ one }) => ({
    snapshot: one(SourceSnapshot, {
      fields: [SourceSnapshotDeploymentRel.snapshot_id],
      references: [SourceSnapshot.id],
    }),
    deployment: one(Deployment, {
      fields: [SourceSnapshotDeploymentRel.deployment_id],
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
