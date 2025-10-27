import { desc, eq } from "drizzle-orm";
import { db } from "../src/db";
import * as schema from "../src/db/schema";

const DRY_RUN = process.argv.includes("--dry-run");

async function backfillProductionDeployments() {
  console.log(`Starting backfill script (DRY RUN: ${DRY_RUN})...\n`);

  const projects = await db.query.Project.findMany({
    columns: {
      id: true,
      name: true,
      org_id: true,
    },
  });

  console.log(`Found ${projects.length} projects\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const project of projects) {
    const deployments = await db.query.Deployment.findMany({
      where: eq(schema.Deployment.project_id, project.id),
      orderBy: [desc(schema.Deployment.created_at)],
    });

    if (deployments.length === 0) {
      console.log(`❌ Project ${project.name} (${project.id}): No deployments`);
      skippedCount++;
      continue;
    }

    const readyDeployments = deployments.filter((d) => d.status === "ready");

    if (readyDeployments.length === 0) {
      console.log(
        `❌ Project ${project.name} (${project.id}): No ready deployments`,
      );
      skippedCount++;
      continue;
    }

    const mostRecentReady = readyDeployments[0];

    console.log(
      `✅ Project ${project.name} (${project.id}): Found production candidate ${mostRecentReady.id}`,
    );

    if (!DRY_RUN) {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.Deployment)
          .set({
            environment: "production",
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Deployment.id, mostRecentReady.id));

        await tx
          .update(schema.Project)
          .set({
            production_deployment_id: mostRecentReady.id,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, project.id));
      });
    }

    updatedCount++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total projects: ${projects.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  if (DRY_RUN) {
    console.log(
      `\nℹ️  This was a dry run. Run without --dry-run to apply changes.`,
    );
  } else {
    console.log(`\n✅ Backfill completed successfully!`);
  }
}

backfillProductionDeployments()
  .then(() => {
    console.log("\nScript finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
