import { describe, expect, it } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IntermediateJson } from "../../cli/lib/intermediate-types.ts";
import {
  appendXmind,
  buildRawCaseNode,
  readXmindSheets,
  replaceXmind,
  writeXmindSheets,
} from "../../cli/lib/xmind-io.ts";
import { createXmind } from "../../cli/lib/xmind-render.ts";

function data(reqName: string, caseTitle: string, project = "dataAssets"): IntermediateJson {
  return {
    meta: { project_name: project, requirement_name: reqName, version: "v1.0" },
    modules: [
      {
        name: "模块A",
        pages: [{ name: "页面B", test_cases: [{ title: caseTitle, priority: "P1", steps: [] }] }],
      },
    ],
  };
}

async function l1Titles(path: string): Promise<string[]> {
  const [sheets] = await readXmindSheets(path);
  return (sheets[0].rootTopic?.children?.attached ?? []).map((n) => n.title ?? "");
}

async function renameL1(path: string, from: string, to: string): Promise<void> {
  const [sheets, zip] = await readXmindSheets(path);
  const node = sheets[0].rootTopic?.children?.attached?.find((n) => n.title === from);
  if (!node) throw new Error(`L1 ${from} not found`);
  node.title = to;
  zip.file("content.json", JSON.stringify(sheets));
  await writeXmindSheets(zip, path);
}

describe("buildRawCaseNode steps-as-notes threshold", () => {
  const tc = (steps: number) => ({
    title: "t",
    priority: "P1",
    preconditions: "前置",
    steps: Array.from({ length: steps }, (_, i) => ({ step: `s${i}`, expected: `e${i}` })),
  });

  it("keeps 1-2 step cases as outline nodes even with stepsAsNotes", () => {
    const node = buildRawCaseNode(tc(2), { stepsAsNotes: true });
    expect(node.children?.attached).toHaveLength(2);
    expect(node.notes?.plain?.content).toBe("前置");
  });

  it("folds 3+ step cases into notes", () => {
    const node = buildRawCaseNode(tc(3), { stepsAsNotes: true });
    expect(node.children).toBeUndefined();
    expect(node.notes?.plain?.content).toContain("用例步骤");
  });
});

describe("appendXmind", () => {
  it("throws instead of polluting the first sheet when the root title misses", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "t1", "dataAssets"), out);
    await expect(appendXmind(data("需求B", "t2", "batchWorks"), out)).rejects.toThrow(
      /Cannot find sheet with root title/,
    );
    expect(await l1Titles(out)).toEqual(["需求A"]);
  });

  it("appends under the matching root title", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "t1"), out);
    await appendXmind(data("需求B", "t2"), out);
    expect(await l1Titles(out)).toEqual(["需求A", "需求B"]);
  });
});

describe("replaceXmind", () => {
  it("replaces the L1 node on an exact title match", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "旧用例"), out);
    await replaceXmind(data("需求A", "新用例"), out);
    const [sheets] = await readXmindSheets(out);
    const l1 = sheets[0].rootTopic?.children?.attached ?? [];
    expect(l1.map((n) => n.title)).toEqual(["需求A"]);
    const cases = JSON.stringify(l1[0]);
    expect(cases).toContain("新用例");
    expect(cases).not.toContain("旧用例");
  });

  it("falls back to a unique suffix match for legacy prefixed titles", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "旧用例"), out);
    await renameL1(out, "需求A", "v6旧前缀需求A");
    await replaceXmind(data("需求A", "新用例"), out);
    const titles = await l1Titles(out);
    expect(titles).toEqual(["需求A"]);
  });

  it("refuses to pick among multiple suffix matches and appends instead", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "旧用例"), out);
    await appendXmind(data("需求A", "旧用例2"), out);
    await renameL1(out, "需求A", "甲需求A");
    // 此时两个 L1 分别为 甲需求A / 需求A,都以 需求A 结尾
    await replaceXmind(data("需求A", "新用例"), out);
    // 精确匹配命中「需求A」,不应误伤「甲需求A」
    const titles = await l1Titles(out);
    expect(titles).toEqual(["甲需求A", "需求A"]);
    const [sheets] = await readXmindSheets(out);
    const first = JSON.stringify(sheets[0].rootTopic?.children?.attached?.[0]);
    expect(first).toContain("旧用例");
  });

  it("appends a new node when no fuzzy match is unique", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-io-"));
    const out = join(dir, "a.xmind");
    await createXmind(data("需求A", "旧用例"), out);
    await appendXmind(data("需求A", "旧用例2"), out);
    await renameL1(out, "需求A", "甲需求A");
    // renameL1 只改第一个;把第二个也改成带前缀,使 endsWith 命中两处
    await renameL1(out, "需求A", "乙需求A");
    await replaceXmind(data("需求A", "新用例"), out);
    const titles = await l1Titles(out);
    expect(titles).toEqual(["甲需求A", "乙需求A", "需求A"]);
  });
});
