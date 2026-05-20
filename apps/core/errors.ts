/**
 * Typed errors so transports can map failures to HTTP codes / MCP isError
 * without string matching.
 */
export class NotFoundError extends Error {
  readonly kind = "not_found" as const;
}
export class InvalidInputError extends Error {
  readonly kind = "invalid_input" as const;
}
export class ForbiddenError extends Error {
  readonly kind = "forbidden" as const;
}
