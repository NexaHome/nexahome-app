import { GraphQLFormattedError } from 'graphql';
import { HttpException } from '@nestjs/common';

export interface FormattedError {
  message: string;
  errorCode: string;
  statusCode: number;
  path?: readonly (string | number)[];
  timestamp: string;
}

/**
 * Custom GraphQL format error function.
 * Transforms all thrown exceptions into a consistent shape:
 * { message, errorCode, statusCode, path, timestamp }
 */
export function formatGraphQLError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): FormattedError {
  // Unwrap the original error thrown in resolvers/services
  const originalError =
    (formattedError.extensions?.originalError as Record<string, unknown>) ?? null;

  // If it's our AppException, use its structured payload
  if (originalError && typeof originalError === 'object') {
    return {
      message: (originalError.message as string) ?? formattedError.message,
      errorCode: (originalError.errorCode as string) ?? 'UNKNOWN_ERROR',
      statusCode: (originalError.statusCode as number) ?? 500,
      path: formattedError.path,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback for GraphQL validation / parsing errors (no originalError)
  const extensions = formattedError.extensions ?? {};
  const code = extensions.code as string | undefined;

  const statusMap: Record<string, number> = {
    GRAPHQL_VALIDATION_FAILED: 400,
    BAD_USER_INPUT: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  };

  return {
    message: formattedError.message,
    errorCode: code ?? 'INTERNAL_SERVER_ERROR',
    statusCode: statusMap[code ?? ''] ?? 500,
    path: formattedError.path,
    timestamp: new Date().toISOString(),
  };
}
