import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const preferredRegion = "iad1";

export async function POST(request: Request) {
  try {
    // TODO: Uncomment when Clerk is configured
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    const userId = "temp-user-id"; // Temporary for testing

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = await put(`documents/${userId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json(
      {
        blobUrl: blob.url,
        filename: file.name,
        size: file.size,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Blob upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
