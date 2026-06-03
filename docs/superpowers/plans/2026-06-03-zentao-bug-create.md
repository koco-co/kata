# 禅道 Bug 自动创建集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `defect-analyze` 的 bug 模式在生成报告后，经用户确认即调用禅道集成自动创建 bug（指派向林、正文复用 zentao variant 富文本、配置外置）。

**Architecture:** 扩展现有 `zentao` 插件：抽出共享 HTTP 会话模块 `client.ts`，新增 `create.ts`（读 yaml 默认值 + `.env.local` 密钥，渲染 zentao variant 作 steps，POST 创建 bug）。`defect-analyze` SKILL.md 增加「确认即推送」编排节点，回显固定汇总。

**Tech Stack:** Bun + TypeScript、commander（经 `@shared/lib/cli-runner.ts` 的 `createCli`）、handlebars（报告模板）、`yaml`（配置）；测试：`node:test`（zentao 插件，子进程跑 CLI）/ `bun:test`（bug-report lib，`@shared` 别名）。

**Source spec:** `docs/superpowers/specs/2026-06-03-zentao-bug-create-design.md`

---

## 文件结构

| 动作 | 路径 | 职责 |
| --- | --- | --- |
| 新增 | `.claude/plugins/zentao/client.ts` | 禅道 HTTP 会话：`zentaoLogin` / `parseSessionCookie` / `resolveSession`（账号密码登录，失败回退 cookie） |
| 改 | `.claude/plugins/zentao/fetch.ts` | 改为从 `client.ts` 引入 `zentaoLogin`，删除本地副本（行为不变） |
| 新增 | `.claude/plugins/zentao/create.ts` | 创建 bug CLI：load 配置 → 渲染 steps → 字段映射 → POST → 解析 → 输出 |
| 新增 | `.claude/plugins/zentao/zentao.config.yaml` | 非敏感默认值（product/branch/module/assignee/opened_build/bug_type/severity_map/priority_map） |
| 改 | `.claude/plugins/zentao/plugin.json` | 注册 `create` 命令、补 `KATA_ZENTAO_COOKIE` 说明 |
| 改 | `.claude/scripts/_shared/lib/bug-report-types.ts` | `BugReport` 扩展可选字段 |
| 改 | `.claude/skills/defect-analyze/templates/bug-report-zentao.html.hbs` | 重排区块 = 定稿 mockup v5 |
| 改 | `.claude/scripts/_shared/tests/bug-report/render.test.ts` | 新 zentao 模板断言 |
| 新增 | `.claude/plugins/zentao/__tests__/client.test.ts` | `parseSessionCookie` 纯函数测试 |
| 新增 | `.claude/plugins/zentao/__tests__/create.test.ts` | 配置加载/映射/payload/响应解析/CLI dry-run/错误分支 |
| 改 | `.claude/skills/defect-analyze/SKILL.md` | 增加「推送禅道」编排节点 + 固定汇总模板 + 单一建议纪律 |

> **约束**：全程走 detached worktree；`workspace/{project}/.kata/repos/**` 只读。改 SKILL.md 须保持 `bun run check:skills` 绿、不破坏 frontmatter 11 字段白名单与行数上限。

---

## Task 0: 准备隔离 worktree（一次性）

**Files:** 无（仅 git 操作）

- [ ] **Step 1: 提交主工作树现有改动作为 pre-worktree 快照**

```bash
cd /Users/poco/Projects/kata
git add -A && git commit -m "chore: 🧹 save pre-worktree local changes" || echo "nothing to commit"
```

- [ ] **Step 2: 创建 detached worktree 并 symlink 运行时目录**

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/zentao-create"
git worktree add --detach "$W" main
# 本任务无需读 workspace 源码证据；如后续需要再 symlink .kata
echo "worktree at $W"
```

- [ ] **Step 3: 在 worktree 内安装依赖（若 node_modules 未共享）**

Run: `cd "$W" && bun install`
Expected: 依赖就绪，无报错。

> 后续所有任务在 `$W` 内执行；最终验证通过后记下 HEAD SHA，回主工作树 `git merge --no-ff <sha>`。

---

## Task 1: 抽取共享 HTTP 会话模块 `client.ts`

**Files:**
- Create: `.claude/plugins/zentao/client.ts`
- Test: `.claude/plugins/zentao/__tests__/client.test.ts`
- Modify: `.claude/plugins/zentao/fetch.ts:206-280`（删除本地 `zentaoLogin` + `LoginResult`，改为 import）

- [ ] **Step 1: 写失败测试 `client.test.ts`**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSessionCookie } from "../client.ts";

describe("parseSessionCookie", () => {
  it("picks zentaosid from Set-Cookie", () => {
    assert.equal(
      parseSessionCookie("zentaosid=abc123; path=/, other=x; path=/"),
      "zentaosid=abc123",
    );
  });
  it("picks PHPSESSID when zentaosid absent", () => {
    assert.equal(parseSessionCookie("PHPSESSID=xyz; path=/"), "PHPSESSID=xyz");
  });
  it("falls back to first cookie pair", () => {
    assert.equal(parseSessionCookie("foo=bar; path=/"), "foo=bar");
  });
  it("returns null for null/empty", () => {
    assert.equal(parseSessionCookie(null), null);
    assert.equal(parseSessionCookie(""), null);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/client.test.ts`
Expected: FAIL —— `Cannot find module '../client.ts'`。

- [ ] **Step 3: 写 `client.ts`**

```ts
#!/usr/bin/env bun
/**
 * plugins/zentao/client.ts — 禅道 HTTP 会话工具（登录 + cookie 解析 + 会话回退）
 * fetch.ts 与 create.ts 共用。
 */
import { getEnv } from "@shared/lib/env.ts";

export interface LoginResult {
  cookie: string;
}

/** Parse the session cookie (zentaosid/PHPSESSID) from a Set-Cookie header. */
export function parseSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const parts = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter((s) => s.includes("="));
  return (
    parts.find((s) => s.startsWith("zentaosid=") || s.startsWith("PHPSESSID=")) ??
    parts[0] ??
    null
  );
}

/** Log in to ZenTao with account + password; returns a session cookie. */
export async function zentaoLogin(
  baseUrl: string,
  account: string,
  password: string,
): Promise<LoginResult> {
  const loginUrl = `${baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(account)}&password=${encodeURIComponent(password)}`;
  let response: Response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "kata/2.0 zentao-plugin",
        Accept: "application/json",
      },
      body,
    });
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), {
      code: "NETWORK_ERROR",
    });
  }
  if (!response.ok) {
    throw Object.assign(new Error(`禅道登录失败，HTTP ${response.status}`), {
      code: "LOGIN_FAILED",
    });
  }
  const cookie = parseSessionCookie(response.headers.get("set-cookie"));
  if (cookie) return { cookie };
  // 部分禅道版本把 token 放在 JSON body
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    // ignore
  }
  const b = parsed as Record<string, unknown> | undefined;
  if (b?.sessionID || b?.token || b?.sid) {
    return { cookie: `zentaosid=${String(b.sessionID ?? b.token ?? b.sid)}` };
  }
  throw Object.assign(new Error("禅道登录失败：响应中没有 Set-Cookie 头"), {
    code: "LOGIN_FAILED",
  });
}

/**
 * Resolve a usable session cookie: account/password login first,
 * fall back to KATA_ZENTAO_COOKIE when login fails or creds are absent.
 */
export async function resolveSession(): Promise<string> {
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  const account = getEnv("KATA_ZENTAO_ACCOUNT");
  const password = getEnv("KATA_ZENTAO_PASSWORD");
  const fallback = getEnv("KATA_ZENTAO_COOKIE");
  if (baseUrl && account && password) {
    try {
      const { cookie } = await zentaoLogin(baseUrl, account, password);
      return cookie;
    } catch (err) {
      if (fallback) return fallback;
      throw err;
    }
  }
  if (fallback) return fallback;
  throw Object.assign(
    new Error("缺少禅道凭据：请配置 KATA_ZENTAO_ACCOUNT/PASSWORD 或 KATA_ZENTAO_COOKIE"),
    { code: "NO_CREDENTIALS" },
  );
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/client.test.ts`
Expected: PASS（4 个 it 全过）。

- [ ] **Step 5: 改 `fetch.ts` 复用 client.ts**

在 `fetch.ts` 顶部 import 增加：`import { zentaoLogin } from "./client.ts";`
删除 `fetch.ts` 第 206-280 行的 `interface LoginResult { ... }` 与本地 `async function zentaoLogin(...) { ... }`（整段移除，保留 `zentaoFetchBug` 及其它）。`run()` 内对 `zentaoLogin` 的调用保持不变。

- [ ] **Step 6: 运行 fetch 测试确认仍绿**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/fetch.test.ts`
Expected: PASS（抽取后行为不变）。

- [ ] **Step 7: Commit**

```bash
cd "$W"
git add .claude/plugins/zentao/client.ts .claude/plugins/zentao/__tests__/client.test.ts .claude/plugins/zentao/fetch.ts
git commit -m "refactor: ✨ extract shared zentao http session client"
```

## Task 2: 扩展 `BugReport` 类型

**Files:**
- Modify: `.claude/scripts/_shared/lib/bug-report-types.ts:26-79`
- Test: `.claude/scripts/_shared/tests/bug-report/validate.test.ts`

- [ ] **Step 1: 写失败测试（新可选字段透传）**

在 `validate.test.ts` 末尾追加：

```ts
import { describe, expect, test } from "bun:test";
import { validateBugReport } from "@shared/lib/bug-report-render.ts" // 若已 import 则跳过

describe("validateBugReport — extended optional fields", () => {
  test("passes through tenant/account/datasource/error_info/repro/expected/actual", () => {
    const r = validateBugReport({
      title: "t",
      summary: "s",
      problem_type: "代码问题",
      severity: "major",
      environment: { deploy_env: "http://x", tenant: "DT_demo", account: "a@b / pw", datasource: "无" },
      error_info: { curl: "curl ...", log: "NPE ..." },
      reproduction_steps: ["a", "b"],
      expected: "ok",
      actual: "fail",
      code_location: { snippet_lines: [{ no: 142, text: "x", error: true }] },
      fix_suggestions: [{ title: "fix", diff_lines: [{ sign: "+", text: "y" }] }],
    });
    expect(r.environment?.tenant).toBe("DT_demo");
    expect(r.error_info?.curl).toContain("curl");
    expect(r.reproduction_steps?.length).toBe(2);
    expect(r.code_location?.snippet_lines?.[0].error).toBe(true);
    expect(r.fix_suggestions?.[0].diff_lines?.[0].sign).toBe("+");
  });
});
```

> 注意 `validate.test.ts` 现有的 import 行；若文件已 `import { validateBugReport } from "@shared/lib/bug-report-validate.ts"`，复用该行，勿重复 import。

- [ ] **Step 2: 运行确认失败（类型缺失导致 TS 报错或断言失败）**

Run: `cd "$W" && bun test .claude/scripts/_shared/tests/bug-report/validate.test.ts`
Expected: FAIL（新属性不在类型上 / 断言取到 undefined）。

- [ ] **Step 3: 扩展类型**

在 `bug-report-types.ts` 的 `FixSuggestion` 接口加：

```ts
  diff_lines?: Array<{ sign: " " | "+" | "-"; text: string }>;
```

`BugReport` 的 `environment` 子对象加三个字段：

```ts
  environment?: {
    deploy_env?: string;
    framework?: string;
    java_version?: string;
    source_ref?: string;
    tenant?: string;      // 租户信息（如 DT_demo）
    account?: string;     // 账号信息（如 admin@dtstack.com / DrpEco_2020）
    datasource?: string;  // 数据源信息（默认「无」）
  };
```

`code_location` 子对象加：

```ts
    snippet_lines?: Array<{ no?: number | string; text: string; error?: boolean }>;
```

`BugReport` 顶层加：

```ts
  error_info?: { curl?: string; log?: string };  // 报错信息：CURL信息 + 日志信息
  reproduction_steps?: string[];                  // 复现步骤
  expected?: string;                              // 预期结果
  actual?: string;                                // 实际结果
```

- [ ] **Step 4: 运行确认通过**

Run: `cd "$W" && bun test .claude/scripts/_shared/tests/bug-report/validate.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd "$W"
git add .claude/scripts/_shared/lib/bug-report-types.ts .claude/scripts/_shared/tests/bug-report/validate.test.ts
git commit -m "feat: 🧩 extend BugReport with zentao push fields"
```

---

## Task 3: 改造 `bug-report-zentao.html.hbs`（= 定稿 mockup v5）

**Files:**
- Modify: `.claude/skills/defect-analyze/templates/bug-report-zentao.html.hbs`（整文件替换）
- Test: `.claude/scripts/_shared/tests/bug-report/render.test.ts`

- [ ] **Step 1: 写失败测试（新区块 / 删字段 / diff / 标红 / 单建议 / 无 footer）**

在 `render.test.ts` 的 `describe("renderBugReport", ...)` 内追加：

```ts
test("zentao variant: new layout, drops framework/java_version/source_ref, single suggestion, diff", () => {
  const report = validateBugReport({
    title: "示例 NPE",
    summary: "字段为空触发 NPE",
    problem_type: "代码问题",
    severity: "major",
    confidence: "high",
    confidence_reason: "不应展示",
    environment: {
      deploy_env: "http://shuzhan63-test.k8s.dtstack.cn/",
      framework: "Spring",
      java_version: "1.8",
      source_ref: "abc123",
      tenant: "DT_demo",
      account: "admin@dtstack.com / pw",
      datasource: "Hive(default)",
    },
    error_info: { curl: "curl 'http://x' -H 'Cookie: a=b'", log: "java.lang.NullPointerException" },
    reproduction_steps: ["进入页面", "运行任务", "查看日志"],
    expected: "运行成功",
    actual: "运行失败 NPE",
    stack_trace: { exception_type: "java.lang.NullPointerException", call_chain: [{ class: "X", method: "run", line: 1, is_root: true }] },
    code_location: { file: "X.java", snippet_lines: [{ no: 141, text: "ctx", error: false }, { no: 142, text: "npe here", error: true }] },
    fix_suggestions: [
      { title: "加判空", diff_lines: [{ sign: " ", text: "for(...)" }, { sign: "-", text: "old" }, { sign: "+", text: "new" }] },
      { title: "补单测（不应出现）" },
    ],
  });
  const html = renderBugReport(report, "zentao");
  // 新区块
  expect(html).toContain("环境信息");
  expect(html).toContain("报错信息");
  expect(html).toContain("CURL信息");
  expect(html).toContain("日志信息");
  expect(html).toContain("复现步骤");
  expect(html).toContain("预期结果");
  expect(html).toContain("实际结果");
  expect(html).toContain("根因分析");
  expect(html).toContain("DT_demo");
  expect(html).toContain("admin@dtstack.com");
  expect(html).toContain("Hive(default)");
  // 删除的字段不渲染
  expect(html).not.toContain("JDK 版本");
  expect(html).not.toContain("框架");
  expect(html).not.toContain("源码参考");
  // confidence_reason 文案不展示
  expect(html).not.toContain("不应展示");
  // 单一修复建议
  expect(html).not.toContain("补单测（不应出现）");
  // diff 标记
  expect(html).toContain("background:#14321f"); // + 绿
  expect(html).toContain("background:#3f1d1d"); // - 红
  // 错误行标红
  expect(html).toContain("background:#7f1d1d");
  // 无 footer
  expect(html).not.toContain("Generated by kata");
  expect(html).not.toContain("{{");
});
```

- [ ] **Step 2: 运行确认失败**

Run: `cd "$W" && bun test .claude/scripts/_shared/tests/bug-report/render.test.ts`
Expected: FAIL（旧模板缺新区块、仍含 JDK/框架/footer）。

- [ ] **Step 3: 整文件替换 `bug-report-zentao.html.hbs`**

```hbs
<!--
  禅道富文本编辑器兼容模板（推送 bug 正文）
  - 全部 inline style，无 <style>/flex/grid
  - 区块顺序：标题 → 环境信息 → 报错信息 → 复现步骤 → 预期 → 实际 → 根因分析 → 修复建议
-->
<table cellpadding="0" cellspacing="0" style="width:100%;max-width:900px;border-collapse:collapse;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:14px;line-height:1.6;color:#1a202c;background:#fff;">

  <tr>
    <td style="padding:18px 24px;background:#1e293b;color:#fff;border-radius:6px 6px 0 0;font-size:20px;font-weight:bold;">{{title}}</td>
  </tr>
  <tr><td style="height:16px;"></td></tr>

  <!-- 环境信息 -->
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td colspan="2" style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #3b82f6;">环境信息</td></tr>
      {{#if environment.deploy_env}}<tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">部署环境</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;word-break:break-all;"><a href="{{environment.deploy_env}}" style="color:#2563eb;">{{environment.deploy_env}}</a></td></tr>{{/if}}
      {{#if environment.tenant}}<tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">租户信息</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;">{{environment.tenant}}</td></tr>{{/if}}
      {{#if environment.account}}<tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">账号信息</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;">{{environment.account}}</td></tr>{{/if}}
      <tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;white-space:nowrap;vertical-align:top;">数据源信息</td><td style="padding:8px 16px;">{{#if environment.datasource}}{{environment.datasource}}{{else}}无{{/if}}</td></tr>
    </table>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>

  <!-- 报错信息 -->
  {{#if error_info}}
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #ef4444;">报错信息</td></tr>
      {{#if error_info.curl}}
      <tr><td style="padding:14px 16px 6px;font-weight:bold;color:#334155;font-size:13px;">CURL信息</td></tr>
      <tr><td style="padding:0 16px 12px;"><pre style="background:#0f172a;color:#e2e8f0;padding:12px 14px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin:0;border-radius:4px;">{{error_info.curl}}</pre></td></tr>
      {{/if}}
      {{#if error_info.log}}
      <tr><td style="padding:6px 16px 6px;font-weight:bold;color:#334155;font-size:13px;">日志信息</td></tr>
      <tr><td style="padding:0 16px 16px;"><pre style="background:#1e293b;color:#fca5a5;padding:12px 14px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin:0;border-radius:4px;">{{error_info.log}}</pre></td></tr>
      {{/if}}
    </table>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  {{/if}}

  <!-- 复现步骤 -->
  {{#if reproduction_steps}}
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #3b82f6;">复现步骤</td></tr>
      <tr><td style="padding:12px 16px 12px 36px;"><ol style="margin:0;padding:0 0 0 4px;">{{#each reproduction_steps}}<li style="margin-bottom:6px;">{{this}}</li>{{/each}}</ol></td></tr>
    </table>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  {{/if}}

  <!-- 预期结果 -->
  {{#if expected}}
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #16a34a;">预期结果</td></tr>
      <tr><td style="padding:12px 16px;background:#f0fdf4;">{{expected}}</td></tr>
    </table>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  {{/if}}

  <!-- 实际结果 -->
  {{#if actual}}
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #ef4444;">实际结果</td></tr>
      <tr><td style="padding:12px 16px;background:#fef2f2;">{{actual}}</td></tr>
    </table>
  </td></tr>
  <tr><td style="height:16px;"></td></tr>
  {{/if}}

  <!-- 根因分析 -->
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td colspan="2" style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #3b82f6;">根因分析</td></tr>
      {{#if summary}}<tr><td colspan="2" style="padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-bottom:1px solid #e2e8f0;"><strong>根因概述：</strong>{{summary}}{{#if confidence}}&nbsp;<span style="display:inline-block;padding:1px 10px;border-radius:10px;font-size:11px;font-weight:bold;color:#fff;background:#16a34a;">置信度 {{confidence}}</span>{{/if}}</td></tr>{{/if}}
      {{#if stack_trace.exception_type}}<tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">异常类型</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;"><code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:13px;">{{stack_trace.exception_type}}</code></td></tr>{{/if}}
      {{#if stack_trace.exception_message}}<tr><td style="padding:8px 16px;width:110px;font-weight:bold;color:#64748b;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">异常消息</td><td style="padding:8px 16px;border-bottom:1px solid #e2e8f0;word-break:break-all;"><code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:13px;">{{stack_trace.exception_message}}</code></td></tr>{{/if}}
      {{#if stack_trace.call_chain}}
      <tr><td colspan="2" style="padding:14px 16px 8px;font-weight:bold;color:#334155;">调用链（从入口到根因）</td></tr>
      <tr><td colspan="2" style="padding:0 16px 14px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;font-family:Consolas,Monaco,monospace;">
          {{#each stack_trace.call_chain}}
          <tr>
            <td style="padding:8px 12px;width:24px;vertical-align:top;text-align:center;">{{#if this.is_root}}<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;"></span>{{else}}{{#if this.is_entry}}<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3b82f6;"></span>{{else}}<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#e2e8f0;"></span>{{/if}}{{/if}}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;"><strong {{#if this.is_root}}style="color:#ef4444"{{/if}}>{{this.class}}</strong>.{{this.method}} (line {{this.line}}){{#if this.description}}<br><span style="color:#64748b;font-size:12px;">{{this.description}}</span>{{/if}}{{#if this.error}}<br><span style="color:#ef4444;font-size:12px;">{{this.error}}</span>{{/if}}</td>
          </tr>
          {{/each}}
        </table>
      </td></tr>
      {{/if}}
      {{#if code_location}}
      <tr><td colspan="2" style="padding:0 16px 16px;">
        {{#if code_location.file}}<p style="font-size:12px;color:#64748b;margin:4px 0 8px;word-break:break-all;"><code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;">{{code_location.file}}</code></p>{{/if}}
        {{#if code_location.snippet_lines}}
        <pre style="background:#1e293b;padding:14px 0;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;overflow-x:auto;margin:0;border-radius:4px;">{{#each code_location.snippet_lines}}<span style="display:block;padding:0 16px;{{#if this.error}}background:#7f1d1d;color:#fecaca;{{else}}color:#e2e8f0;{{/if}}"><span style="display:inline-block;width:28px;color:#64748b;">{{this.no}}</span>  {{this.text}}</span>{{/each}}</pre>
        {{else}}{{#if code_location.snippet}}<pre style="background:#1e293b;color:#e2e8f0;padding:14px 16px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-all;margin:0;border-radius:4px;">{{code_location.snippet}}</pre>{{/if}}{{/if}}
      </td></tr>
      {{/if}}
    </table>
  </td></tr>

  <!-- 修复建议（仅一条） -->
  {{#if fix_suggestions.[0]}}
  <tr><td style="height:16px;"></td></tr>
  <tr><td style="padding:0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e2e8f0;border-collapse:collapse;">
      <tr><td style="padding:12px 16px;font-size:15px;font-weight:bold;background:#f8fafc;border-bottom:2px solid #3b82f6;">修复建议</td></tr>
      {{#with fix_suggestions.[0]}}
      <tr><td style="padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-bottom:1px solid #e2e8f0;"><strong style="font-size:14px;color:#1a202c;">{{this.title}}</strong> <span style="font-size:12px;color:#64748b;">（AI 分析，仅供参考）</span></td></tr>
      {{#if this.diff_lines}}
      <tr><td style="padding:12px 16px 16px;"><pre style="background:#0f172a;padding:14px 0;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.7;overflow-x:auto;margin:0;border-radius:4px;">{{#each this.diff_lines}}<span style="display:block;padding:0 16px;{{#eq this.sign "+"}}background:#14321f;color:#86efac;{{/eq}}{{#eq this.sign "-"}}background:#3f1d1d;color:#fca5a5;{{/eq}}{{#eq this.sign " "}}color:#94a3b8;{{/eq}}">{{this.sign}}{{this.text}}</span>{{/each}}</pre></td></tr>
      {{/if}}
      {{/with}}
    </table>
  </td></tr>
  {{/if}}

</table>
```

- [ ] **Step 4: 运行新断言确认通过 + 跑全 bug-report 套件防回归**

Run: `cd "$W" && bun test .claude/scripts/_shared/tests/bug-report`
Expected: PASS。若某旧用例曾断言 zentao 片段含「JDK 版本/框架/Generated by kata」，按本任务意图更新该断言（这些字段已按设计移除）。

- [ ] **Step 5: Commit**

```bash
cd "$W"
git add .claude/skills/defect-analyze/templates/bug-report-zentao.html.hbs .claude/scripts/_shared/tests/bug-report/render.test.ts
git commit -m "feat: 🧩 revamp zentao bug template for push layout"
```

## Task 4: 配置文件 + 加载/映射（create.ts 第一部分）

**Files:**
- Create: `.claude/plugins/zentao/zentao.config.yaml`
- Create: `.claude/plugins/zentao/create.ts`（先放类型 + `loadZentaoConfig` / `mapSeverity` / `mapPriority`）
- Test: `.claude/plugins/zentao/__tests__/create.test.ts`

- [ ] **Step 1: 写 `zentao.config.yaml`**

```yaml
product: 23
branch: 0
module: 0
assignee:
  account: xianglin
  display: 向林
opened_build: trunk
bug_type: codeerror
severity_map:
  critical: 1
  major: 2
  normal: 3
  minor: 4
priority_map:
  "1": 1
  "2": 2
  "3": 3
  "4": 4
```

- [ ] **Step 2: 写失败测试**

```ts
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadZentaoConfig, mapPriority, mapSeverity } from "../create.ts";

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
```

- [ ] **Step 3: 运行确认失败**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts`
Expected: FAIL（`../create.ts` 不存在）。

- [ ] **Step 4: 写 `create.ts`（第一部分：类型 + 加载 + 映射）**

```ts
#!/usr/bin/env bun
/**
 * plugins/zentao/create.ts — 在禅道创建 bug
 * Contract: docs/superpowers/specs/2026-06-03-zentao-bug-create-design.md
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BugReport } from "@shared/lib/bug-report-types.ts";
import { parse as parseYaml } from "yaml";
import type { Severity } from "@shared/lib/scan-report-types.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ─── 配置 ─────────────────────────────────────────────────────────────────────

export interface ZentaoConfig {
  product: number;
  branch: number;
  module: number;
  assignee: { account: string; display?: string };
  opened_build: string;
  bug_type: string;
  severity_map: Record<string, number>;
  priority_map?: Record<string, number>;
}

/** Load and validate the zentao create config yaml. */
export function loadZentaoConfig(path: string): ZentaoConfig {
  if (!existsSync(path)) throw new Error(`[zentao-create] 配置文件不存在：${path}`);
  const cfg = parseYaml(readFileSync(path, "utf8")) as Partial<ZentaoConfig>;
  if (!cfg || typeof cfg.product !== "number") {
    throw new Error("[zentao-create] 配置无效：缺少 product");
  }
  if (!cfg.assignee?.account) throw new Error("[zentao-create] 配置无效：缺少 assignee.account");
  if (!cfg.opened_build) throw new Error("[zentao-create] 配置无效：缺少 opened_build");
  return {
    product: cfg.product,
    branch: cfg.branch ?? 0,
    module: cfg.module ?? 0,
    assignee: cfg.assignee,
    opened_build: cfg.opened_build,
    bug_type: cfg.bug_type ?? "codeerror",
    severity_map: cfg.severity_map ?? { critical: 1, major: 2, normal: 3, minor: 4 },
    priority_map: cfg.priority_map,
  };
}

/** BugReport.severity → zentao severity 数字（缺省 3）。 */
export function mapSeverity(config: ZentaoConfig, severity: Severity): number {
  return config.severity_map[severity] ?? 3;
}

/** BugReport.priority → zentao pri 数字（缺省 3）。 */
export function mapPriority(config: ZentaoConfig, priority?: number | string): number {
  if (priority == null) return 3;
  return config.priority_map?.[String(priority)] ?? 3;
}
```

- [ ] **Step 5: 运行确认通过**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
cd "$W"
git add .claude/plugins/zentao/zentao.config.yaml .claude/plugins/zentao/create.ts .claude/plugins/zentao/__tests__/create.test.ts
git commit -m "feat: 🧩 add zentao create config and field mapping"
```

---

## Task 5: payload 组装 + 响应解析（create.ts 第二部分）

**Files:**
- Modify: `.claude/plugins/zentao/create.ts`（追加 `buildCreatePayload` / `parseCreateResponse` / `createUrl`）
- Test: `.claude/plugins/zentao/__tests__/create.test.ts`（追加）

- [ ] **Step 1: 追加失败测试**

```ts
import { buildCreatePayload, createUrl, parseCreateResponse } from "../create.ts";

describe("buildCreatePayload", () => {
  it("maps BugReport + config into zentao form fields", () => {
    const c = loadZentaoConfig(CONFIG);
    const report = { title: "NPE", severity: "major", summary: "s", problem_type: "代码问题" } as never;
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
    const r = parseCreateResponse('{"result":"success","locate":"/zentao/bug-view-99.html"}', base, "t");
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
```

- [ ] **Step 2: 运行确认失败**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts`
Expected: FAIL（函数未定义）。

- [ ] **Step 3: 追加实现到 `create.ts`**

```ts
// ─── 创建 payload / 端点 / 响应解析 ─────────────────────────────────────────────

/** Build the PATH_INFO bug-create endpoint URL. */
export function createUrl(baseUrl: string, config: ZentaoConfig): string {
  return `${baseUrl}/zentao/bug-create-${config.product}-${config.branch}-moduleID=${config.module}.html`;
}

/** Map a validated BugReport + config + rendered steps into zentao form fields. */
export function buildCreatePayload(
  report: BugReport,
  config: ZentaoConfig,
  stepsHtml: string,
): Record<string, string> {
  return {
    product: String(config.product),
    branch: String(config.branch),
    module: String(config.module),
    title: report.title,
    assignedTo: config.assignee.account,
    openedBuild: config.opened_build,
    type: config.bug_type,
    severity: String(mapSeverity(config, report.severity)),
    pri: String(mapPriority(config, report.priority)),
    steps: stepsHtml,
  };
}

export interface CreateResult {
  ok: boolean;
  bug_id?: number;
  url?: string;
  title?: string;
  error?: string;
}

/**
 * Parse a zentao bug-create response. Handles standard ajax JSON
 * ({result:'success', id|locate|load} / {result:'fail', message}) and an
 * HTML fallback that contains a bug-view URL.
 */
export function parseCreateResponse(text: string, baseUrl: string, title: string): CreateResult {
  let data: Record<string, unknown> | null = null;
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object") data = j as Record<string, unknown>;
  } catch {
    // not json
  }
  const idToResult = (id: number): CreateResult => ({
    ok: true,
    bug_id: id,
    url: `${baseUrl}/zentao/bug-view-${id}.html`,
    title,
  });
  if (data) {
    const result = data.result ?? data.status;
    if (result === "success") {
      let id = data.id != null ? Number(data.id) : Number.NaN;
      if (Number.isNaN(id)) {
        const locate =
          typeof data.locate === "string"
            ? data.locate
            : typeof data.load === "string"
              ? data.load
              : "";
        const m = locate.match(/bug-view-(\d+)/);
        if (m) id = Number(m[1]);
      }
      if (!Number.isNaN(id)) return idToResult(id);
      return { ok: false, error: "禅道返回 success 但未能解析 bug id" };
    }
    if (result === "fail" || data.message) {
      const msg =
        typeof data.message === "string" ? data.message : JSON.stringify(data.message ?? data);
      return { ok: false, error: `禅道创建失败：${msg}` };
    }
  }
  const m = text.match(/bug-view-(\d+)\.html/);
  if (m) return idToResult(Number(m[1]));
  return { ok: false, error: "禅道返回了无法解析的响应" };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd "$W"
git add .claude/plugins/zentao/create.ts .claude/plugins/zentao/__tests__/create.test.ts
git commit -m "feat: 🧩 add zentao create payload and response parsing"
```

---

## Task 6: create.ts CLI 装配（run + --dry-run）+ 注册 plugin.json

**Files:**
- Modify: `.claude/plugins/zentao/create.ts`（追加 `run` + `createCli` program + 入口）
- Modify: `.claude/plugins/zentao/plugin.json:9-12`
- Test: `.claude/plugins/zentao/__tests__/create.test.ts`（追加 CLI 子进程用例）

- [ ] **Step 1: 追加失败测试（CLI dry-run + 缺 --json）**

```ts
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "node:test";

const CREATE_TS = resolve(fileURLToPath(new URL(".", import.meta.url)), "../create.ts");
const PROJECT_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../../");
const TMP = join(tmpdir(), `zentao-create-test-${process.pid}`);
afterEach(() => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});

function runCli(args: string[]): { code: number; stdout: string } {
  try {
    const stdout = execFileSync("bun", ["run", CREATE_TS, ...args], {
      encoding: "utf8", cwd: PROJECT_ROOT, env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"],
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
    writeFileSync(jsonPath, JSON.stringify({
      title: "示例", severity: "major", summary: "s", problem_type: "代码问题",
    }));
    const { code, stdout } = runCli(["--json", jsonPath, "--dry-run"]);
    assert.equal(code, 0);
    const out = JSON.parse(stdout) as { ok: boolean; dryRun: boolean; fields: Record<string, string> };
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
```

> dry-run 不触网，所以无需禅道凭据；`buildCreatePayload` 只读 yaml + JSON。

- [ ] **Step 2: 运行确认失败**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts`
Expected: FAIL（无 `--dry-run`/run 行为）。

- [ ] **Step 3: 追加 run + CLI 入口到 `create.ts`**

```ts
// ─── 运行 / CLI ────────────────────────────────────────────────────────────────
import { getEnv, initEnv } from "@shared/lib/env.ts";
import { renderBugReport } from "@shared/lib/bug-report-render.ts";
import { validateBugReport } from "@shared/lib/bug-report-validate.ts";
import { createCli } from "@shared/lib/cli-runner.ts";
import { resolveSession } from "./client.ts";

const DEFAULT_CONFIG = resolve(__dirname, "zentao.config.yaml");

function emit(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function run(opts: { json: string; config: string; dryRun: boolean }): Promise<void> {
  initEnv(resolve(__dirname, "../../.env"));
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  if (!baseUrl) {
    emit({ ok: false, error: "缺少 KATA_ZENTAO_BASE_URL" });
    process.exit(1);
  }
  let report: BugReport;
  try {
    report = validateBugReport(JSON.parse(readFileSync(opts.json, "utf8")));
  } catch (e) {
    emit({ ok: false, error: `读取/校验 BugReport 失败：${(e as Error).message}` });
    process.exit(1);
    return;
  }
  const config = loadZentaoConfig(opts.config);
  const steps = renderBugReport(report, "zentao");
  const payload = buildCreatePayload(report, config, steps);

  if (opts.dryRun) {
    emit({
      ok: true,
      dryRun: true,
      endpoint: createUrl(baseUrl, config),
      fields: { ...payload, steps: `<${steps.length} chars>` },
    });
    return;
  }

  let cookie: string;
  try {
    cookie = await resolveSession();
  } catch (e) {
    emit({ ok: false, error: (e as Error).message });
    process.exit(1);
    return;
  }

  let text: string;
  try {
    const res = await fetch(createUrl(baseUrl, config), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookie,
        "User-Agent": "kata/2.0 zentao-plugin",
      },
      body: new URLSearchParams(payload).toString(),
    });
    text = await res.text();
  } catch (e) {
    emit({ ok: false, error: `网络连接失败: ${(e as Error).message}` });
    process.exit(1);
    return;
  }

  const result = parseCreateResponse(text, baseUrl, report.title);
  emit(result);
  if (!result.ok) process.exit(1);
}

export const program = createCli({
  name: "zentao-create",
  description: "在禅道创建 bug（指派固定指派人，正文复用 zentao variant）",
  rootAction: {
    options: [
      { flag: "--json <path>", description: "BugReport JSON 路径", required: true },
      { flag: "--config <path>", description: "禅道配置 yaml", defaultValue: DEFAULT_CONFIG },
      { flag: "--dry-run", description: "只组装不提交，打印将提交的字段" },
    ],
    action: async (opts: { json: string; config: string; dryRun?: boolean }) => {
      await run({ json: opts.json, config: opts.config, dryRun: Boolean(opts.dryRun) });
    },
  },
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
```

> 把这些 `import` 合并到文件顶部 import 区（不要重复 import）；此处分块仅为说明。

- [ ] **Step 4: 注册 `plugin.json` 的 create 命令**

把 `commands` 改为：

```json
  "env_required": ["KATA_ZENTAO_BASE_URL", "KATA_ZENTAO_ACCOUNT", "KATA_ZENTAO_PASSWORD"],
  "env_optional": ["KATA_ZENTAO_COOKIE"],
  "commands": {
    "fetch": "bun run .claude/plugins/zentao/fetch.ts --bug-id {{bug_id}} --output {{output_dir}}",
    "create": "bun run .claude/plugins/zentao/create.ts --json {{json}}"
  },
```

> 若 plugin.json schema 不识别 `env_optional`，则删掉该行，仅在 README 说明 `KATA_ZENTAO_COOKIE`。先跑 `bun run check:skills` 验证 plugin.json 合法。

- [ ] **Step 5: 运行确认通过**

Run: `cd "$W" && bun test .claude/plugins/zentao/__tests__/create.test.ts && bun run check:skills`
Expected: PASS；check:skills 绿。

- [ ] **Step 6: Commit**

```bash
cd "$W"
git add .claude/plugins/zentao/create.ts .claude/plugins/zentao/__tests__/create.test.ts .claude/plugins/zentao/plugin.json
git commit -m "feat: 🧩 wire zentao create cli and register plugin command"
```

## Task 7: 真实创建冒烟（人工授权，非 subagent 任务）

> ⚠️ 这一步**触网 + 写真实禅道 + 需用户当场授权**，不能由 subagent 自动执行。由主代理在用户在场点头后手动跑一次，确认响应形态与 `openedBuild` 取值，再据此回填。

**Files:**
- 可能 Modify: `.claude/plugins/zentao/create.ts`（`parseCreateResponse` 按实测响应微调）
- 可能 Modify: `.claude/plugins/zentao/zentao.config.yaml`（`opened_build` 按实测取值）
- 可能 Modify: `.claude/plugins/zentao/__tests__/create.test.ts`（加一条「实测响应样本」用例）

- [ ] **Step 1: 准备一份最小 BugReport JSON**

```bash
cd "$W"
cat > /tmp/zentao-smoke-bug.json <<'JSON'
{
  "title": "[kata 冒烟] 禅道创建接口联调验证（可删）",
  "severity": "minor",
  "problem_type": "代码问题",
  "summary": "kata zentao create 联调冒烟，验证创建链路，确认后可删除此 bug",
  "environment": { "deploy_env": "http://shuzhan63-test.k8s.dtstack.cn/", "tenant": "DT_demo", "account": "admin@dtstack.com" },
  "reproduction_steps": ["联调创建接口"],
  "expected": "成功创建并返回 bug id",
  "actual": "待验证"
}
JSON
```

- [ ] **Step 2: 先 dry-run 核对字段**

Run: `cd "$W" && bun run .claude/plugins/zentao/create.ts --json /tmp/zentao-smoke-bug.json --dry-run`
Expected: 打印 `fields`，`assignedTo=xianglin`、`openedBuild=trunk`、`product=23`、`endpoint` 为 `bug-create-23-0-moduleID=0.html`。

- [ ] **Step 3: 取得用户明确授权后，发一次真实创建**

Run: `cd "$W" && bun run .claude/plugins/zentao/create.ts --json /tmp/zentao-smoke-bug.json`
Expected（其一）：`{ "ok": true, "bug_id": <n>, "url": ".../bug-view-<n>.html", "title": "..." }`。
观察并记录：① 真实响应 JSON 字段（`result`/`id`/`locate`/`load`）；② `openedBuild=trunk` 是否被接受（若报「影响版本」错误，改 yaml 为有效 build id 重试）。

- [ ] **Step 4: 按实测回填**

- 若响应字段与 `parseCreateResponse` 假设不符 → 调整解析分支，并在 `create.test.ts` 增加一条「实测响应样本」用例锁定形态。
- 若 `opened_build` 需改 → 更新 `zentao.config.yaml`。
- 打开返回的 `url` 人工确认 bug 内容、指派人为向林、正文区块与 mockup v5 一致。

- [ ] **Step 5: 清理冒烟 bug（可选）**

确认链路后，登录禅道手动删除该冒烟 bug（或保留作样例）。删除走禅道页面，不在脚本里做删除能力。

- [ ] **Step 6: Commit（若有回填改动）**

```bash
cd "$W"
git add .claude/plugins/zentao/create.ts .claude/plugins/zentao/zentao.config.yaml .claude/plugins/zentao/__tests__/create.test.ts
git commit -m "fix: 🩹 align zentao create with live API response" || echo "no changes to commit"
```

---

## Task 8: `defect-analyze` SKILL.md 编排 + 固定汇总模板

**Files:**
- Modify: `.claude/skills/defect-analyze/SKILL.md`（在 §产物 之后追加一节）

- [ ] **Step 1: 在 SKILL.md 末尾追加「推送禅道」一节**

```markdown
## 推送禅道（仅 bug 模式）

bug 模式产出 `report.html` 后按节点推进，输出只走固定模板，不夹带无关内容：

1. 用 AskUserQuestion 询问「是否推送禅道创建 bug？」（推荐「是」）。选「否」即结束，不做任何禅道写操作。
2. 选「是」→ 将 BugReport JSON 落盘，执行 `bun run .claude/plugins/zentao/create.ts --json <BugReport.json>`（产品、指派人向林、severity 映射等取插件 yaml；正文复用 zentao variant）。
3. 解析命令输出：成功按固定模板回显，失败只回一行简明原因（登录失败 / 缺必填 / 网络不可达 / 创建被拒），不编造。

   成功模板：

       禅道链接已生成，相关信息如下：
       - 禅道地址：<zentao_url>
       - Bug 标题：<title>

4. 一个 bug 链接只承载一处主修复建议（取 fix_suggestions 首条）。分析中发现的额外问题（补单测、相邻隐患等）用 AskUserQuestion 单独询问是否另开 bug，不堆进同一 bug。
```

- [ ] **Step 2: 校验 SKILL.md 契约（行数 ≤300、frontmatter 白名单未动、同步检查）**

Run: `cd "$W" && bun run check:skills && bun run check`
Expected: PASS（frontmatter 未改；新增为正文 markdown；无装饰性契约标记）。

- [ ] **Step 3: Commit**

```bash
cd "$W"
git add .claude/skills/defect-analyze/SKILL.md
git commit -m "feat: 🧩 add zentao push orchestration to defect-analyze"
```

---

## Task 9: 全量验证与合并回 main

**Files:** 无（验证 + git）

- [ ] **Step 1: worktree 内全量验证**

Run: `cd "$W" && bun test && bun run check && bun run check:skills`
Expected: 全绿。任何失败必须先在 worktree 内修复（不得标记 skip/TODO）。

- [ ] **Step 2: 记录 HEAD SHA**

Run: `cd "$W" && git rev-parse HEAD`
记下 `<sha>`。

- [ ] **Step 3: 回主工作树合并**

```bash
cd /Users/poco/Projects/kata
git merge --no-ff <sha> -m "merge: 🔀 zentao bug auto-create integration"
```

- [ ] **Step 4: 合并后复验**

Run: `bun test && bun run check && bun run check:skills`
Expected: 全绿。

- [ ] **Step 5: 推送（需用户明确同意后再执行）**

```bash
git push origin main
```

> push 是对外操作，按 harness 规则**仅在用户要求时执行**；未获同意则停在本地并告知。

- [ ] **Step 6: 清理 worktree**

```bash
git worktree remove .worktrees/zentao-create
```

---

## Self-Review（计划自审）

**Spec 覆盖核对：**

- §3 接口契约 → Task 1（client.ts 登录/会话）、Task 7（实测响应/openedBuild）。✓
- §4 配置分层 → Task 4（yaml）、Task 6（plugin.json env_optional + KATA_ZENTAO_COOKIE）、Task 1（resolveSession 读 env/cookie）。✓
- §5 数据流 → Task 6（run：load→render→map→session→POST→parse→emit）+ Task 8（编排）。✓
- §6.1 client.ts → Task 1。✓ §6.2 create.ts → Task 4/5/6。✓ §6.3 plugin.json → Task 6。✓
- §6.4 类型扩展 → Task 2。✓ §6.5 模板改造 → Task 3。✓ §6.6 SKILL 编排 → Task 8。✓ §6.7 字段映射 → Task 4/5。✓
- §7 汇总模板 → Task 8。✓ §8 错误降级 → Task 1（NO_CREDENTIALS）、Task 6（各错误分支 emit + exit）。✓
- §9 测试 → Task 1/2/3/4/5/6 各自带测试；Task 9 全量。✓
- §10 实现顺序 → Task 0→9 对应。✓ §11/§12 → Task 7 闭环 + Task 9 验收。✓

**占位符扫描：** 无 TBD/TODO；每个 code step 给出完整代码与命令。

**类型一致性：** `ZentaoConfig` / `CreateResult` / `loadZentaoConfig` / `mapSeverity` / `mapPriority` / `buildCreatePayload` / `createUrl` / `parseCreateResponse` / `resolveSession` / `parseSessionCookie` / `zentaoLogin` 在定义任务与使用任务间命名一致。`BugReport` 新增字段（`environment.tenant/account/datasource`、`error_info`、`reproduction_steps`、`expected`、`actual`、`code_location.snippet_lines`、`fix_suggestions[].diff_lines`）在 Task 2 定义，Task 3 模板与 Task 5 payload 引用一致。

**已知风险：** 真实创建响应形态/`openedBuild` 取值留待 Task 7 实测回填——这是设计已声明、且权限上必须人工授权的一步，不阻塞前序离线 TDD 任务。



