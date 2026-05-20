import { ForbiddenError, InvalidInputError, NotFoundError } from "../core/errors.ts";

export function errToResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  let status = 500;
  if (error instanceof NotFoundError) status = 404;
  else if (error instanceof InvalidInputError) status = 400;
  else if (error instanceof ForbiddenError) status = 403;
  return Response.json({ error: message }, { status });
}
