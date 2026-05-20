import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { ForbiddenError, InvalidInputError } from "../errors.ts";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import {
  assertFeatureId,
  assertInsideFeature,
  assertProject,
  FEATURE_ID_RE,
  featurePath,
  TEXT_ARTIFACTS,
} from "./guards.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-smoke" });
});
afterEach(() => ws.cleanup());

describe("guards", () => {
  test("FEATURE_ID_RE accepts valid ids and rejects traversal", () => {
    expect(FEATURE_ID_RE.test("2026-01-dq-smoke")).toBe(true);
    expect(FEATURE_ID_RE.test("2099-XX-dq-smoke")).toBe(true);
    expect(FEATURE_ID_RE.test("../etc")).toBe(false);
    expect(FEATURE_ID_RE.test("2026-01-DQ")).toBe(false);
  });

  test("assertProject throws InvalidInputError for unknown project", () => {
    expect(() => assertProject("demo")).not.toThrow();
    expect(() => assertProject("ghost")).toThrow(InvalidInputError);
  });

  test("assertFeatureId throws InvalidInputError for bad id", () => {
    expect(() => assertFeatureId("2026-01-dq-smoke")).not.toThrow();
    expect(() => assertFeatureId("../../etc/passwd")).toThrow(InvalidInputError);
  });

  test("featurePath throws InvalidInputError for bad feature id", () => {
    expect(() => featurePath("demo", "../shared", "archive.md")).toThrow(InvalidInputError);
  });

  test("featurePath throws InvalidInputError for unknown project", () => {
    expect(() => featurePath("ghost", "2026-01-dq-smoke", "archive.md")).toThrow(InvalidInputError);
  });

  test("featurePath throws ForbiddenError for escaping segments", () => {
    expect(() => featurePath("demo", "2026-01-dq-smoke", "..", "..", "secret")).toThrow(
      ForbiddenError,
    );
  });

  test("featurePath throws ForbiddenError for sibling prefix match", () => {
    expect(() =>
      featurePath("demo", "2026-01-dq-smoke", "..", "2026-01-dq-smoke-evil", "archive.md"),
    ).toThrow(ForbiddenError);
  });

  test("assertInsideFeature throws ForbiddenError on escape", () => {
    const inside = featurePath("demo", "2026-01-dq-smoke", "archive.md");
    expect(() => assertInsideFeature("demo", "2026-01-dq-smoke", inside)).not.toThrow();
    const root = featurePath("demo", "2026-01-dq-smoke");
    const outside = resolve(root, "..", "..", "secret");
    expect(() => assertInsideFeature("demo", "2026-01-dq-smoke", outside)).toThrow(ForbiddenError);
  });

  test("assertInsideFeature throws InvalidInputError before containment for bad feature id", () => {
    expect(() => assertInsideFeature("demo", "../shared", ws.root)).toThrow(InvalidInputError);
  });

  test("assertInsideFeature throws ForbiddenError for sibling prefix match", () => {
    const sibling = resolve(
      featurePath("demo", "2026-01-dq-smoke"),
      "..",
      "2026-01-dq-smoke-evil",
      "archive.md",
    );
    expect(() => assertInsideFeature("demo", "2026-01-dq-smoke", sibling)).toThrow(ForbiddenError);
  });

  test("TEXT_ARTIFACTS whitelists archive.md but not cases.xmind", () => {
    expect(TEXT_ARTIFACTS.has("archive.md")).toBe(true);
    expect(TEXT_ARTIFACTS.has("cases.xmind")).toBe(false);
  });
});
