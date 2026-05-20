import { afterEach, beforeEach, expect, test } from "bun:test";
import { makeWorkspace, type Workspace } from "../core/test-helpers.ts";
import { TOOL_BY_NAME, TOOLS } from "./tools.ts";

let ws: Workspace;

beforeEach(() => {
  ws = makeWorkspace();
  ws.seedFeature({ project: "demo", id: "2026-01-dq-alpha" });
});

afterEach(() => {
  ws.cleanup();
});

test("exposes exactly the 6 read tools", () => {
  expect(TOOLS.map((tool) => tool.name).sort()).toEqual(
    [
      "kata_get_cases",
      "kata_get_feature",
      "kata_list_features",
      "kata_list_projects",
      "kata_list_skills",
      "kata_read_artifact",
    ].sort(),
  );
});

test("kata_list_projects handler returns seeded project", async () => {
  const tool = TOOL_BY_NAME.get("kata_list_projects");
  expect(tool).toBeDefined();

  const result = (await tool?.handler({})) as Array<{ name: string }>;

  expect(result.some((project) => project.name === "demo")).toBe(true);
});

test("kata_list_features handler requires project", async () => {
  const tool = TOOL_BY_NAME.get("kata_list_features");
  expect(tool).toBeDefined();

  await expect(Promise.resolve().then(() => tool?.handler({}))).rejects.toThrow(/project/);
});
