import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import type { IntermediateJson, TestCase } from "../../cli/lib/intermediate-types.ts";
import {
  buildRootTitle,
  createXmind,
  createXmindReplacing,
  useStepsAsNotes,
  validateInput,
} from "../../cli/lib/xmind-render.ts";
import { buildRootName } from "../../cli/lib/xmind-rules.ts";

function data(overrides: Partial<IntermediateJson["meta"]> = {}): IntermediateJson {
  return {
    meta: { project_name: "proj", requirement_name: "需求A", ...overrides },
    modules: [
      {
        name: "模块A",
        pages: [{ name: "页面B", test_cases: [{ title: "t", priority: "P1", steps: [] }] }],
      },
    ],
  };
}

function tc(steps: number): TestCase {
  return {
    title: "t",
    priority: "P1",
    steps: Array.from({ length: steps }, (_, i) => ({ step: `s${i}`, expected: `e${i}` })),
  };
}

describe("validateInput", () => {
  it("accepts a well-formed document", () => {
    expect(() => validateInput(data())).not.toThrow();
  });
  it("reports the offending module index, not just the first module", () => {
    const bad = data();
    bad.modules.push({ name: "", pages: [] } as never);
    expect(() => validateInput(bad)).toThrow(/modules\[1\]\.name/);
  });
  it("rejects a module without a pages array", () => {
    const bad = data();
    bad.modules[0] = { name: "模块A" } as never;
    expect(() => validateInput(bad)).toThrow(/modules\[0\]\.pages/);
  });
  it("rejects a page without a name", () => {
    const bad = data();
    bad.modules[0].pages.push({} as never);
    expect(() => validateInput(bad)).toThrow(/modules\[0\]\.pages\[1\]\.name/);
  });
});

describe("root title builders", () => {
  it("buildRootName replaces every occurrence of a placeholder", () => {
    const name = buildRootName(
      "v6.4.11",
      {
        root_title_template: "{{project_name}}/{{project_name}} v{{prd_version}}",
        iteration_id: "23",
      },
      "proj",
    );
    expect(name).toBe("proj/proj v6.4.11");
  });
  it("buildRootTitle delegates to the rules implementation", () => {
    const meta = { project_name: "proj", requirement_name: "需求A", version: "v6.4.11" };
    expect(buildRootTitle(meta)).toBe(buildRootName("v6.4.11", undefined, "proj"));
  });
  it("root_name wins over the version template", () => {
    expect(
      buildRootTitle({ project_name: "p", requirement_name: "r", version: "v1", root_name: "根" }),
    ).toBe("根");
  });
});

describe("useStepsAsNotes", () => {
  it("folds steps into notes only at 3+ steps by default", () => {
    expect(useStepsAsNotes(tc(2), { stepsAsNotes: true })).toBe(false);
    expect(useStepsAsNotes(tc(3), { stepsAsNotes: true })).toBe(true);
    expect(useStepsAsNotes(tc(3), {})).toBe(false);
  });
  it("honors an explicit threshold", () => {
    expect(useStepsAsNotes(tc(2), { stepsAsNotes: true, stepsAsNotesMinSteps: 2 })).toBe(true);
  });
});

describe("createXmindReplacing", () => {
  it("atomically replaces an existing xmind", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-cr-"));
    const out = join(dir, "a.xmind");
    await createXmind(data(), out);
    await createXmindReplacing(data({ requirement_name: "需求B" }), out);
    const zip = await JSZip.loadAsync(readFileSync(out));
    const sheets = JSON.parse(await zip.file("content.json").async("string"));
    const titles = sheets[0].rootTopic.children.attached.map((n: { title?: string }) => n.title);
    expect(titles).toEqual(["需求B"]);
    expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });
});
