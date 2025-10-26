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
type ProjectToMigrate = {
  id: string;
  newId: string;
};

async function lowercaseProjectIds(dryRun = true) {
  console.log(
    `\n🔍 ${dryRun ? "DRY RUN MODE" : "EXECUTING"}: Lowercase Project IDs Migration\n`,
  );

  const projects = await db
    .select({ id: schema.Project.id })
    .from(schema.Project);

  console.log(`Found ${projects.length} total projects`);

  const projectsToMigrate: ProjectToMigrate[] = projects
    .filter((p) => p.id !== p.id.toLowerCase())
    .map((p) => ({
      id: p.id,
      newId: p.id.toLowerCase(),
    }));

  if (projectsToMigrate.length === 0) {
    console.log("✅ All project IDs are already lowercase. Nothing to do.\n");
    return;
  }

  console.log(`\n📋 Projects to migrate: ${projectsToMigrate.length}\n`);

  for (const project of projectsToMigrate) {
    console.log(`  ${project.id} → ${project.newId}`);
  }

  if (dryRun) {
    console.log("\n⚠️  This is a dry run. No changes will be made.");
    console.log("Run with --execute to apply changes.\n");
    return;
  }

  console.log("\n🚀 Starting migration...\n");

  let migrated = 0;

  for (const project of projectsToMigrate) {
    try {
      await db.transaction(async (tx) => {
        const apiKeyCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.ApiKey)
          .where(sql`${schema.ApiKey.project_id} = ${project.id}`);

        const documentCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.Document)
          .where(sql`${schema.Document.project_id} = ${project.id}`);

        const deploymentCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.Deployment)
          .where(sql`${schema.Deployment.project_id} = ${project.id}`);

        await tx.execute(
          sql`ALTER TABLE "api_key" DROP CONSTRAINT "api_key_project_id_project_id_fk"`,
        );

        await tx
          .update(schema.Project)
          .set({ id: project.newId })
          .where(sql`${schema.Project.id} = ${project.id}`);

        await tx
          .update(schema.ApiKey)
          .set({ project_id: project.newId })
          .where(sql`${schema.ApiKey.project_id} = ${project.id}`);

        await tx
          .update(schema.Document)
          .set({ project_id: project.newId })
          .where(sql`${schema.Document.project_id} = ${project.id}`);

        await tx
          .update(schema.Deployment)
          .set({ project_id: project.newId })
          .where(sql`${schema.Deployment.project_id} = ${project.id}`);

        await tx.execute(
          sql`ALTER TABLE "api_key" ADD CONSTRAINT "api_key_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE CASCADE`,
        );

        console.log(`✅ ${project.id} → ${project.newId}`);
        console.log(
          `   Updated: ${apiKeyCount[0].count} api_keys, ${documentCount[0].count} documents, ${deploymentCount[0].count} deployments`,
        );

        migrated++;
      });
    } catch (error) {
      console.error(`❌ Failed to migrate ${project.id}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Migration complete! Migrated ${migrated} projects.\n`);
}

const isDryRun = !process.argv.includes("--execute");

lowercaseProjectIds(isDryRun)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
