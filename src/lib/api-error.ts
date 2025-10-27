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
  DUPLICATE_DOCUMENT: "DUPLICATE_DOCUMENT",
  CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",
  DATABASE_ERROR: "DATABASE_ERROR",
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

interface PostgresError {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
  schema?: string;
  message?: string;
  cause?: {
    code?: string;
    constraint?: string;
    detail?: string;
    table?: string;
    schema?: string;
  };
}

function isPostgresError(error: unknown): error is PostgresError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  ) {
    return true;
  }

  if (
    "cause" in error &&
    typeof (error as { cause: unknown }).cause === "object" &&
    (error as { cause: unknown }).cause !== null
  ) {
    const cause = (error as { cause: Record<string, unknown> }).cause;
    return "code" in cause && typeof cause.code === "string";
  }

  return false;
}

function getPostgresErrorData(error: PostgresError): {
  code: string;
  constraint?: string;
  detail?: string;
  table?: string;
  schema?: string;
} {
  if (error.cause?.code) {
    return {
      code: error.cause.code,
      constraint: error.cause.constraint,
      detail: error.cause.detail,
      table: error.cause.table,
      schema: error.cause.schema,
    };
  }

  return {
    code: error.code ?? "",
    constraint: error.constraint,
    detail: error.detail,
    table: error.table,
    schema: error.schema,
  };
}

function extractConstraintDetails(detail: string): {
  folder?: string;
  name?: string;
} {
  const valuesMatch = detail.match(/=\(([^,]+), ([^,]+), ([^)]+)\)/);

  if (valuesMatch) {
    return {
      folder: valuesMatch[2]?.trim(),
      name: valuesMatch[3]?.trim(),
    };
  }

  return {};
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  const isDev = process.env.NODE_ENV === "development";

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

  if (isPostgresError(error)) {
    const pgError = getPostgresErrorData(error);
    const pgCode = pgError.code;

    if (pgCode === "23505") {
      if (pgError.constraint === "document_project_folder_name_unique") {
        const details = pgError.detail
          ? extractConstraintDetails(pgError.detail)
          : {};

        const message = details.name
          ? `A document named '${details.name}' already exists in folder '${details.folder || "/"}'`
          : "A document with this name already exists in this folder";

        return createErrorResponse(
          ErrorCode.DUPLICATE_DOCUMENT,
          message,
          409,
          isDev
            ? {
                constraint: pgError.constraint,
                detail: pgError.detail,
                ...details,
              }
            : undefined,
        );
      }

      return createErrorResponse(
        ErrorCode.CONSTRAINT_VIOLATION,
        "This record already exists",
        409,
        isDev
          ? { constraint: pgError.constraint, detail: pgError.detail }
          : undefined,
      );
    }

    if (pgCode === "23503") {
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        "Referenced resource does not exist",
        400,
        isDev
          ? { constraint: pgError.constraint, detail: pgError.detail }
          : undefined,
      );
    }

    if (pgCode === "23502") {
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        "Required field is missing",
        400,
        isDev
          ? { constraint: pgError.constraint, detail: pgError.detail }
          : undefined,
      );
    }

    if (pgCode === "23514") {
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        "Invalid value provided",
        400,
        isDev
          ? { constraint: pgError.constraint, detail: pgError.detail }
          : undefined,
      );
    }

    if (pgCode === "22P02") {
      return createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        "Invalid format",
        400,
        isDev ? { detail: pgError.detail } : undefined,
      );
    }

    console.error("Unhandled PostgreSQL error:", {
      code: pgCode,
      constraint: pgError.constraint,
      detail: pgError.detail,
      table: pgError.table,
    });

    return createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Database operation failed",
      500,
      isDev ? { code: pgCode, detail: pgError.detail } : undefined,
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

  console.error("Unhandled API error:", {
    message,
    stack: error instanceof Error ? error.stack : undefined,
    error,
  });

  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    "Internal server error",
    500,
    isDev && error instanceof Error
      ? { message: error.message, stack: error.stack }
      : undefined,
  );
}
