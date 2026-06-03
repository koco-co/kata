import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildCreatePayload,
  createUrl,
  loadZentaoConfig,
  mapPriority,
  mapSeverity,
  parseCreateResponse,
} from "../create.ts";

const CONFIG = resolve(fileURLToPath(new URL(".", import.meta.url)), "../zentao.config.yaml");

describe("loadZentaoConfig", () => {
  it("loads defaults from yaml", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(c.product, 23);
    assert.equal(c.assignee.account, "xianglin");
    assert.equal(c.opened_build, "trunk");
    assert.equal(c.bug_type, "codeerror");
  });
  it("throws on missing file", () => {
    assert.throws(() => loadZentaoConfig("/no/such.yaml"));
  });
});

describe("mapSeverity / mapPriority", () => {
  it("maps severity via table, default 3", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(mapSeverity(c, "critical"), 1);
    assert.equal(mapSeverity(c, "major"), 2);
    assert.equal(mapSeverity(c, "unknown" as never), 3);
  });
  it("maps priority, default 3 when absent", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(mapPriority(c, 1), 1);
    assert.equal(mapPriority(c, undefined), 3);
  });
});

describe("buildCreatePayload", () => {
  it("maps BugReport + config into zentao form fields", () => {
    const c = loadZentaoConfig(CONFIG);
    const report = {
      title: "NPE",
      severity: "major",
      summary: "s",
      problem_type: "代码问题",
    } as never;
    const payload = buildCreatePayload(report, c, "<table>steps</table>");
    assert.equal(payload.product, "23");
    assert.equal(payload.assignedTo, "xianglin");
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
    const c = loadZentaoConfig(CONFIG);
    assert.equal(
      createUrl("http://zenpms.dtstack.cn", c),
      "http://zenpms.dtstack.cn/zentao/bug-create-23-0-moduleID=0.html",
    );
  });
});

describe("parseCreateResponse", () => {
  const base = "http://zenpms.dtstack.cn";
  it("parses success with explicit id", () => {
    const r = parseCreateResponse('{"result":"success","id":152151}', base, "标题");
    assert.equal(r.ok, true);
    assert.equal(r.bug_id, 152151);
    assert.equal(r.url, "http://zenpms.dtstack.cn/zentao/bug-view-152151.html");
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

const CREATE_TS = resolve(fileURLToPath(new URL(".", import.meta.url)), "../create.ts");
const PROJECT_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../");
const TMP = join(tmpdir(), `zentao-create-test-${process.pid}`);
afterEach(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});

function runCli(args: string[]): { code: number; stdout: string } {
  try {
    const stdout = execFileSync("bun", ["run", CREATE_TS, ...args], {
      encoding: "utf8",
      cwd: PROJECT_ROOT,
      env: { ...process.env, KATA_ZENTAO_BASE_URL: "http://zenpms.dtstack.cn" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    return { code: e.status ?? 1, stdout: e.stdout ?? "" };
  }
}

describe("CLI: --dry-run", () => {
  it("assembles fields without posting", () => {
    mkdirSync(TMP, { recursive: true });
    const jsonPath = join(TMP, "bug.json");
    writeFileSync(
      jsonPath,
      JSON.stringify({ title: "示例", severity: "major", summary: "s", problem_type: "代码问题" }),
    );
    const { code, stdout } = runCli(["--json", jsonPath, "--dry-run"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as {
      ok: boolean;
      dryRun: boolean;
      fields: Record<string, string>;
    };
    assert.equal(out.dryRun, true);
    assert.equal(out.fields.assignedTo, "xianglin");
    assert.equal(out.fields.severity, "2");
  });
});

describe("CLI: missing --json", () => {
  it("exits non-zero", () => {
    const { code } = runCli(["--dry-run"]);
    assert.notEqual(code, 0);
  });
});
