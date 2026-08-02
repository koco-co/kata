import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildCreatePayload,
  createUrl,
  loadZentaoCreateConfig,
  mapPriority,
  mapSeverity,
  parseCreateResponse,
} from "../../../cli/integrations/zentao/create.ts";
import { lintMarkdownReport, parseBugReportMarkdown } from "../../../cli/lib/defect-report.ts";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = resolve(TEST_DIR, "../../..");
const CONFIG = join(PROJECT_ROOT, "config/examples/integrations/zentao.example.yaml");

describe("loadZentaoCreateConfig", () => {
  it("loads defaults from yaml", () => {
    const c = loadZentaoCreateConfig(CONFIG);
    assert.equal(c.product, 100);
    assert.equal(c.assignee.account, "example-qa");
    assert.equal(c.opened_build, "trunk");
    assert.equal(c.bug_type, "codeerror");
  });
  it("throws on missing file", () => {
    assert.throws(() => loadZentaoCreateConfig("/no/such.yaml"));
  });
  it("requires the canonical nested create mapping", () => {
    const legacy = join(tmpdir(), `zentao-legacy-config-${process.pid}.yaml`);
    writeFileSync(legacy, "product: 100\nassignee:\n  account: qa\nopened_build: trunk\n");
    try {
      assert.throws(() => loadZentaoCreateConfig(legacy), /create/);
    } finally {
      rmSync(legacy, { force: true });
    }
  });
  it("does not retain a second tracked config authority under the integration", () => {
    assert.equal(
      existsSync(join(PROJECT_ROOT, "cli/integrations/zentao/zentao.config.yaml")),
      false,
    );
  });
});

describe("ZenTao create library boundary", () => {
  it("returns results or throws instead of writing CLI output", () => {
    const source = readFileSync(resolve(PROJECT_ROOT, "cli/integrations/zentao/create.ts"), "utf8");
    assert.equal(source.includes("process.exit("), false);
    assert.equal(source.includes("process.stdout.write"), false);
  });
});

describe("mapSeverity / mapPriority", () => {
  it("maps severity via table, default 3", () => {
    const c = loadZentaoCreateConfig(CONFIG);
    assert.equal(mapSeverity(c, "critical"), 1);
    assert.equal(mapSeverity(c, "major"), 2);
    assert.equal(mapSeverity(c, "unknown" as never), 3);
  });
  it("maps priority, default 3 when absent", () => {
    const c = loadZentaoCreateConfig(CONFIG);
    assert.equal(mapPriority(c, 1), 1);
    assert.equal(mapPriority(c, undefined), 3);
  });
});

describe("buildCreatePayload", () => {
  it("maps BugReport + config into zentao form fields", () => {
    const c = loadZentaoCreateConfig(CONFIG);
    const report = {
      title: "NPE",
      severity: "major",
      summary: "s",
      problem_type: "代码问题",
    } as never;
    const payload = buildCreatePayload(report, c, "<table>steps</table>");
    assert.equal(payload.product, "100");
    assert.equal(payload.assignedTo, "example-qa");
    assert.equal(payload.openedBuild, "trunk");
    assert.equal(payload.severity, "2");
    assert.equal(payload.pri, "3");
    assert.equal(payload.type, "codeerror");
    assert.equal(payload.title, "NPE");
    assert.equal(payload.steps, "<table>steps</table>");
  });
});

describe("createUrl", () => {
  it("builds PATH_INFO create endpoint", () => {
    const c = loadZentaoCreateConfig(CONFIG);
    assert.equal(
      createUrl("https://zentao.example.cn", c),
      "https://zentao.example.cn/zentao/bug-create-100-0-moduleID=0.html",
    );
  });
});

describe("parseCreateResponse", () => {
  const base = "https://zentao.example.cn";
  it("parses success with explicit id", () => {
    const r = parseCreateResponse('{"result":"success","id":152151}', base, "标题");
    assert.equal(r.ok, true);
    assert.equal(r.bug_id, 152151);
    assert.equal(r.url, "https://zentao.example.cn/zentao/bug-view-152151.html");
    assert.equal(r.title, "标题");
  });
  it("parses success id from locate url", () => {
    const r = parseCreateResponse(
      '{"result":"success","locate":"/zentao/bug-view-99.html"}',
      base,
      "t",
    );
    assert.equal(r.ok, true);
    assert.equal(r.bug_id, 99);
  });
  it("parses success id from nested bugID= query", () => {
    const r = parseCreateResponse(
      '{"result":"success","load":{"locate":"/index.php?m=bug&f=view&bugID=152189"}}',
      base,
      "t",
    );
    assert.equal(r.ok, true);
    assert.equal(r.bug_id, 152189);
    assert.equal(r.url, "https://zentao.example.cn/zentao/bug-view-152189.html");
  });
  it("treats success without any id as ok with a note", () => {
    const r = parseCreateResponse('{"result":"success","message":"保存成功"}', base, "t");
    assert.equal(r.ok, true);
    assert.equal(r.bug_id, undefined);
    assert.equal(r.url, undefined);
    assert.ok(r.note);
  });
  it("parses fail with message", () => {
    const r = parseCreateResponse('{"result":"fail","message":{"title":"必填"}}', base, "t");
    assert.equal(r.ok, false);
    assert.ok(r.error?.includes("必填"));
  });
  it("returns error for unparseable response", () => {
    const r = parseCreateResponse("<html>登录</html>", base, "t");
    assert.equal(r.ok, false);
  });
});

const KATA_TS = join(PROJECT_ROOT, "cli/bin/kata.ts");
const TMP = join(tmpdir(), `zentao-create-test-${process.pid}`);
afterEach(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});

function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  const cliRoot = join(TMP, "repo");
  mkdirSync(join(cliRoot, "workspace"), { recursive: true });
  mkdirSync(join(cliRoot, "config", "private", "integrations"), { recursive: true });
  writeFileSync(join(cliRoot, "package.json"), '{"name":"kata-zentao-create-test"}\n');
  writeFileSync(
    join(cliRoot, "config", "private", "integrations", "zentao.yaml"),
    readFileSync(CONFIG, "utf8"),
  );
  try {
    const stdout = execFileSync("bun", [KATA_TS, "zentao", "create", ...args], {
      encoding: "utf8",
      cwd: cliRoot,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

describe("CLI: canonical config", () => {
  it("uses config/private/integrations/zentao.yaml without a second --config route", () => {
    const help = execFileSync("bun", [KATA_TS, "zentao", "create", "--help"], {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
    });
    assert.equal(help.includes("--config"), false);
    assert.ok(help.includes("config/private/integrations/zentao.yaml"));
  });
});

describe("CLI: --dry-run", () => {
  it("assembles fields without posting", () => {
    mkdirSync(TMP, { recursive: true });
    const reportPath = join(TMP, "bug-report.md");
    writeFileSync(
      reportPath,
      [
        "# 示例",
        "",
        "- 严重程度: major",
        "## 结论",
        "问题可复现",
        "",
        "## 证据",
        "日志显示错误",
        "",
        "## 实际行为",
        "页面报错",
        "",
        "## 预期行为",
        "页面成功",
        "",
        "## 复现步骤",
        "1. 打开页面",
        "",
        "## 根因",
        "代码路径异常",
        "",
        "## 建议",
        "修复代码",
        "",
      ].join("\n"),
    );
    const { code, stdout, stderr } = runCli(["--report", reportPath, "--dry-run"]);
    assert.equal(code, 0, stderr);
    const out = JSON.parse(stdout) as {
      ok: boolean;
      dryRun: boolean;
      fields: Record<string, string>;
    };
    assert.equal(out.dryRun, true);
    assert.equal(out.fields.assignedTo, "example-qa");
    assert.equal(out.fields.severity, "2");
  });
});

describe("CLI: missing --report", () => {
  it("exits non-zero", () => {
    const { code } = runCli(["--dry-run"]);
    assert.notEqual(code, 0);
  });
});

describe("CLI: unreadable report", () => {
  it("exits 1 with a diagnostic on stderr", () => {
    const { code, stdout, stderr } = runCli([
      "--report",
      join(TMP, "no-such-report.md"),
      "--dry-run",
    ]);
    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.ok(stderr.includes("读取/校验 BugReport 失败"), `got: ${stderr}`);
  });
});

// 缺陷模板（defect-analyze bug-report）→ lint → parseBugReportMarkdown → 建单 payload
// 的严重程度链路：模板里 `- 严重程度：` 行必须能被解析并映射成禅道 severity 数字。
describe("severity chain (template → lint → payload)", () => {
  it("bug 模板含 - 严重程度 行，填充后 lint 通过且严重程度进入 payload", () => {
    const tpl = readFileSync(
      join(PROJECT_ROOT, ".claude/skills/defect-analyze/templates/bug-report.md"),
      "utf8",
    );
    assert.match(tpl, /^[-*]\s*严重程度[：:]/m, "bug 模板应包含 - 严重程度： 行");

    const filled = tpl
      .replace(/^# .*$/m, "# 示例标题")
      .replace(/^[-*]\s*严重程度.*$/m, "- 严重程度: major")
      // lint 契约要求严重程度行落在「结论」章节内；模板头部的字段行填充后保留
      .replace(/^(## 结论)\s*$/m, "$1\n\n- 严重程度: major")
      .replace(/^（.*）$/gm, "已核实的占位内容")
      .replace(/<[^>]*>/g, "示例");
    const reportPath = join(TMP, "analyses/bug-report/202607/severity-chain.md");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, filled);

    const lint = lintMarkdownReport(reportPath);
    assert.deepEqual(lint.violations, [], "填充后的模板报告应通过 lint");

    const report = parseBugReportMarkdown(reportPath);
    assert.equal(report.severity, "major");
    const payload = buildCreatePayload(report, loadZentaoCreateConfig(CONFIG), "<p>steps</p>");
    assert.equal(payload.severity, "2");
  });
});
