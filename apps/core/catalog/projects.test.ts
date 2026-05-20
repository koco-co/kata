import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../test-helpers.ts";
import { listProjectSummaries } from "./projects.ts";

let ws: Workspace;
beforeEach(() => {
  ws = makeWorkspace();
});
afterEach(() => ws.cleanup());

test("listProjectSummaries counts features per project, sorted, INDEX.md excluded", () => {
  ws.seedFeature({ project: "beta", id: "2026-01-dq-one" });
  ws.seedFeature({ project: "alpha", id: "2026-01-dq-one" });
  ws.seedFeature({ project: "alpha", id: "2026-02-dq-two" });
  writeFileSync(join(ws.root, "alpha", "features", "INDEX.md"), "# Alpha\n");
  const summaries = listProjectSummaries();
  expect(summaries).toEqual([
    { name: "alpha", featureCount: 2 },
    { name: "beta", featureCount: 1 },
  ]);
});

test("listProjectSummaries returns [] when workspace empty", () => {
  expect(listProjectSummaries()).toEqual([]);
});
