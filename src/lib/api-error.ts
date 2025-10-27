import { NextResponse } from "next/server";
import { ZodError } from "zod/v3";

export const ErrorCode = {
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED: "UNAUTHORIZED",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DEPLOYMENT_NOT_FOUND: "DEPLOYMENT_NOT_FOUND",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MISSING_PARAMETER: "MISSING_PARAMETER",
  FORBIDDEN: "FORBIDDEN",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorResponse {
  error: {
    code: ErrorCodeType;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }

  toResponse(): NextResponse<ApiErrorResponse> {
    return NextResponse.json(this.toJSON(), { status: this.status });
  }
}

export function createErrorResponse(
  code: ErrorCodeType,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  if (error instanceof ZodError) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      "Validation failed",
      400,
      error.errors,
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";

  if (message === "Project not found") {
    return createErrorResponse(ErrorCode.PROJECT_NOT_FOUND, message, 404);
  }

  if (message === "Document not found") {
    return createErrorResponse(ErrorCode.DOCUMENT_NOT_FOUND, message, 404);
  }

  if (message === "Deployment not found") {
    return createErrorResponse(ErrorCode.DEPLOYMENT_NOT_FOUND, message, 404);
  }

  console.error("Unhandled API error:", error);

  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    "Internal server error",
    500,
  );
}
