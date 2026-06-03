import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
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
