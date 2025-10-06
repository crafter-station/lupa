import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Deployment } from "./deployment";
import { Snapshot } from "./snapshot";

export const SNAPSHOT_AND_DEPLOYMENT_REL_TABLE = "snapshot_and_deployment_rel";

export const SnapshotDeploymentRel = pgTable(
  SNAPSHOT_AND_DEPLOYMENT_REL_TABLE,
  {
    snapshot_id: text("snapshot_id")
      .notNull()
      .references(() => Snapshot.id, { onDelete: "cascade" }),

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

export const SnapshotDeploymentRelRelations = relations(
  SnapshotDeploymentRel,
  ({ one }) => ({
    snapshot: one(Snapshot, {
      fields: [SnapshotDeploymentRel.snapshot_id],
      references: [Snapshot.id],
    }),
    deployment: one(Deployment, {
      fields: [SnapshotDeploymentRel.deployment_id],
      references: [Deployment.id],
    }),
  }),
);

export const SnapshotDeploymentRelInsertSchema = createInsertSchema(
  SnapshotDeploymentRel,
);
export const SnapshotDeploymentRelSelectSchema = createSelectSchema(
  SnapshotDeploymentRel,
);

export type SnapshotDeploymentRelInsert =
  typeof SnapshotDeploymentRel.$inferInsert;
export type SnapshotDeploymentRelSelect =
  typeof SnapshotDeploymentRel.$inferSelect;
