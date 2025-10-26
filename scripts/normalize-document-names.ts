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

type DocumentToMigrate = {
  id: string;
  oldName: string;
  newName: string;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

async function normalizeDocumentNames(dryRun = true) {
  console.log(
    `\n🔍 ${dryRun ? "DRY RUN MODE" : "EXECUTING"}: Normalize Document Names Migration\n`,
  );

  const documents = await db
    .select({ id: schema.Document.id, name: schema.Document.name })
    .from(schema.Document);

  console.log(`Found ${documents.length} total documents`);

  const documentsToMigrate: DocumentToMigrate[] = documents
    .filter((d) => {
      const normalized = normalizeName(d.name);
      return d.name !== normalized;
    })
    .map((d) => ({
      id: d.id,
      oldName: d.name,
      newName: normalizeName(d.name),
    }));

  if (documentsToMigrate.length === 0) {
    console.log(
      "✅ All document names are already normalized. Nothing to do.\n",
    );
    return;
  }

  console.log(`\n📋 Documents to migrate: ${documentsToMigrate.length}\n`);

  for (const doc of documentsToMigrate) {
    console.log(`  "${doc.oldName}" → "${doc.newName}" (${doc.id})`);
  }

  if (dryRun) {
    console.log("\n⚠️  This is a dry run. No changes will be made.");
    console.log("Run with --execute to apply changes.\n");
    return;
  }

  console.log("\n🚀 Starting migration...\n");

  let migrated = 0;

  for (const doc of documentsToMigrate) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.Document)
          .set({ name: doc.newName })
          .where(sql`${schema.Document.id} = ${doc.id}`);

        console.log(`✅ "${doc.oldName}" → "${doc.newName}"`);
        migrated++;
      });
    } catch (error) {
      console.error(`❌ Failed to migrate document ${doc.id}:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Migration complete! Migrated ${migrated} documents.\n`);
}

const isDryRun = !process.argv.includes("--execute");

normalizeDocumentNames(isDryRun)
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
