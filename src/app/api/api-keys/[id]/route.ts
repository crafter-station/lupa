import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ApiKey } from "@/db/schema";
import { deleteApiKey, revokeApiKey } from "@/lib/crypto/api-key";

export const preferredRegion = "iad1";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const keyRecord = await db.query.ApiKey.findFirst({
      where: eq(ApiKey.id, id),
    });

    if (!keyRecord) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    if (keyRecord.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteApiKey(id);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return Response.json(
      { error: "Failed to delete API key" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const keyRecord = await db.query.ApiKey.findFirst({
      where: eq(ApiKey.id, id),
    });

    if (!keyRecord) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    if (keyRecord.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await revokeApiKey(id);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return Response.json(
      { error: "Failed to revoke API key" },
      { status: 500 },
    );
  }
}
