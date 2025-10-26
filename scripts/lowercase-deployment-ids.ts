import { Pool } from "@neondatabase/serverless";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/db/schema";

config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
});

const db = drizzle({
  client: pool,
  schema,
});
type DeploymentToMigrate = {
  id: string;
  newId: string;
};

async function lowercaseDeploymentIds(dryRun = true) {
  console.log(
    `\n🔍 ${dryRun ? "DRY RUN MODE" : "EXECUTING"}: Lowercase Deployment IDs Migration\n`,
  );

  const deployments = await db
    .select({ id: schema.Deployment.id })
    .from(schema.Deployment);

  console.log(`Found ${deployments.length} total deployments`);

  const deploymentsToMigrate: DeploymentToMigrate[] = deployments
    .filter((d) => d.id !== d.id.toLowerCase())
    .map((d) => ({
      id: d.id,
      newId: d.id.toLowerCase(),
    }));

  if (deploymentsToMigrate.length === 0) {
    console.log(
      "✅ All deployment IDs are already lowercase. Nothing to do.\n",
    );
    return;
  }

  console.log(`\n📋 Deployments to migrate: ${deploymentsToMigrate.length}\n`);

  for (const deployment of deploymentsToMigrate) {
    console.log(`  ${deployment.id} → ${deployment.newId}`);
  }

  if (dryRun) {
    console.log("\n⚠️  This is a dry run. No changes will be made.");
    console.log("Run with --execute to apply changes.\n");
    return;
  }

  console.log("\n🚀 Starting migration...\n");

  let migrated = 0;

  for (const deployment of deploymentsToMigrate) {
    try {
      await db.transaction(async (tx) => {
        const snapshotRelCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.SnapshotDeploymentRel)
          .where(
            sql`${schema.SnapshotDeploymentRel.deployment_id} = ${deployment.id}`,
          );

        await tx.execute(
          sql`ALTER TABLE "snapshot_and_deployment_rel" DROP CONSTRAINT "snapshot_and_deployment_rel_deployment_id_deployment_id_fk"`,
        );

        await tx
          .update(schema.Deployment)
          .set({ id: deployment.newId })
          .where(sql`${schema.Deployment.id} = ${deployment.id}`);

        await tx
          .update(schema.SnapshotDeploymentRel)
          .set({ deployment_id: deployment.newId })
          .where(
            sql`${schema.SnapshotDeploymentRel.deployment_id} = ${deployment.id}`,
          );

        await tx.execute(
          sql`ALTER TABLE "snapshot_and_deployment_rel" ADD CONSTRAINT "snapshot_and_deployment_rel_deployment_id_deployment_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "deployment"("id") ON DELETE CASCADE`,
        );

        console.log(`✅ ${deployment.id} → ${deployment.newId}`);
        console.log(
          `   Updated: ${snapshotRelCount[0].count} snapshot_deployment_rels`,
        );

        migrated++;
      });
    } catch (error) {
      console.error(`❌ Failed to migrate ${deployment.id}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Migration complete! Migrated ${migrated} deployments.\n`);
}

const isDryRun = !process.argv.includes("--execute");

lowercaseDeploymentIds(isDryRun)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
