import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import JSZip from "jszip";
import { KATA_CLI } from "../cli-runner";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");
const FIXTURE = join(import.meta.dirname, "../fixtures/sample-cases.json");
const TMP_DIR = join(tmpdir(), `kata-xmind-test-${process.pid}`);

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(KATA_CLI, ["xmind-gen", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

async function readContentJson(xmindPath: string): Promise<unknown> {
  const buffer = readFileSync(xmindPath);
  const zip = await JSZip.loadAsync(buffer);
  const contentFile = zip.file("content.json");
  expect(contentFile).toBeTruthy();
  if (!contentFile) throw new Error("content.json missing from xmind archive");
  const str = await contentFile.async("string");
  return JSON.parse(str);
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("xmind-gen.ts --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["generate", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/xmind-gen|Convert/);
    expect(output).toMatch(/--input/);
    expect(output).toMatch(/--output/);
    expect(output).toMatch(/--mode/);
  });
});

describe("xmind-gen.ts create mode", () => {
  it("creates .xmind file from valid JSON fixture", () => {
    const output = join(TMP_DIR, "test-create.xmind");
    const { code } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);
    expect(existsSync(output)).toBeTruthy();
    expect(statSync(output).size > 0).toBeTruthy();
  });

  it("folds test-case topics by default, keeps module nodes expanded", async () => {
    const output = join(TMP_DIR, "test-fold.xmind");
    const { code } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);

    type Node = {
      title?: string;
      branch?: string;
      markers?: unknown[];
      notes?: unknown;
      children?: { attached?: Node[] };
    };
    const sheets = (await readContentJson(output)) as { rootTopic?: Node }[];

    let caseFolded = 0;
    let structureExpanded = 0;
    const walk = (n: Node): void => {
      const kids = n.children?.attached ?? [];
      const isCase = (n.markers !== undefined || n.notes !== undefined) && kids.length > 0;
      if (isCase) {
        // 用例节点必须默认折叠
        expect(n.branch).toBe("folded");
        caseFolded++;
      } else if (kids.length > 0) {
        // 模块/分组节点(无 marker/notes)保持展开, 不应被折叠
        expect(n.branch).toBeUndefined();
        structureExpanded++;
      }
      for (const c of kids) walk(c);
    };
    for (const s of sheets) if (s.rootTopic) walk(s.rootTopic);

    expect(caseFolded).toBeGreaterThan(0);
    expect(structureExpanded).toBeGreaterThan(0);
  });

  it("outputs valid JSON result to stdout", () => {
    const output = join(TMP_DIR, "test-stdout.xmind");
    const { code, stdout } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as {
      output_path: string;
      mode: string;
      root_title: string;
      l1_title: string;
      case_count: number;
    };

    expect(result.root_title).toBe("数据资产v6.4.10迭代用例(#23)");
    expect(result.l1_title).toBe("质量问题台账");
    expect(result.mode).toBe("create");
    expect(result.output_path.endsWith("test-stdout.xmind")).toBeTruthy();
    // 3 sub_group cases + 1 page-level case (列表页) + 1 page-level case (新增页) = 5
    expect(result.case_count).toBe(5);
  });

  it("exits with code 1 if output file already exists", () => {
    const output = join(TMP_DIR, "test-existing.xmind");
    // Create first time (should succeed)
    const first = run(["--input", FIXTURE, "--output", output]);
    expect(first.code).toBe(0);

    // Create again (should fail)
    const second = run(["--input", FIXTURE, "--output", output]);
    expect(second.code).toBe(1);
    expect(second.stderr).toMatch(/already exists/);
  });

  it("uses frontmatter root_name before CLI project name for md input", async () => {
    const input = join(TMP_DIR, "root-name-precedence.md");
    const output = join(TMP_DIR, "root-name-precedence.xmind");
    const archiveMd = `---
suite_name: "质量问题台账"
root_name: "自定义 Root 节点"
prd_version: "v6.4.10"
---

## 质量问题台账

### 列表页

#### 搜索筛选

##### 【P1】验证按问题类型筛选

> 前置条件

\`\`\`
已准备测试数据
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 质量问题台账】页面 | 页面正常加载 |
`;
    writeFileSync(input, archiveMd, "utf8");

    const { code, stdout } = run(["--input", input, "--output", output, "--project", "CLI项目名"]);
    expect(code).toBe(0);
    expect(stdout.includes("自定义 Root 节点") || existsSync(output)).toBeTruthy();

    const sheets = (await readContentJson(output)) as {
      rootTopic?: { title?: string };
    }[];
    expect(sheets[0]?.rootTopic?.title).toBe("自定义 Root 节点");
  });

  it("preserves version headings from grouped Archive Markdown as XMind module nodes", async () => {
    const input = join(TMP_DIR, "grouped-history.md");
    const output = join(TMP_DIR, "grouped-history.xmind");
    const archiveMd = `---
suite_name: "岚图已上线需求一级用例"
root_name: "岚图已上线需求一级用例"
---

## v6.4.3

### 质量报告管理

##### 【P0】验证质量报告下载

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入质量报告 | 进入成功 |
`;
    writeFileSync(input, archiveMd, "utf8");

    const { code } = run(["--input", input, "--output", output]);
    expect(code).toBe(0);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const l1 = sheets[0]?.rootTopic?.children?.attached?.[0];
    const versionNode = l1?.children?.attached?.[0];
    const requirementNode = versionNode?.children?.attached?.[0];
    const caseNode = requirementNode?.children?.attached?.[0];

    expect(versionNode?.title).toBe("v6.4.3");
    expect(requirementNode?.title).toBe("质量报告管理");
    expect(caseNode?.title).toBe("验证质量报告下载");
  });

  it("can render case steps as notes instead of outline children", async () => {
    const input = join(TMP_DIR, "grouped-history-notes.md");
    const output = join(TMP_DIR, "grouped-history-notes.xmind");
    const archiveMd = `---
suite_name: "岚图已上线需求一级用例"
root_name: "岚图已上线需求一级用例"
---

## v6.4.3

### 质量报告管理

##### 【P0】验证质量报告下载

> 前置条件

\`\`\`
已生成质量报告
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入质量报告 | 进入成功 |
| 2 | 点击下载 | 下载成功 |
`;
    writeFileSync(input, archiveMd, "utf8");

    const { code } = run(["--input", input, "--output", output, "--steps-as-notes"]);
    expect(code).toBe(0);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      notes?: { plain?: { content?: string } };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const l1 = sheets[0]?.rootTopic?.children?.attached?.[0];
    const versionNode = l1?.children?.attached?.[0];
    const requirementNode = versionNode?.children?.attached?.[0];
    const caseNode = requirementNode?.children?.attached?.[0];

    expect(caseNode?.title).toBe("验证质量报告下载");
    expect(caseNode?.children?.attached?.length ?? 0).toBe(0);
    expect(caseNode?.notes?.plain?.content).toContain("前置条件");
    expect(caseNode?.notes?.plain?.content).toContain("1. 步骤：进入质量报告");
    expect(caseNode?.notes?.plain?.content).toContain("预期：下载成功");
  });
});

describe("xmind-gen.ts validation", () => {
  it("exits with code 1 when meta.project_name is missing", () => {
    const badFixture = join(TMP_DIR, "missing-project-name.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const meta = { ...(data.meta as Record<string, unknown>) };
    delete meta.project_name;
    const badData = { ...data, meta };
    writeFileSync(badFixture, JSON.stringify(badData));

    const output = join(TMP_DIR, "bad-output-1.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/project_name/);
  });

  it("exits with code 1 when modules is empty", () => {
    const badFixture = join(TMP_DIR, "empty-modules.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const badData = { ...data, modules: [] };
    writeFileSync(badFixture, JSON.stringify(badData));

    const output = join(TMP_DIR, "bad-output-2.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/modules/);
  });

  it("exits with code 1 for invalid --mode value", () => {
    const output = join(TMP_DIR, "bad-mode.xmind");
    const { code, stderr } = run(["--input", FIXTURE, "--output", output, "--mode", "invalid"]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/mode/i);
  });
});

describe("xmind-gen.ts content.json validation", () => {
  it("created .xmind contains valid content.json", async () => {
    const output = join(TMP_DIR, "test-content.xmind");
    const { code } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);

    const sheets = await readContentJson(output);
    expect(Array.isArray(sheets)).toBeTruthy();
    expect((sheets as unknown[]).length > 0).toBeTruthy();
  });

  it("content.json has correct hierarchy: root → L1 → L2 → L3 → cases", async () => {
    const output = join(TMP_DIR, "test-hierarchy.xmind");
    const { code } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      markers?: { markerId: string }[];
      notes?: { plain: { content: string } };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const rootTopic = sheets[0]?.rootTopic;
    expect(rootTopic).toBeTruthy();
    if (!rootTopic) throw new Error("rootTopic missing");

    // Root title
    expect(rootTopic.title).toBe("数据资产v6.4.10迭代用例(#23)");

    // L1: requirement_name with version prefix
    const l1Nodes = rootTopic.children?.attached ?? [];
    expect(l1Nodes.length > 0).toBeTruthy();
    const l1 = l1Nodes[0];
    expect(l1.title).toBe("质量问题台账");

    // L2: module name
    const l2Nodes = l1.children?.attached ?? [];
    expect(l2Nodes.length > 0).toBeTruthy();
    const l2 = l2Nodes[0];
    expect(l2.title).toBe("质量问题台账");

    // L3: page name
    const l3Nodes = l2.children?.attached ?? [];
    expect(l3Nodes.length > 0).toBeTruthy();
    const l3 = l3Nodes[0];
    expect(l3.title).toBe("列表页");

    // L4: sub_group
    const l4Nodes = l3.children?.attached ?? [];
    expect(l4Nodes.length > 0).toBeTruthy();
    // First child should be the sub_group
    const l4SubGroup = l4Nodes[0];
    expect(l4SubGroup.title).toBe("搜索筛选");

    // Case under sub_group
    const caseNodes = l4SubGroup.children?.attached ?? [];
    expect(caseNodes.length > 0).toBeTruthy();
    const firstCase = caseNodes[0];
    expect(firstCase.title).toBe("验证默认加载列表页");

    // Priority marker present
    expect(
      firstCase.markers && firstCase.markers.length > 0,
      "priority marker missing on P0 case",
    ).toBeTruthy();

    // Precondition note present
    expect(firstCase.notes?.plain?.content, "precondition note missing on P0 case").toBeTruthy();
    expect(firstCase.notes?.plain.content).toMatch(/环境已部署/);

    // Step → expected hierarchy
    const stepNodes = firstCase.children?.attached ?? [];
    expect(stepNodes.length > 0).toBeTruthy();
    expect(stepNodes[0].title).toBe("进入【数据质量 → 质量问题台账】页面");
    const expectedNodes = stepNodes[0].children?.attached ?? [];
    expect(expectedNodes.length > 0).toBeTruthy();
    expect(expectedNodes[0].title).toBe("页面正常加载");
  });
});

describe("xmind-gen.ts append mode", () => {
  it("appends L1 node to existing .xmind without replacing", async () => {
    const output = join(TMP_DIR, "test-append.xmind");

    // Create first
    const first = run(["--input", FIXTURE, "--output", output]);
    expect(first.code).toBe(0);

    // Build a second input with different requirement
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      requirement_name: "数据质量规则",
      version: "v6.4.11",
    };
    const secondFixture = join(TMP_DIR, "second-input.json");
    writeFileSync(secondFixture, JSON.stringify({ ...data, meta }));

    const second = run(["--input", secondFixture, "--output", output, "--mode", "append"]);
    expect(second.code).toBe(0);

    type SheetNode = { title?: string; children?: { attached?: SheetNode[] } };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const attached = sheets[0]?.rootTopic?.children?.attached ?? [];
    expect(attached.length >= 2).toBeTruthy();

    const titles = attached.map((n) => n.title);
    expect(titles.includes("质量问题台账")).toBeTruthy();
    expect(titles.includes("数据质量规则")).toBeTruthy();
  });

  it("creates new file if output does not exist in append mode", () => {
    const output = join(TMP_DIR, "test-append-new.xmind");
    expect(!existsSync(output)).toBeTruthy();

    const { code } = run(["--input", FIXTURE, "--output", output, "--mode", "append"]);
    expect(code).toBe(0);
    expect(existsSync(output)).toBeTruthy();
  });
});

describe("xmind-gen.ts <br> tag sanitization", () => {
  const BR_FIXTURE = join(import.meta.dirname, "../fixtures/sample-cases-with-br.json");

  it("converts <br> tags to newlines in step, expected, and preconditions", async () => {
    const output = join(TMP_DIR, "test-br-sanitize.xmind");
    const { code } = run(["--input", BR_FIXTURE, "--output", output]);
    expect(code).toBe(0);

    type SheetNode = {
      title?: string;
      children?: { attached?: SheetNode[] };
      notes?: { plain: { content: string } };
    };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const root = sheets[0]?.rootTopic;
    expect(root).toBeTruthy();
    if (!root) throw new Error("root missing");

    // Navigate to the case node: root → L1 → L2 → L3 → L4(sub_group) → case
    const l1 = root.children?.attached?.[0];
    expect(l1).toBeTruthy();
    if (!l1) throw new Error("l1 missing");
    const l2 = l1.children?.attached?.[0];
    expect(l2).toBeTruthy();
    if (!l2) throw new Error("l2 missing");
    const l3 = l2.children?.attached?.[0];
    expect(l3).toBeTruthy();
    if (!l3) throw new Error("l3 missing");
    const l4SubGroup = l3.children?.attached?.[0];
    expect(l4SubGroup).toBeTruthy();
    if (!l4SubGroup) throw new Error("l4SubGroup missing");
    const caseNode = l4SubGroup.children?.attached?.[0];
    expect(caseNode).toBeTruthy();
    if (!caseNode) throw new Error("caseNode missing");

    // Preconditions should have <br> converted to \n
    expect(caseNode.notes?.plain?.content).toBeTruthy();
    expect(!caseNode.notes?.plain.content.includes("<br")).toBeTruthy();
    expect(caseNode.notes?.plain.content.includes("\n")).toBeTruthy();

    // Step nodes
    const stepNodes = caseNode.children?.attached ?? [];
    expect(stepNodes.length >= 2).toBeTruthy();

    // Second step has <br> in both step and expected
    const step2 = stepNodes[1];
    expect(step2.title).toBeTruthy();
    expect(!step2.title?.includes("<br")).toBeTruthy();
    expect(step2.title?.includes("\n")).toBeTruthy();

    // Expected of step 2
    const expected2 = step2.children?.attached?.[0];
    expect(expected2?.title).toBeTruthy();
    expect(!expected2?.title?.includes("<br")).toBeTruthy();
    expect(expected2?.title?.includes("\n")).toBeTruthy();
  });
});

describe("xmind-gen.ts L1 title strips trailing (#id)", () => {
  it("l1_title strips trailing (#23) from requirement_name", () => {
    const fixture = join(TMP_DIR, "l1-strip.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      requirement_name: "质量问题台账(#23)",
    };
    writeFileSync(fixture, JSON.stringify({ ...data, meta }));

    const output = join(TMP_DIR, "test-l1-strip.xmind");
    const { code, stdout } = run(["--input", fixture, "--output", output]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as { l1_title: string };
    expect(result.l1_title).toBe("质量问题台账");
  });

  it("l1_title unchanged when no trailing (#id)", () => {
    const output = join(TMP_DIR, "test-l1-no-strip.xmind");
    const { code, stdout } = run(["--input", FIXTURE, "--output", output]);
    expect(code).toBe(0);

    const result = JSON.parse(stdout) as { l1_title: string };
    expect(result.l1_title).toBe("质量问题台账");
  });
});

describe("xmind-gen.ts validation — missing requirement_name", () => {
  it("exits with code 1 when meta.requirement_name is missing", () => {
    const badFixture = join(TMP_DIR, "missing-req-name.json");
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const meta = { ...(data.meta as Record<string, unknown>) };
    delete meta.requirement_name;
    writeFileSync(badFixture, JSON.stringify({ ...data, meta }));

    const output = join(TMP_DIR, "bad-output-req.xmind");
    const { code, stderr } = run(["--input", badFixture, "--output", output]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/requirement_name/);
  });
});

describe("xmind-gen.ts replace mode", () => {
  it("replaces matching L1 node in existing .xmind", async () => {
    const output = join(TMP_DIR, "test-replace.xmind");

    // Create original
    const first = run(["--input", FIXTURE, "--output", output]);
    expect(first.code).toBe(0);

    // Build a replacement with same requirement_name but different version
    const data = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
    const meta = {
      ...(data.meta as Record<string, unknown>),
      version: "v6.4.99",
    };
    const replaceFixture = join(TMP_DIR, "replace-input.json");
    writeFileSync(replaceFixture, JSON.stringify({ ...data, meta }));

    const second = run(["--input", replaceFixture, "--output", output, "--mode", "replace"]);
    expect(second.code).toBe(0);

    type SheetNode = { title?: string; children?: { attached?: SheetNode[] } };
    type Sheet = { rootTopic?: SheetNode };

    const sheets = (await readContentJson(output)) as Sheet[];
    const attached = sheets[0]?.rootTopic?.children?.attached ?? [];

    // The original L1 should be gone, replaced by the new one
    const titles = attached.map((n) => n.title);
    expect(titles.includes("质量问题台账")).toBeTruthy();
    expect(attached.length).toBe(1);
  });
});
