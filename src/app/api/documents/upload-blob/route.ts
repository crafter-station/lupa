import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import z from "zod";

export const preferredRegion = "iad1";

export const UploadDocumentBlobSchema = z.object({
  file: z.custom<File>().describe("File to upload (image, PDF, or document)"),
});

export const UploadDocumentBlobResponseSchema = z.object({
  blobUrl: z.url().describe("Public URL of the uploaded blob"),
  filename: z.string().describe("Original file name"),
  size: z.number().describe("File size in bytes"),
});

export const ErrorResponseSchema = z.object({
  error: z.string().describe("Error message"),
});

/**
 * Upload a document file
 * @description Uploads a file to storage and returns its public URL.
 * @body UploadDocumentBlobSchema
 * @contentType multipart/form-data
 * @response 200:UploadDocumentBlobResponseSchema
 * @response 400:ErrorResponseSchema
 * @response 500:ErrorResponseSchema
 * @openapi
 */
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
