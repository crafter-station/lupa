import { tasks } from "@trigger.dev/sdk/v3";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentUrl, filename, userId, sessionId } = body;

    if (!documentUrl || !filename || !userId || !sessionId) {
      return Response.json(
        { error: "Missing required fields: documentUrl, filename, userId, sessionId" },
        { status: 400 }
      );
    }

    const documentId = uuidv4();

    // Trigger the main ingestion task with proper tags for filtering
    const handle = await tasks.trigger(
      "ingestion.main",
      {
        document: {
          id: documentId,
          url: documentUrl,
          filename: filename,
        },
        userId: userId,
      },
      {
        tags: [
          `session:${sessionId}`,
          `user:${userId}`,
          `document:${documentId}`,
          `type:ingestion`,
        ],
      }
    );

    return Response.json({
      success: true,
      runId: handle.id,
      documentId,
      sessionId,
      message: "Document processing started",
    });

  } catch (error) {
    console.error("Failed to trigger document ingestion:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to start processing" },
      { status: 500 }
    );
  }
}
