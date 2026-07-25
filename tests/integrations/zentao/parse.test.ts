import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseBugPayload } from "../../../cli/integrations/zentao/parse.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const inner = JSON.parse(readFileSync(join(__dirname, "fixtures/bug-synthetic.json"), "utf8"));
// 真实禅道把 data 作为 JSON 字符串包在外层 {status,data}
const RESPONSE = JSON.stringify({ status: "success", data: JSON.stringify(inner) });

describe("parseBugPayload", () => {
  it("extracts id and title", () => {
    const r = parseBugPayload(RESPONSE);
    assert.equal(r?.bug_id, 9001);
    assert.equal(r?.title, "【合成】总览统计与规则库不一致");
  });

  it("normalizes scalar fields", () => {
    const r = parseBugPayload(RESPONSE);
    assert.equal(r?.fields.severity, "normal");
    assert.equal(r?.fields.priority, 2);
    assert.equal(r?.fields.status, "resolved");
    assert.equal(r?.fields.confirmed, true);
    assert.equal(r?.fields.customer, "合成客户_X");
    assert.equal(r?.fields.engine, "HDP_HDP 2.6.0.0");
  });

  it("resolves user codes and build codes to display names", () => {
    const r = parseBugPayload(RESPONSE);
    assert.equal(r?.fields.opened_by, "爱丽丝");
    assert.equal(r?.fields.resolved_by, "鲍勃"); // 取 | 前第一段
    assert.equal(r?.fields.assigned_to, "卡萝");
    assert.equal(r?.fields.resolved_build, "主干");
  });

  it("prefers gitBranch1 for fix_branch", () => {
    const r = parseBugPayload(RESPONSE);
    assert.equal(r?.fields.fix_branch, "hotfix_9.9.x_synth_9001");
    assert.deepEqual(r?.fields.git_projects, ["group/repo-a"]);
  });

  it("cleans steps html into markdown", () => {
    const r = parseBugPayload(RESPONSE);
    assert.ok(r?.sections.steps_md.includes("现象：接口/x/y/z 统计为 37"));
    assert.ok(r?.sections.steps_md.includes("![](/zentao/file-read-1.png)"));
  });

  it("extracts resolution narrative from actions", () => {
    const r = parseBugPayload(RESPONSE);
    assert.ok(r?.sections.resolution_md.includes("问题原因："));
    assert.ok(r?.sections.resolution_md.includes("解决方案：提供增量SQL"));
    assert.ok(r?.sections.resolution_md.includes("修复分支：custome/hotfix_9.9.x_synth_9001"));
  });

  it("builds history with resolved names and cleaned comments", () => {
    const r = parseBugPayload(RESPONSE);
    assert.equal(r?.history.length, 2);
    const resolved = r?.history.find((h) => h.action === "resolved");
    assert.equal(resolved?.actor, "鲍勃");
    assert.ok(resolved?.comment_md.includes("问题原因："));
  });

  it("falls back to resolution text when git branches empty", () => {
    const noBranch = JSON.parse(JSON.stringify(inner));
    noBranch.bug.gitBranch1 = "";
    noBranch.bug.gitProjectBranch = "";
    const resp = JSON.stringify({ status: "success", data: JSON.stringify(noBranch) });
    const r = parseBugPayload(resp);
    assert.equal(r?.fields.fix_branch, "custome/hotfix_9.9.x_synth_9001");
  });

  it("returns null for login html / non-json", () => {
    assert.equal(parseBugPayload("<html>user-login</html>"), null);
    assert.equal(parseBugPayload("not json"), null);
  });
});
