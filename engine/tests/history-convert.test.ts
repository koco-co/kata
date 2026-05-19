import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { KATA_CLI } from "./cli-runner";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FIXTURE_CSV = join(import.meta.dirname, "fixtures/sample-history.csv");
const TMP_DIR = join(tmpdir(), `kata-history-convert-test-${process.pid}`);
const TEST_PROJECT = "kata-unit-history-project";

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(KATA_CLI, ["history-convert", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 30_000,
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

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
  // Remove the test project directory created by tests
  const testProjectDir = join(REPO_ROOT, "workspace", TEST_PROJECT);
  try {
    rmSync(testProjectDir, { recursive: true, force: true });
  } catch {
    // ignore if directory doesn't exist
  }
});

describe("history-convert --help", () => {
  it("outputs usage information", () => {
    const { stdout, stderr, code } = run(["convert", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toMatch(/history-convert|Convert/i);
    expect(output).toMatch(/--path/);
    expect(output).toMatch(/--detect/);
    expect(output).toMatch(/--force/);
    expect(output).toMatch(/--module/);
  });
});

describe("history-convert --detect", () => {
  it("lists CSV files without writing", () => {
    const dir = join(TMP_DIR, "detect-test");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "my-cases.csv");
    writeFileSync(
      csvFile,
      "module,title,steps,expected,priority\n商品管理,验证列表,进入页面,加载完成,P0",
    );

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT, "--detect"]);
    expect(code).toBe(0);

    const entries = JSON.parse(stdout) as {
      path: string;
      type: string;
      outputDir: string;
    }[];
    expect(Array.isArray(entries)).toBeTruthy();
    expect(entries.length > 0).toBeTruthy();
    expect(entries[0].type).toBe("csv");
    expect(entries[0].outputDir).toMatch(/workspace\/kata-unit-history-project\/features$/);
  });
});

describe("history-convert CSV conversion", () => {
  it("converts a CSV file to Archive Markdown", () => {
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      skipped: number;
      failed: number;
      files: {
        input: string;
        output: string;
        status: string;
        caseCount?: number;
      }[];
    };

    expect(out.converted >= 1).toBeTruthy();
    expect(out.failed).toBe(0);

    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result).toBeTruthy();
    expect(result.status).toBe("converted");
    expect(result.output.endsWith(".md")).toBeTruthy();
    expect(existsSync(result.output)).toBeTruthy();
  });

  it("generated Markdown contains module sections and case titles", () => {
    // Run conversion and check content
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      files: { input: string; output: string; status: string }[];
    };
    const result = out.files.find((f) => f.input === FIXTURE_CSV);
    expect(result && result.status === "converted").toBeTruthy();

    const content = readFileSync(result.output, "utf8");

    // Should have front-matter
    expect(content).toMatch(/^---/);
    expect(content).toMatch(/suite_name/);
    expect(content).toMatch(/origin.*csv/);

    // Should have module sections
    expect(content).toMatch(/## 商品管理/);
    expect(content).toMatch(/## 订单管理/);

    // Should have case titles with priority prefix
    expect(content).toMatch(/验证商品列表默认加载/);
    expect(content).toMatch(/【P0】/);
  });

  it("skips existing output without --force", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);

    // Second run without --force
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as { skipped: number };
    expect(out.skipped >= 1).toBeTruthy();
  });

  it("converts with --force overwriting existing output", () => {
    // First conversion
    run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    // Second conversion with --force
    const { code, stdout } = run(["--path", FIXTURE_CSV, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as { converted: number };
    expect(out.converted >= 1).toBeTruthy();
  });

  it("group-by-version groups single-output CSV archives by version and requirement heading", () => {
    const dir = join(TMP_DIR, "group-by-version");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "v643.csv");
    const output = join(dir, "岚图已上线需求一级用例.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/质量报告管理(#9341),【岚图】质量报告管理(#15001),验证质量报告下载,无,1. 进入质量报告,1. 进入成功,,,1,功能测试",
        "2,数据资产_STD(#23),/版本迭代测试用例/v6.4.4/【岚图】优化需求(#9407),【岚图】优化需求(#15002),验证筛选条件保留,无,1. 执行筛选,1. 筛选成功,,,2,功能测试",
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      dir,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(content).toContain("## v6.4.3\n\n### 质量报告管理");
    expect(content).toContain("## v6.4.4\n\n### 【岚图】优化需求");
    expect(content.indexOf("## v6.4.3")).toBeLessThan(content.indexOf("## v6.4.4"));
  });

  it("group-by-version renders a real top-level heading in grouped single-output CSV archives", () => {
    const dir = join(TMP_DIR, "group-by-version-h1");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "lt-cases.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/质量报告管理(#9341),【岚图】质量报告管理(#15001),验证质量报告下载,无,1. 进入质量报告,1. 进入成功,,,1,功能测试",
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--title",
      "岚图已上线需求一级用例",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(content).toMatch(/^# 岚图已上线需求一级用例$/m);
  });

  it("group-by-version preserves heading-looking lines inside fenced preconditions", () => {
    const dir = join(TMP_DIR, "group-by-version-fenced-preconditions");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "lt-cases.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        '1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/质量报告管理(#9341),【岚图】质量报告管理(#15001),验证质量报告下载,"普通前置\n## keep-precondition\n继续前置",1. 进入质量报告,1. 进入成功,,,1,功能测试',
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(content).toContain("```\n普通前置\n## keep-precondition\n继续前置\n```");

    let inFence = false;
    const h2Lines = content.split(/\r?\n/).filter((line) => {
      if (/^ {0,3}(```|~~~)/.test(line)) {
        inFence = !inFence;
        return false;
      }
      return !inFence && /^## .+$/.test(line);
    });
    expect(h2Lines.length).toBeGreaterThan(0);
    expect(h2Lines.every((line) => line.startsWith("## v"))).toBe(true);
  });

  it("group-by-version preserves heading-looking lines after a tilde inside backtick-fenced preconditions", () => {
    const dir = join(TMP_DIR, "group-by-version-fenced-tilde-preconditions");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "lt-cases.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        '1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/质量报告管理(#9341),【岚图】质量报告管理(#15001),验证质量报告下载,"普通前置\n~~~\n## should-stay-after-tilde\n继续前置",1. 进入质量报告,1. 进入成功,,,1,功能测试',
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    expect(content).toContain("## should-stay-after-tilde");
  });

  it("group-by-version keeps only version headings at H2 in grouped single-output CSV archives", () => {
    const dir = join(TMP_DIR, "group-by-version-no-extra-h2");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "lt-cases.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/实例详情监控报告(#9342),【岚图】实例详情监控报告(#15001),实例详情-监控报告 验证查看明细弹窗标题修改,无,1. 查看明细,1. 弹窗标题正确,,,1,功能测试",
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const h2Lines = content.match(/^## .+$/gm) ?? [];
    expect(h2Lines.length).toBeGreaterThan(0);
    expect(h2Lines.every((line) => line.startsWith("## v"))).toBe(true);
  });

  it("group-by-version preserves the module tail id in grouped requirement headings", () => {
    const dir = join(TMP_DIR, "group-by-version-module-id");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "lt-cases.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/规则校验详细结果表(#9334),【岚图】规则校验详细结果表(#15001),验证规则校验详情,无,1. 进入规则校验详情,1. 进入成功,,,1,功能测试",
      ].join("\n"),
      "utf8",
    );

    const { code } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--group-by-version",
      "--force",
    ]);
    expect(code).toBe(0);

    const content = readFileSync(output, "utf8");
    const heading = content.match(/^### .*规则校验详细结果表.*$/m)?.[0] ?? "";
    expect(heading).toContain("规则校验详细结果表");
    expect(heading).toContain("#9334");
  });

  it("keeps the latest version row when --dedup merges duplicate titles into --output", () => {
    const dir = join(TMP_DIR, "dedup-latest-version");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "dedup-output.md");
    const header =
      "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型";

    writeFileSync(
      csvFile,
      [
        header,
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.10/【岚图】重复需求(#15010),【岚图】重复需求(#15010),验证重复标题,无,1. 保留新版本步骤,1. 保留新版本预期,,,1,功能测试",
        "2,数据资产_STD(#23),/版本迭代测试用例/v6.4.9/【岚图】重复需求(#15009),【岚图】重复需求(#15009),验证重复标题,无,1. 旧版本步骤,1. 旧版本预期,,,1,功能测试",
      ].join("\n"),
      "utf8",
    );

    const { code, stdout } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--dedup",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      failed: number;
      files: { status: string; caseCount?: number }[];
    };
    expect(out.converted).toBe(1);
    expect(out.failed).toBe(0);
    expect(out.files[0].caseCount).toBe(1);

    const content = readFileSync(output, "utf8");
    expect(content).toContain("保留新版本步骤");
    expect(content).toContain("保留新版本预期");
    expect(content).not.toContain("旧版本步骤");
    expect(content).not.toContain("旧版本预期");
  });

  it("applies --level in per-feature CSV conversion", () => {
    const { code, stdout } = run([
      "--path",
      FIXTURE_CSV,
      "--project",
      TEST_PROJECT,
      "--level",
      "1",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      files: { output: string; status: string }[];
    };
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();

    const content = readFileSync(converted.output, "utf8");
    expect(content).toContain("验证商品列表默认加载");
    expect(content).toContain("验证成功新增商品");
    expect(content).not.toContain("验证商品名称为空时无法提交");
    expect(content).not.toContain("验证订单列表加载");
    expect(content).not.toContain("验证订单状态筛选");
  });

  it("applies --filter in per-feature CSV conversion", () => {
    const { code, stdout } = run([
      "--path",
      FIXTURE_CSV,
      "--project",
      TEST_PROJECT,
      "--filter",
      "订单",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      files: { output: string; status: string }[];
    };
    const converted = out.files.find((f) => f.status === "converted");
    expect(converted).toBeTruthy();

    const content = readFileSync(converted.output, "utf8");
    expect(content).toContain("验证订单列表加载");
    expect(content).toContain("验证订单状态筛选");
    expect(content).not.toContain("验证商品列表默认加载");
    expect(content).not.toContain("验证成功新增商品");
  });

  it("reports empty CSV files as failed instead of dropping them", () => {
    const csvFile = join(TMP_DIR, "empty.csv");
    writeFileSync(csvFile, "module,title,steps,expected,priority\n", "utf8");

    const { code, stdout } = run(["--path", csvFile, "--project", TEST_PROJECT]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      failed: number;
      files: { input: string; status: string; reason?: string }[];
    };
    expect(out.failed).toBe(1);
    expect(out.files).toHaveLength(1);
    expect(out.files[0].input).toBe(csvFile);
    expect(out.files[0].status).toBe("failed");
    expect(out.files[0].reason).toMatch(/no valid rows/i);
  });

  it("does not overwrite --output target without --force", () => {
    const output = join(TMP_DIR, "single-output.md");
    writeFileSync(output, "keep me", "utf8");

    const { code, stdout } = run([
      "--path",
      FIXTURE_CSV,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      skipped: number;
      files: { output: string; status: string; reason?: string }[];
    };
    expect(out.skipped).toBe(1);
    expect(out.files).toHaveLength(1);
    expect(out.files[0].output).toBe(output);
    expect(out.files[0].status).toBe("skipped");
    expect(out.files[0].reason).toMatch(/use --force/i);
    expect(readFileSync(output, "utf8")).toBe("keep me");
  });

  it("fails --output without writing when filters match no CSV rows", () => {
    const dir = join(TMP_DIR, "empty-single-output-filter");
    mkdirSync(dir, { recursive: true });
    const csvFile = join(dir, "cases.csv");
    const output = join(dir, "single-output.md");
    writeFileSync(
      csvFile,
      [
        "module,title,steps,expected,priority",
        "商品管理,验证商品列表默认加载,进入商品列表,加载成功,P0",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(output, "keep me", "utf8");

    const { code, stdout } = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      output,
      "--filter",
      "不存在的模块",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      failed: number;
      files: { output: string; status: string; reason?: string; caseCount?: number }[];
    };
    expect(out.converted).toBe(0);
    expect(out.failed).toBe(1);
    expect(out.files).toHaveLength(1);
    expect(out.files[0].output).toBe(output);
    expect(out.files[0].status).toBe("failed");
    expect(out.files[0].reason).toMatch(/no CSV rows matched filters/i);
    expect(readFileSync(output, "utf8")).toBe("keep me");
  });
});

describe("history-convert directory scan", () => {
  it("scans a directory and converts all CSV files found", () => {
    const dir = join(TMP_DIR, "dir-scan");
    mkdirSync(dir, { recursive: true });

    // Create two CSV files
    writeFileSync(
      join(dir, "module-a.csv"),
      "module,title,steps,expected,priority\n模块A,验证功能A,步骤1,预期1,P0\n",
    );
    writeFileSync(
      join(dir, "module-b.csv"),
      "module,title,steps,expected,priority\n模块B,验证功能B,步骤1,预期1,P1\n",
    );
    // Non-CSV should be ignored
    writeFileSync(join(dir, "notes.txt"), "ignore me");

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { input: string }[];
    };
    expect(out.converted).toBe(2);
    expect(out.files.every((f) => f.input.endsWith(".csv"))).toBeTruthy();
  });
});

describe("history-convert --module filter", () => {
  it("filters files by module keyword", () => {
    const dir = join(TMP_DIR, "module-filter");
    mkdirSync(dir, { recursive: true });

    writeFileSync(
      join(dir, "商品管理.csv"),
      "module,title,steps,expected,priority\n商品,验证商品,步骤,预期,P0\n",
    );
    writeFileSync(
      join(dir, "订单管理.csv"),
      "module,title,steps,expected,priority\n订单,验证订单,步骤,预期,P1\n",
    );

    const { code, stdout } = run([
      "--path",
      dir,
      "--project",
      TEST_PROJECT,
      "--module",
      "商品",
      "--detect",
    ]);
    expect(code).toBe(0);

    const entries = JSON.parse(stdout) as { path: string }[];
    expect(entries.length).toBe(1);
    expect(entries[0].path.includes("商品管理")).toBeTruthy();
  });
});

describe("history-convert --include-paths whitelist", () => {
  it("only converts rows whose 所属模块 matches a whitelisted path", () => {
    const whitelistFile = join(import.meta.dirname, "fixtures/include-paths.txt");
    const csvFile = join(TMP_DIR, "include-paths.csv");
    const outFile = join(TMP_DIR, "filtered.md");
    writeFileSync(
      csvFile,
      [
        "用例编号,所属产品,所属模块,相关需求,用例标题,前置条件,步骤,预期,实际情况,关键词,优先级,用例类型",
        "1,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/规则校验详细结果表(#9334),【岚图】规则校验详细结果表(#15001),验证规则校验详情,无,1. 进入规则校验详情,1. 进入成功,,,1,功能测试",
        "2,数据资产_STD(#23),/版本迭代测试用例/v6.4.3/质量报告管理(#9341),【岚图】质量报告管理(#15002),验证质量报告下载,无,1. 进入质量报告,1. 进入成功,,,1,功能测试",
      ].join("\n"),
      "utf8",
    );

    const result = run([
      "--path",
      csvFile,
      "--project",
      TEST_PROJECT,
      "--output",
      outFile,
      "--group-by-version",
      "--include-paths",
      whitelistFile,
    ]);
    expect(result.code).toBe(0);
    const content = readFileSync(outFile, "utf8");
    expect(content).toContain("### 规则校验详细结果表");
    expect(content).not.toContain("### 质量报告管理");
  });
});

describe("history-convert error handling", () => {
  it("exits with code 1 for non-existent path", () => {
    const { code, stderr } = run([
      "--path",
      "/tmp/non-existent-history-path-xyz",
      "--project",
      TEST_PROJECT,
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/path not found|Error/i);
  });

  it("output JSON has required top-level fields", () => {
    const dir = join(TMP_DIR, "shape-test");
    mkdirSync(dir, { recursive: true });

    const { code, stdout } = run(["--path", dir, "--project", TEST_PROJECT]);
    expect(code).toBe(0);
    const out = JSON.parse(stdout) as Record<string, unknown>;
    expect("converted" in out).toBeTruthy();
    expect("skipped" in out).toBeTruthy();
    expect("failed" in out).toBeTruthy();
    expect("files" in out).toBeTruthy();
  });

  it("exits with a helpful error for invalid --level", () => {
    const { code, stderr } = run([
      "--path",
      FIXTURE_CSV,
      "--project",
      TEST_PROJECT,
      "--level",
      "banana",
    ]);
    expect(code).toBe(1);
    expect(stderr).toMatch(/invalid --level/i);
    expect(stderr).toMatch(/1=P0/);
  });
});

describe("history-convert --no-split XMind", () => {
  /**
   * Build a minimal .xmind file (ZIP with content.json) containing two L1 nodes.
   */
  async function createTestXmind(outputPath: string): Promise<void> {
    const { default: JSZip } = await import("jszip");
    // Structure: Root → L1 → L2(module) → case(with marker, ≥2 steps) → step → expected
    // Cases must have ≥2 steps so parent nodes aren't misidentified as cases by isCaseNode heuristic
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "需求A（#1001）",
                children: {
                  attached: [
                    {
                      title: "模块A1",
                      children: {
                        attached: [
                          {
                            title: "验证A功能",
                            markers: [{ markerId: "priority-1" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤A-1",
                                  children: {
                                    attached: [{ title: "预期A-1" }],
                                  },
                                },
                                {
                                  title: "步骤A-2",
                                  children: {
                                    attached: [{ title: "预期A-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                title: "需求B（#1002）",
                children: {
                  attached: [
                    {
                      title: "模块B1",
                      children: {
                        attached: [
                          {
                            title: "验证B功能",
                            markers: [{ markerId: "priority-2" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤B-1",
                                  children: {
                                    attached: [{ title: "预期B-1" }],
                                  },
                                },
                                {
                                  title: "步骤B-2",
                                  children: {
                                    attached: [{ title: "预期B-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ];

    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    writeFileSync(outputPath, buffer);
  }

  it("merges all L1 nodes into a single file", async () => {
    const xmindFile = join(TMP_DIR, "multi-l1-test.xmind");
    await createTestXmind(xmindFile);

    const { code, stdout } = run([
      "--path",
      xmindFile,
      "--project",
      TEST_PROJECT,
      "--no-split",
      "--force",
    ]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; caseCount?: number; status: string }[];
    };
    expect(out.converted).toBe(1);
    expect(out.files.length).toBe(1);
    expect(out.files[0].caseCount).toBe(2);

    const content = readFileSync(out.files[0].output, "utf8");
    // Frontmatter should have merged suite_name
    expect(content).toMatch(/suite_name/);
    expect(content).toMatch(/case_count: 2/);
    // L1 titles should be H2
    expect(content).toMatch(/## 需求A（#1001）/);
    expect(content).toMatch(/## 需求B（#1002）/);
    // L2 modules should be H3
    expect(content).toMatch(/### 模块A1/);
    expect(content).toMatch(/### 模块B1/);
    // Both cases should be present
    expect(content).toMatch(/验证A功能/);
    expect(content).toMatch(/验证B功能/);
  });

  it("without --no-split produces separate files per L1", async () => {
    const xmindFile = join(TMP_DIR, "multi-l1-split.xmind");
    await createTestXmind(xmindFile);

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; status: string }[];
    };
    expect(out.converted).toBe(2);

    const outputs = out.files.map((entry) => entry.output).sort();
    // L1 titles 需求A / 需求B → sanitizeFilename strips non-ASCII and appends a
    // deterministic short hash so paths stay CLAUDE.md-compliant (lowercase ASCII).
    expect(outputs[0]).toMatch(/features\/\d{6}-a-[0-9a-z]+\/archive\.md$/);
    expect(outputs[1]).toMatch(/features\/\d{6}-b-[0-9a-z]+\/archive\.md$/);

    const firstContent = readFileSync(outputs[0], "utf8");
    const secondContent = readFileSync(outputs[1], "utf8");

    expect(firstContent).toMatch(/suite_name: "需求A（#1001）"/);
    expect(firstContent).toMatch(/case_id: 1001/);
    expect(secondContent).toMatch(/suite_name: "需求B（#1002）"/);
    expect(secondContent).toMatch(/case_id: 1002/);
  });

  it("merges duplicate L1 titles into one requirement file when splitting", async () => {
    const { default: JSZip } = await import("jszip");
    const xmindFile = join(TMP_DIR, "duplicate-l1-split.xmind");
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "重复需求（#2001）",
                children: {
                  attached: [
                    {
                      title: "模块A",
                      children: {
                        attached: [
                          {
                            title: "验证A功能",
                            markers: [{ markerId: "priority-1" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤A-1",
                                  children: {
                                    attached: [{ title: "预期A-1" }],
                                  },
                                },
                                {
                                  title: "步骤A-2",
                                  children: {
                                    attached: [{ title: "预期A-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                title: "重复需求（#2001）",
                children: {
                  attached: [
                    {
                      title: "模块B",
                      children: {
                        attached: [
                          {
                            title: "验证B功能",
                            markers: [{ markerId: "priority-2" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤B-1",
                                  children: {
                                    attached: [{ title: "预期B-1" }],
                                  },
                                },
                                {
                                  title: "步骤B-2",
                                  children: {
                                    attached: [{ title: "预期B-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ];
    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content));
    writeFileSync(xmindFile, await zip.generateAsync({ type: "nodebuffer" }));

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; caseCount?: number; status: string }[];
    };
    expect(out.converted).toBe(1);
    expect(out.files[0].caseCount).toBe(2);
    // 重复需求 contains no ASCII → falls back to `case-{hash}` (CLAUDE.md slug rule).
    expect(out.files[0].output).toMatch(/features\/\d{6}-case-[0-9a-z]+\/archive\.md$/);

    const contentText = readFileSync(out.files[0].output, "utf8");
    expect(contentText).toMatch(/suite_name: "重复需求（#2001）"/);
    expect(contentText).toMatch(/case_count: 2/);
    expect(contentText).toMatch(/## 模块A/);
    expect(contentText).toMatch(/## 模块B/);
    expect(contentText).toMatch(/验证A功能/);
    expect(contentText).toMatch(/验证B功能/);
  });

  it("extracts case_id when the ticket token is followed by extra title markers", async () => {
    const { default: JSZip } = await import("jszip");
    const xmindFile = join(TMP_DIR, "case-id-before-marker.xmind");
    const content = [
      {
        rootTopic: {
          title: "Root",
          children: {
            attached: [
              {
                title: "需求A（#3001）【需求变更】",
                children: {
                  attached: [
                    {
                      title: "模块A",
                      children: {
                        attached: [
                          {
                            title: "验证A功能",
                            markers: [{ markerId: "priority-1" }],
                            children: {
                              attached: [
                                {
                                  title: "步骤A-1",
                                  children: {
                                    attached: [{ title: "预期A-1" }],
                                  },
                                },
                                {
                                  title: "步骤A-2",
                                  children: {
                                    attached: [{ title: "预期A-2" }],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ];
    const zip = new JSZip();
    zip.file("content.json", JSON.stringify(content));
    writeFileSync(xmindFile, await zip.generateAsync({ type: "nodebuffer" }));

    const { code, stdout } = run(["--path", xmindFile, "--project", TEST_PROJECT, "--force"]);
    expect(code).toBe(0);

    const out = JSON.parse(stdout) as {
      converted: number;
      files: { output: string; status: string }[];
    };
    expect(out.converted).toBe(1);
    expect(out.files[0].output).toMatch(/features\/\d{6}-a-[0-9a-z]+\/archive\.md$/);

    const contentText = readFileSync(out.files[0].output, "utf8");
    expect(contentText).toMatch(/suite_name: "需求A（#3001）【需求变更】"/);
    expect(contentText).toMatch(/case_id: 3001/);
  });
});
