import { expect, test } from "bun:test";
import { ForbiddenError, InvalidInputError, NotFoundError } from "../core/errors.ts";
import { errToResponse } from "./errors-http.ts";

async function responseBody(res: Response): Promise<unknown> {
  return res.json();
}

test("errToResponse maps typed errors to HTTP JSON errors", async () => {
  const cases: Array<{ error: Error; status: number; message: string }> = [
    { error: new NotFoundError("missing"), status: 404, message: "missing" },
    { error: new InvalidInputError("bad input"), status: 400, message: "bad input" },
    { error: new ForbiddenError("no access"), status: 403, message: "no access" },
  ];

  for (const { error, status, message } of cases) {
    const res = errToResponse(error);

    expect(res.status).toBe(status);
    expect(await responseBody(res)).toEqual({ error: message });
  }
});

test("errToResponse maps unknown errors to status 500 with stringified message", async () => {
  const standard = errToResponse(new Error("boom"));
  expect(standard.status).toBe(500);
  expect(await responseBody(standard)).toEqual({ error: "boom" });

  const nonError = errToResponse("plain failure");
  expect(nonError.status).toBe(500);
  expect(await responseBody(nonError)).toEqual({ error: "plain failure" });
});
