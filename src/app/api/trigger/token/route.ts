import { auth } from "@trigger.dev/sdk";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  try {
    // Create scoped token for specific session
    const scopes = {
      read: {
        tags: [`session:${sessionId}`], // Scope to specific session
      },
    };

    const token = await auth.createPublicToken({
      scopes,
      expirationTime: "30m", // Short TTL for security
    });

    return Response.json({ 
      token,
      sessionId
    });
  } catch (error) {
    console.error("Token creation failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Token creation failed" },
      { status: 500 }
    );
  }
}
