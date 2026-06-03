# 禅道 Bug 抓取增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 `.claude/plugins/zentao/fetch.ts`，让 `fetch` 命令输出覆盖 hotfix 所需的富字段（含解决叙述），清洗富文本 HTML 为可读 markdown，并支持 cookie 优先、失效降级账号密码登录。

**Architecture:** 把单文件拆成职责清晰的小模块：`html-md.ts`（HTML 片段→markdown 纯函数）、`parse.ts`（`.json` → 富结构 + 码值解析）、`session.ts`（cookie 读写/探活/降级登录）；`fetch.ts` 只做编排与 CLI，保留现有导出与错误/partial 契约不变。数据源是 `bug-view-{id}.json`（已含 `bug` 全字段 + `actions` 历史 + `users`/`builds` 映射），无需 HTML 抓取或外部依赖。

**Tech Stack:** Bun + TypeScript，commander CLI，`node:test` + `node:assert/strict`（`bun test ./.claude/plugins`），`@shared/lib/{env,paths}.ts`。

---

## 文件结构

| 文件 | 职责 | 动作 |
| --- | --- | --- |
| `.claude/plugins/zentao/html-md.ts` | `htmlFragmentToMarkdown()`：禅道富文本片段 → markdown，剥样式/脚本，保留文本与图片引用 | 新建 |
| `.claude/plugins/zentao/parse.ts` | `.json` 原始文本 → `RichBug`（fields/sections/history）；含 `users`/`builds` 码值解析、解决叙述抽取、fix_branch 优先级；并迁入纯解析助手 | 新建 |
| `.claude/plugins/zentao/session.ts` | cookie 路径/读写、探活、降级登录（DI fetch 可测） | 新建 |
| `.claude/plugins/zentao/fetch.ts` | 编排 + CLI；保留 `extractBugIdFromUrl` 导出，re-export `detectFixBranch`/`parseZentaoResponseText`；扩展输出 JSON | 修改 |
| `.claude/plugins/zentao/__tests__/html-md.test.ts` | html→md 各标签断言 | 新建 |
| `.claude/plugins/zentao/__tests__/parse.test.ts` | 富结构/码值/叙述/fix_branch 优先级断言（合成 fixture） | 新建 |
| `.claude/plugins/zentao/__tests__/session.test.ts` | cookie 复用 / 探活失效→降级登录→回存（DI fetch） | 新建 |
| `.claude/plugins/zentao/__tests__/fetch.test.ts` | 现有纯函数 + CLI 错误路径用例 | 保留不破坏 |
| `.claude/plugins/zentao/__tests__/fixtures/bug-synthetic.json` | 合成 ZenTao `.json` 形状，假字段假 ID，无真实客户数据 | 新建 |

**依赖方向（无环）：** `fetch.ts → {session.ts, parse.ts}`；`parse.ts → html-md.ts`；`session.ts → @shared/lib/paths.ts`。

**Commit 规范：** `type: emoji description`（英文标题）。type/emoji 映射：`feat 🧩`、`test 🧪`、`refactor ✨`、`docs 📝`、`chore 🧹`。

---

## Task 0: Worktree 前置（项目 worktree-first 规则）

本计划涉及 runtime 插件代码改动，按项目规则必须在 detached worktree 内实现。

- [ ] **Step 1: 提交主工作树现有改动（执行前快照）**

```bash
git add -A
git commit -m "chore: 🧹 save pre-worktree local changes"
```

- [ ] **Step 2: 创建 detached worktree 并 symlink runtime 目录**

```bash
ROOT=$(pwd)
W="$ROOT/.worktrees/zentao-fetch-enrich"
git worktree add --detach "$W" main
mkdir -p "$W/workspace/dataAssets"
ln -s "$ROOT/workspace/dataAssets/.kata" "$W/workspace/dataAssets/.kata"
```

> 后续所有 Task 在该 worktree 内执行；真实冒烟若需读 session/凭据，靠上面的 `.kata` symlink。

---

## Task 1: html-md.ts — 富文本片段清洗

**Files:**
- Create: `.claude/plugins/zentao/html-md.ts`
- Test: `.claude/plugins/zentao/__tests__/html-md.test.ts`

- [ ] **Step 1: 写失败测试**

`.claude/plugins/zentao/__tests__/html-md.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { htmlFragmentToMarkdown } from "../html-md.ts";

describe("htmlFragmentToMarkdown", () => {
  it("turns <p> blocks into separate lines", () => {
    const md = htmlFragmentToMarkdown("<p>第一行</p>\n<p>第二行</p>");
    assert.equal(md, "第一行\n第二行");
  });

  it("keeps image src as markdown image ref, drops onload attr", () => {
    const md = htmlFragmentToMarkdown('<p><img onload="setImageSize(this,0)" src="/zentao/file-read-1.png" alt="" /></p>');
    assert.equal(md, "![](/zentao/file-read-1.png)");
  });

  it("strips span wrappers and inline styles but keeps text", () => {
    const md = htmlFragmentToMarkdown('<p>接口<span style="color:#1F1F1F;">/a/b</span>：</p>');
    assert.equal(md, "接口/a/b：");
  });

  it("converts <br> to newline", () => {
    const md = htmlFragmentToMarkdown("<p>a<br />b</p>");
    assert.equal(md, "a\nb");
  });

  it("decodes html entities", () => {
    const md = htmlFragmentToMarkdown("<p>1 &lt; 2 &amp;&amp; 3 &gt; 0</p>");
    assert.equal(md, "1 < 2 && 3 > 0");
  });

  it("collapses blank lines and trims", () => {
    const md = htmlFragmentToMarkdown("<p>a</p>\n<p><br /></p>\n<p>b</p>");
    assert.equal(md, "a\nb");
  });

  it("returns empty string for empty/whitespace input", () => {
    assert.equal(htmlFragmentToMarkdown(""), "");
    assert.equal(htmlFragmentToMarkdown("   "), "");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/plugins/zentao/__tests__/html-md.test.ts`
Expected: FAIL — `Cannot find module "../html-md.ts"`.

- [ ] **Step 3: 实现 html-md.ts**

`.claude/plugins/zentao/html-md.ts`:

```ts
/**
 * plugins/zentao/html-md.ts — 禅道富文本编辑器片段 → 可读 markdown
 *
 * 只覆盖禅道 steps / action.comment 用到的标签集（p/br/img/span/a/li/strong），
 * 不追求通用 readability。剥样式/脚本属性，保留文本与图片引用。
 */

// 反转义最常见的 HTML 实体
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Convert a ZenTao rich-text HTML fragment into readable markdown. */
export function htmlFragmentToMarkdown(html: string): string {
  if (!html) return "";

  let out = html;

  // img → markdown 图片引用（先于剥标签处理，保留 src）
  out = out.replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi, "![]($1)");

  // a → [text](href)
  out = out.replace(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // li → "- " 行
  out = out.replace(/<li\b[^>]*>/gi, "- ").replace(/<\/li>/gi, "\n");

  // 块级标签与 <br> → 换行
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n");

  // 剥掉其余所有标签（span/strong/p 起始标签等），保留内部文本
  out = out.replace(/<[^>]+>/g, "");

  // 反转义实体
  out = decodeEntities(out);

  // 规整空白：每行内多余空格折叠，去掉空行，整体 trim
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return out.trim();
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/plugins/zentao/__tests__/html-md.test.ts`
Expected: PASS（7 用例全过）。

- [ ] **Step 5: Commit**

```bash
git add .claude/plugins/zentao/html-md.ts .claude/plugins/zentao/__tests__/html-md.test.ts
git commit -m "feat: 🧩 add zentao rich-text html-to-markdown cleaner"
```

---

## Task 2: parse.ts — 抽离纯解析助手（无行为变化）

把 `fetch.ts` 里的纯解析助手原样迁到新 `parse.ts`，`fetch.ts` 改为从 `parse.ts` 导入并 re-export，使现有 `__tests__/fetch.test.ts` 的导入路径继续有效。本任务**不改变任何行为**。

**Files:**
- Create: `.claude/plugins/zentao/parse.ts`
- Modify: `.claude/plugins/zentao/fetch.ts`

- [ ] **Step 1: 创建 parse.ts，迁入助手**

`.claude/plugins/zentao/parse.ts`（从 `fetch.ts` 原样搬运 `RawBugData`、`unwrapZentaoPayload`、`parseZentaoResponseText`、`detectFixBranch`、`parseSeverity`、`parsePriority` 及其正则常量；签名与实现保持不变）:

```ts
/**
 * plugins/zentao/parse.ts — 禅道 .json 响应解析
 *
 * 第一阶段：从 fetch.ts 迁入的纯解析助手（行为不变）。
 * 第二阶段（Task 3）：在此基础上新增富结构解析 parseBugPayload。
 */

// ─── 修复分支识别 ───────────────────────────────────────────────────────────
const HOTFIX_PATTERN = /hotfix[_/-][\w./-]+/gi;
const BRANCH_PATTERN = /(?:branch|分支)[:\s]*([^\s,;，；]+)/gi;

export function detectFixBranch(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hotfixMatches = candidate.match(HOTFIX_PATTERN);
    if (hotfixMatches && hotfixMatches.length > 0) return hotfixMatches[0];
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const branchMatches = candidate.matchAll(BRANCH_PATTERN);
    for (const m of branchMatches) {
      if (m[1]) return m[1];
    }
  }
  return null;
}

// ─── 原始 payload 解包 ───────────────────────────────────────────────────────
export interface RawBugData {
  title?: string;
  severity?: string;
  pri?: number;
  priority?: number;
  status?: string;
  resolvedBuild?: string;
  resolution?: string;
  assignedTo?: string;
  openedBy?: string;
  resolvedBy?: string;
  product?: string | number;
  module?: string | number;
  productName?: string;
  moduleName?: string;
  steps?: string;
  comment?: string;
  comments?: Array<{ content?: string; text?: string }>;
  [key: string]: unknown;
}

function unwrapZentaoPayload(payload: unknown): RawBugData | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "string") {
    try {
      return unwrapZentaoPayload(JSON.parse(payload));
    } catch {
      return null;
    }
  }
  if (typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (data.bug !== undefined) return unwrapZentaoPayload(data.bug);
  if (data.data !== undefined) return unwrapZentaoPayload(data.data);
  return data as RawBugData;
}

export function parseZentaoResponseText(text: string): RawBugData | null {
  try {
    return unwrapZentaoPayload(JSON.parse(text));
  } catch {
    return null;
  }
}

// ─── 字段归一 ────────────────────────────────────────────────────────────────
export function parseSeverity(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).toLowerCase();
  if (s === "1" || s === "fatal" || s === "critical") return "critical";
  if (s === "2" || s === "serious" || s === "major") return "major";
  if (s === "3" || s === "normal" || s === "average") return "normal";
  if (s === "4" || s === "minor" || s === "small") return "minor";
  return s;
}

export function parsePriority(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}
```

- [ ] **Step 2: 改 fetch.ts，删本地定义、改用 parse.ts 并 re-export**

在 `.claude/plugins/zentao/fetch.ts` 中：

1. 删除本地的 `HOTFIX_PATTERN`、`BRANCH_PATTERN`、`detectFixBranch`、`RawBugData`、`unwrapZentaoPayload`、`parseZentaoResponseText`、`parseSeverity`、`parsePriority` 定义（约对应原文件 61-204 行的这几段；`extractBugFields`、`extractBugIdFromUrl`、HTTP 助手、`run`、CLI 暂时保留）。
2. 在文件顶部 import 区加：

```ts
import {
  detectFixBranch,
  parsePriority,
  parseSeverity,
  parseZentaoResponseText,
  type RawBugData,
} from "./parse.ts";
```

3. 在 import 区之后加 re-export（保证 `__tests__/fetch.test.ts` 的 `import { detectFixBranch, parseZentaoResponseText } from "../fetch.ts"` 仍然有效）：

```ts
export { detectFixBranch, parseZentaoResponseText } from "./parse.ts";
```

> `extractBugFields` 仍引用 `parseSeverity/parsePriority/detectFixBranch`——现在它们来自上面的 import，编译通过，行为不变。

- [ ] **Step 3: 跑现有测试确认仍全绿**

Run: `bun test .claude/plugins/zentao/__tests__/fetch.test.ts`
Expected: PASS（`extractBugIdFromUrl`/`detectFixBranch`/`parseZentaoResponseText`/CLI 错误路径用例全过，行为未变）。

- [ ] **Step 4: lint**

Run: `bun run check .claude/plugins/zentao`
Expected: 无 error（无未用导入/变量）。若 `extractBugFields` 等出现未用告警，说明删多了，回退并仅删上述指定符号。

- [ ] **Step 5: Commit**

```bash
git add .claude/plugins/zentao/parse.ts .claude/plugins/zentao/fetch.ts
git commit -m "refactor: ✨ extract zentao pure parse helpers into parse.ts"
```

---

## Task 3: parse.ts — 富结构解析 parseBugPayload

**Files:**
- Modify: `.claude/plugins/zentao/parse.ts`
- Create: `.claude/plugins/zentao/__tests__/fixtures/bug-synthetic.json`
- Test: `.claude/plugins/zentao/__tests__/parse.test.ts`

- [ ] **Step 1: 写合成 fixture（inner data 对象，无真实客户数据）**

`.claude/plugins/zentao/__tests__/fixtures/bug-synthetic.json`:

```json
{
  "productName": "测试产品线",
  "bugModule": "",
  "bug": {
    "id": "9001",
    "title": "【合成】总览统计与规则库不一致",
    "keywords": "",
    "severity": "3",
    "pri": "2",
    "type": "产品BUG",
    "steps": "<p>现象：接口<span style=\"color:#1F1F1F;\">/x/y/z</span> 统计为 37，应为 25</p>\n<p><img onload=\"setImageSize(this,0)\" src=\"/zentao/file-read-1.png\" alt=\"\" /></p>",
    "status": "resolved",
    "confirmed": "1",
    "openedBy": "alice",
    "openedDate": "2026-05-28 14:22:57",
    "assignedTo": "carol",
    "resolvedBy": "bob",
    "resolution": "Fixed",
    "resolvedBuild": "trunk",
    "resolvedDate": "2026-06-02 11:32:08",
    "customer": "合成客户_X",
    "customerPackage": "PKG_1:a,b",
    "env": "生产环境",
    "founded": "客户发现",
    "issueApp": "合成应用",
    "issueModule": ",synth",
    "engine": "HDP_HDP 2.6.0.0",
    "version": "145",
    "techReason": "历史数据影响",
    "reason": "其他",
    "gitProject1": "group/repo-a",
    "gitBranch1": "hotfix_9.9.x_synth_9001",
    "gitProjectBranch": "{\"group/repo-a\":[\"hotfix_9.9.x_synth_9001\"]}"
  },
  "users": { "alice": "爱丽丝", "bob": "鲍勃|老鲍", "carol": "卡萝" },
  "builds": { "trunk": "主干", "145": "定制化_9.9" },
  "actions": {
    "1": { "id": "1", "actor": "alice", "action": "opened", "date": "2026-05-28 14:22:57", "comment": "" },
    "2": { "id": "2", "actor": "bob", "action": "resolved", "date": "2026-06-02 11:44:41", "comment": "<p>问题原因：模版表残留脏数据导致统计偏多</p>\n<p>解决方案：提供增量SQL置 is_deleted=1（代码未调整）</p>\n<p>修复分支：custome/hotfix_9.9.x_synth_9001</p>\n<p>测试意见：执行后核对统计一致</p>" }
  }
}
```

- [ ] **Step 2: 写失败测试**

`.claude/plugins/zentao/__tests__/parse.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseBugPayload } from "../parse.ts";

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
```

- [ ] **Step 3: 跑测试确认失败**

Run: `bun test .claude/plugins/zentao/__tests__/parse.test.ts`
Expected: FAIL — `parseBugPayload is not a function`（尚未实现）。

- [ ] **Step 4: 在 parse.ts 追加富结构解析**

先在 `.claude/plugins/zentao/parse.ts` **顶部 import 区**加一行（与现有 import 同处，勿在文件中段重复）：

```ts
import { htmlFragmentToMarkdown } from "./html-md.ts";
```

再在 `parse.ts` **末尾追加**以下内容（不含 import 行）:

```ts
// ─── 富结构类型 ──────────────────────────────────────────────────────────────
export interface BugFields {
  product: string | null;
  issue_app: string | null;
  module: string | null;
  type: string | null;
  severity: string | null;
  priority: number | null;
  status: string | null;
  confirmed: boolean | null;
  keywords: string | null;
  customer: string | null;
  env: string | null;
  engine: string | null;
  resolved_build: string | null;
  tech_reason: string | null;
  reason: string | null;
  found_by: string | null;
  opened_by: string | null;
  opened_date: string | null;
  resolved_by: string | null;
  resolved_date: string | null;
  assigned_to: string | null;
  resolution: string | null;
  fix_branch: string | null;
  git_projects: string[];
}

export interface BugAction {
  date: string;
  actor: string;
  action: string;
  comment_md: string;
}

export interface RichBug {
  bug_id: number | null;
  title: string | null;
  fields: BugFields;
  sections: { steps_md: string; resolution_md: string };
  history: BugAction[];
}

type StrMap = Record<string, string>;
type AnyMap = Record<string, unknown>;

function str(v: unknown): string | null {
  if (typeof v === "string") return v.length > 0 ? v : null;
  if (typeof v === "number") return String(v);
  return null;
}

function resolveName(code: unknown, map: StrMap): string | null {
  const c = str(code);
  if (c === null) return null;
  const name = map[c];
  return name ? name.split("|")[0] : c;
}

function gitProjects(bug: AnyMap): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const v = str(bug[`gitProject${i}`]);
    if (v) out.push(v);
  }
  return out;
}

function pickFixBranch(bug: AnyMap, resolutionMd: string): string | null {
  // 1. gitBranch1~6
  for (let i = 1; i <= 6; i++) {
    const v = str(bug[`gitBranch${i}`]);
    if (v) return v;
  }
  // 2. gitProjectBranch JSON：{"repo":["branch"]}
  const gpb = str(bug.gitProjectBranch);
  if (gpb) {
    try {
      const obj = JSON.parse(gpb) as Record<string, string[]>;
      for (const arr of Object.values(obj)) {
        if (Array.isArray(arr) && arr[0]) return arr[0];
      }
    } catch {
      // ignore
    }
  }
  // 3. 解决叙述里的「修复分支：xxx」
  const m = resolutionMd.match(/修复分支[:：]\s*([^\s，。;；]+)/);
  if (m?.[1]) return m[1];
  // 4. 兜底
  return detectFixBranch([resolutionMd, str(bug.steps), str(bug.title)]);
}

function extractResolutionNarrative(actions: AnyMap): string {
  const parts: string[] = [];
  for (const a of Object.values(actions)) {
    const act = a as AnyMap;
    const comment = str(act.comment);
    if (!comment) continue;
    if (act.action === "resolved" || act.action === "closed" || /问题原因|解决方案/.test(comment)) {
      parts.push(htmlFragmentToMarkdown(comment));
    }
  }
  return parts.join("\n\n");
}

function buildHistory(actions: AnyMap, users: StrMap): BugAction[] {
  return Object.values(actions)
    .map((a) => {
      const act = a as AnyMap;
      return {
        date: str(act.date) ?? "",
        actor: resolveName(act.actor, users) ?? "",
        action: str(act.action) ?? "",
        comment_md: htmlFragmentToMarkdown(str(act.comment) ?? ""),
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}

/**
 * Parse a zentao bug-view JSON response into a rich, hotfix-ready structure.
 * Returns null for login HTML or unparseable input.
 */
export function parseBugPayload(rawJsonText: string): RichBug | null {
  let outer: unknown;
  try {
    outer = JSON.parse(rawJsonText);
  } catch {
    return null;
  }
  if (typeof outer !== "object" || outer === null) return null;
  const o = outer as AnyMap;
  if (o.status === "fail") return null;

  let data: AnyMap;
  if (typeof o.data === "string") {
    try {
      data = JSON.parse(o.data) as AnyMap;
    } catch {
      return null;
    }
  } else if (o.data && typeof o.data === "object") {
    data = o.data as AnyMap;
  } else {
    data = o;
  }

  const bug = (data.bug ?? data) as AnyMap;
  if (!bug || typeof bug !== "object" || str(bug.id) === null) return null;

  const users = (data.users ?? {}) as StrMap;
  const builds = (data.builds ?? {}) as StrMap;
  const actions = (data.actions ?? {}) as AnyMap;

  const steps_md = htmlFragmentToMarkdown(str(bug.steps) ?? "");
  const resolution_md = extractResolutionNarrative(actions);

  const confirmedRaw = str(bug.confirmed);
  const confirmed = confirmedRaw === "1" ? true : confirmedRaw === "0" ? false : null;

  const fields: BugFields = {
    product: str(data.productName),
    issue_app: str(bug.issueApp),
    module: str(data.bugModule),
    type: str(bug.type),
    severity: parseSeverity(bug.severity),
    priority: parsePriority(bug.pri ?? bug.priority),
    status: str(bug.status)?.toLowerCase() ?? null,
    confirmed,
    keywords: str(bug.keywords),
    customer: str(bug.customer),
    env: str(bug.env),
    engine: str(bug.engine),
    resolved_build: resolveName(bug.resolvedBuild, builds),
    tech_reason: str(bug.techReason),
    reason: str(bug.reason),
    found_by: str(bug.founded),
    opened_by: resolveName(bug.openedBy, users),
    opened_date: str(bug.openedDate),
    resolved_by: resolveName(bug.resolvedBy, users),
    resolved_date: str(bug.resolvedDate),
    assigned_to: resolveName(bug.assignedTo, users),
    resolution: str(bug.resolution),
    fix_branch: pickFixBranch(bug, resolution_md),
    git_projects: gitProjects(bug),
  };

  return {
    bug_id: parsePriority(bug.id),
    title: str(bug.title),
    fields,
    sections: { steps_md, resolution_md },
    history: buildHistory(actions, users),
  };
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `bun test .claude/plugins/zentao/__tests__/parse.test.ts`
Expected: PASS（9 用例全过）。

- [ ] **Step 6: lint + Commit**

```bash
bun run check .claude/plugins/zentao
git add .claude/plugins/zentao/parse.ts .claude/plugins/zentao/__tests__/parse.test.ts .claude/plugins/zentao/__tests__/fixtures/bug-synthetic.json
git commit -m "feat: 🧩 add rich zentao bug payload parser with code resolution"
```

---

## Task 4: session.ts — cookie 优先 + 降级登录

**Files:**
- Create: `.claude/plugins/zentao/session.ts`
- Test: `.claude/plugins/zentao/__tests__/session.test.ts`

- [ ] **Step 1: 写失败测试**

`.claude/plugins/zentao/__tests__/session.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cookiePath, fetchAuthedBugJson, isAuthedBugJson, type FetchFn } from "../session.ts";

const creds = { baseUrl: "http://zt.example", account: "u", password: "p" };
const validJson = JSON.stringify({ status: "success", data: JSON.stringify({ bug: { id: "1" } }) });

describe("isAuthedBugJson", () => {
  it("true for valid bug json", () => assert.equal(isAuthedBugJson(validJson), true));
  it("false for login redirect html", () =>
    assert.equal(isAuthedBugJson("<script>self.location='/zentao/user-login-x.html'"), false));
  it("false for status fail", () => assert.equal(isAuthedBugJson(JSON.stringify({ status: "fail" })), false));
  it("false for non-json", () => assert.equal(isAuthedBugJson("oops"), false));
});

describe("cookiePath", () => {
  it("points to repo-level .kata/zentao/session.json", () => {
    assert.ok(cookiePath().endsWith("/.kata/zentao/session.json"));
  });
});

describe("fetchAuthedBugJson", () => {
  it("reuses a valid cookie without logging in", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      return new Response(validJson, { status: 200 });
    };
    let wrote = false;
    const text = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => "zentaosid=good",
      writeCookieFn: () => {
        wrote = true;
      },
    });
    assert.equal(text, validJson);
    assert.equal(wrote, false);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes("bug-view-1.json"));
    assert.ok(!calls.some((u) => u.includes("user-login")));
  });

  it("falls back to login when cookie is stale, then re-saves", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      if (url.includes("user-login")) {
        return new Response(JSON.stringify({ result: "success" }), {
          status: 200,
          headers: { "set-cookie": "zentaosid=fresh; path=/" },
        });
      }
      const loggedIn = calls.some((u) => u.includes("user-login"));
      return loggedIn
        ? new Response(validJson, { status: 200 })
        : new Response("<script>self.location='/zentao/user-login-x.html'</script>", { status: 200 });
    };
    let saved: string | null = null;
    const text = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => "zentaosid=stale",
      writeCookieFn: (c) => {
        saved = c;
      },
    });
    assert.equal(text, validJson);
    assert.equal(saved, "zentaosid=fresh");
    assert.ok(calls.some((u) => u.includes("user-login")));
  });

  it("logs in directly when no cookie present", async () => {
    const fetchFn: FetchFn = async (url) =>
      url.includes("user-login")
        ? new Response("{}", { status: 200, headers: { "set-cookie": "zentaosid=fresh; path=/" } })
        : new Response(validJson, { status: 200 });
    let saved: string | null = null;
    const text = await fetchAuthedBugJson(1, creds, {
      fetchFn,
      readCookieFn: () => null,
      writeCookieFn: (c) => {
        saved = c;
      },
    });
    assert.equal(text, validJson);
    assert.equal(saved, "zentaosid=fresh");
  });

  it("throws LOGIN_FAILED when login response lacks set-cookie", async () => {
    const fetchFn: FetchFn = async (url) =>
      url.includes("user-login")
        ? new Response("{}", { status: 200 })
        : new Response(validJson, { status: 200 });
    await assert.rejects(
      fetchAuthedBugJson(1, creds, { fetchFn, readCookieFn: () => null, writeCookieFn: () => {} }),
      (e: Error & { code?: string }) => e.code === "LOGIN_FAILED",
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test .claude/plugins/zentao/__tests__/session.test.ts`
Expected: FAIL — `Cannot find module "../session.ts"`.

- [ ] **Step 3: 实现 session.ts**

`.claude/plugins/zentao/session.ts`:

```ts
/**
 * plugins/zentao/session.ts — 禅道会话：cookie 优先复用，失效降级账号密码登录
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface ZentaoCreds {
  baseUrl: string;
  account: string;
  password: string;
}

export interface FetchAuthedOptions {
  fetchFn?: FetchFn;
  readCookieFn?: () => string | null;
  writeCookieFn?: (cookie: string) => void;
  refresh?: boolean;
}

// ─── cookie 持久化（仓库级共享，.gitignore 已忽略 .kata/）──────────────────────
export function cookiePath(): string {
  return join(repoRoot(), ".kata", "zentao", "session.json");
}

export function readCookie(): string | null {
  try {
    const p = cookiePath();
    if (!existsSync(p)) return null;
    const parsed = JSON.parse(readFileSync(p, "utf8")) as { cookie?: string };
    return parsed.cookie ?? null;
  } catch {
    return null;
  }
}

export function writeCookie(cookie: string): void {
  const p = cookiePath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ cookie }, null, 2), "utf8");
}

// ─── 探活与登录 ───────────────────────────────────────────────────────────────
/** 判断 bug-view .json 抓取结果是否「已登录且有效」。 */
export function isAuthedBugJson(text: string): boolean {
  if (/self\.location=|user-login/.test(text)) return false;
  try {
    const j = JSON.parse(text) as { status?: string; data?: unknown; bug?: unknown };
    if (j.status === "fail") return false;
    return j.data !== undefined || j.bug !== undefined;
  } catch {
    return false;
  }
}

function parseSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const parts = setCookie
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .filter((s) => s.includes("="));
  return parts.find((s) => s.startsWith("zentaosid=") || s.startsWith("PHPSESSID=")) ?? parts[0] ?? null;
}

async function safeFetch(fetchFn: FetchFn, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch (err) {
    throw Object.assign(new Error(`网络连接失败: ${(err as Error).message}`), { code: "NETWORK_ERROR" });
  }
}

export async function login(creds: ZentaoCreds, fetchFn: FetchFn): Promise<string> {
  const url = `${creds.baseUrl}/zentao/user-login.json`;
  const body = `account=${encodeURIComponent(creds.account)}&password=${encodeURIComponent(creds.password)}`;
  const res = await safeFetch(fetchFn, url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) {
    throw Object.assign(new Error(`禅道登录失败，HTTP ${res.status}`), { code: "LOGIN_FAILED" });
  }
  const cookie = parseSessionCookie(res.headers.get("set-cookie"));
  if (!cookie) {
    throw Object.assign(new Error("禅道登录失败：无法解析 Session Cookie"), { code: "LOGIN_FAILED" });
  }
  return cookie;
}

function bugJsonUrl(baseUrl: string, bugId: number): string {
  return `${baseUrl}/zentao/bug-view-${bugId}.json`;
}

/**
 * cookie 优先：复用 → 探活 → 失效则降级登录并回存。返回 bug .json 原始文本。
 */
export async function fetchAuthedBugJson(
  bugId: number,
  creds: ZentaoCreds,
  opts: FetchAuthedOptions = {},
): Promise<string> {
  const fetchFn = opts.fetchFn ?? (globalThis.fetch as FetchFn);
  const readFn = opts.readCookieFn ?? readCookie;
  const writeFn = opts.writeCookieFn ?? writeCookie;

  // 1. cookie 优先 + 探活（任何异常都视为失效，落到登录）
  if (!opts.refresh) {
    const existing = readFn();
    if (existing) {
      try {
        const res = await safeFetch(fetchFn, bugJsonUrl(creds.baseUrl, bugId), {
          headers: { Cookie: existing, Accept: "application/json" },
        });
        const text = await res.text();
        if (res.ok && isAuthedBugJson(text)) return text;
      } catch {
        // 探活失败，继续登录
      }
    }
  }

  // 2. 降级登录并回存
  const cookie = await login(creds, fetchFn);
  writeFn(cookie);

  // 3. 重抓
  const res = await safeFetch(fetchFn, bugJsonUrl(creds.baseUrl, bugId), {
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  if (res.status === 404) {
    throw Object.assign(new Error(`Bug #${bugId} 不存在`), { code: "BUG_NOT_FOUND" });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`获取 Bug 失败，HTTP ${res.status}`), { code: "FETCH_FAILED" });
  }
  return res.text();
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test .claude/plugins/zentao/__tests__/session.test.ts`
Expected: PASS（探活/降级/直登/LOGIN_FAILED + isAuthedBugJson + cookiePath 用例全过）。

> 若 `res.headers.get("set-cookie")` 在当前 Bun 版本返回 null，改用 `res.headers.getSetCookie?.()[0] ?? res.headers.get("set-cookie")` 兼容，再跑一次。

- [ ] **Step 5: lint + Commit**

```bash
bun run check .claude/plugins/zentao
git add .claude/plugins/zentao/session.ts .claude/plugins/zentao/__tests__/session.test.ts
git commit -m "feat: 🧩 add cookie-first zentao session with login fallback"
```

---

## Task 5: fetch.ts — 编排接线 + 富输出

把 `fetch.ts` 重写为「会话 → 解析 → 输出」编排，删除遗留 HTTP 助手与瘦输出装配，扩展输出 JSON，保留 CLI 与错误/partial 契约。

**Files:**
- Modify (整体替换): `.claude/plugins/zentao/fetch.ts`

- [ ] **Step 1: 用下面的完整内容替换 fetch.ts**

`.claude/plugins/zentao/fetch.ts`:

```ts
#!/usr/bin/env bun
/**
 * plugins/zentao/fetch.ts — 禅道 Bug 抓取器（编排 + CLI）
 *
 * Usage:
 *   bun run plugins/zentao/fetch.ts --bug-id 151858 --output workspace/<project>/.temp/zentao
 *   bun run plugins/zentao/fetch.ts --url "http://zenpms.dtstack.cn/zentao/bug-view-151858.html" --output .temp/zentao
 *   bun run plugins/zentao/fetch.ts --help
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv, initEnv } from "@shared/lib/env.ts";
import { Command } from "commander";

import { parseBugPayload } from "./parse.ts";
import { fetchAuthedBugJson, type ZentaoCreds } from "./session.ts";

// re-export 供现有测试与外部复用
export { detectFixBranch, parseZentaoResponseText } from "./parse.ts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ErrorOutput {
  error: string;
  hint?: string;
  partial?: boolean;
}

interface PartialBugOutput {
  bug_id: number;
  title: null;
  fix_branch: null;
  error: string;
  partial: true;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────
/** Extracts bug ID from a zentao bug URL. Supports /zentao/bug-view-138845.html. */
export function extractBugIdFromUrl(url: string): number | null {
  const match = url.match(/bug-view-(\d+)\.html/);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}

// ─── 输出辅助 ────────────────────────────────────────────────────────────────
function writeJsonExit(payload: ErrorOutput, code: number): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function writePartial(outputPath: string, bugId: number, error: string): void {
  const partial: PartialBugOutput = { bug_id: bugId, title: null, fix_branch: null, error, partial: true };
  writeFileSync(outputPath, JSON.stringify(partial, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(partial, null, 2)}\n`);
}

// ─── Main Logic ───────────────────────────────────────────────────────────────
async function run(options: { bugId?: number; url?: string; output: string }): Promise<void> {
  const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../");
  initEnv(resolve(projectRoot, ".env"));

  // Resolve bug ID
  let bugId: number;
  if (options.bugId !== undefined) {
    bugId = options.bugId;
  } else if (options.url) {
    const extracted = extractBugIdFromUrl(options.url);
    if (extracted === null) {
      writeJsonExit({ error: "无法从 URL 提取 Bug ID，预期格式：bug-view-{数字}.html" }, 1);
    }
    bugId = extracted as number;
  } else {
    writeJsonExit({ error: "必须提供 --bug-id 或 --url 参数" }, 1);
  }

  // Validate env
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  const account = getEnv("KATA_ZENTAO_ACCOUNT");
  const password = getEnv("KATA_ZENTAO_PASSWORD");
  const missing: string[] = [];
  if (!baseUrl) missing.push("KATA_ZENTAO_BASE_URL");
  if (!account) missing.push("KATA_ZENTAO_ACCOUNT");
  if (!password) missing.push("KATA_ZENTAO_PASSWORD");
  if (missing.length > 0) {
    writeJsonExit(
      {
        error: `缺少必要的环境变量：${missing.join(", ")}`,
        hint: "请在项目根目录 .env 文件中配置 KATA_ZENTAO_BASE_URL、KATA_ZENTAO_ACCOUNT 和 KATA_ZENTAO_PASSWORD",
      },
      1,
    );
  }

  // Output dir
  const absOutput = resolve(options.output);
  mkdirSync(absOutput, { recursive: true });
  const outputPath = `${absOutput}/bug-${bugId}.json`;

  const creds: ZentaoCreds = {
    baseUrl: baseUrl as string,
    account: account as string,
    password: password as string,
  };

  // Fetch（cookie 优先、失效降级登录）
  let rawText: string;
  try {
    rawText = await fetchAuthedBugJson(bugId, creds);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "BUG_NOT_FOUND") writeJsonExit({ error: `Bug #${bugId} 不存在` }, 1);
    if (e.code === "LOGIN_FAILED") {
      writeJsonExit({ error: "禅道登录失败", hint: "请检查 KATA_ZENTAO_ACCOUNT 和 KATA_ZENTAO_PASSWORD" }, 1);
    }
    if (e.code === "NETWORK_ERROR" && options.url) {
      writePartial(outputPath, bugId, "禅道 API 不可达，仅从 URL 提取了 Bug ID");
      return;
    }
    writeJsonExit({ error: `网络连接失败: ${e.message}`, partial: true }, 1);
  }

  // Parse → 富结构
  const rich = parseBugPayload(rawText);
  if (!rich) {
    writePartial(outputPath, bugId, "禅道返回了无法解析的响应");
    return;
  }

  // 装配输出：保留 legacy 顶层字段 + 富结构
  const output = {
    bug_id: rich.bug_id ?? bugId,
    url: options.url ?? `${creds.baseUrl}/zentao/bug-view-${bugId}.html`,
    title: rich.title,
    severity: rich.fields.severity,
    priority: rich.fields.priority,
    status: rich.fields.status,
    fix_branch: rich.fields.fix_branch,
    assigned_to: rich.fields.assigned_to,
    module: rich.fields.module,
    fields: rich.fields,
    sections: rich.sections,
    history: rich.history,
    output_path: outputPath,
  };
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("zentao-fetch");
  program
    .description("从禅道 Bug 链接提取缺陷详情、解决叙述和修复分支")
    .option("--bug-id <number>", "禅道 Bug ID（数字），例如 151858")
    .option("--url <url>", '禅道 Bug 页面 URL，例如 "http://zenpms.dtstack.cn/zentao/bug-view-151858.html"')
    .requiredOption("--output <dir>", "输出目录路径，例如 workspace/<project>/.temp/zentao")
    .option("--project <name>", "项目名称")
    .action(async (opts: { bugId?: string; url?: string; output: string; project?: string }) => {
      let parsedBugId: number | undefined;
      if (opts.bugId !== undefined) {
        parsedBugId = Number.parseInt(opts.bugId, 10);
        if (Number.isNaN(parsedBugId)) {
          writeJsonExit({ error: `无效的 Bug ID 格式："${opts.bugId}"，必须为正整数` }, 1);
        }
      }
      if (parsedBugId === undefined && !opts.url) {
        writeJsonExit({ error: "必须提供 --bug-id 或 --url 参数" }, 1);
      }
      await run({ bugId: parsedBugId, url: opts.url, output: opts.output });
    });
  program.parse(process.argv);
}
```

- [ ] **Step 2: 跑现有 + 全插件测试**

Run: `bun test .claude/plugins/zentao`
Expected: PASS（`fetch.test.ts` 现有用例 + html-md + parse + session 全过）。

> 现有 `fetch.test.ts` 的成功路径不发网络，只测 `extractBugIdFromUrl`/re-export 的 `detectFixBranch`/`parseZentaoResponseText`/`--help`/缺 env/非法 ID，重写后这些行为保持不变。

- [ ] **Step 3: lint + Commit**

```bash
bun run check .claude/plugins/zentao
git add .claude/plugins/zentao/fetch.ts
git commit -m "refactor: ✨ wire zentao fetch to session + rich parser with enriched output"
```

---

## Task 6: case-hotfix 接线（文档）

让 case-hotfix 工作流明确用插件命令抓取，并说明证据放置。

**Files:**
- Modify: `.claude/skills/case-hotfix/SKILL.md`（工作流第 1 步）

- [ ] **Step 1: 改 SKILL.md 工作流第 1 步**

把：

```text
1. 抓取 bug 证据，定位修复路径和受影响的页面、字段。
```

改为：

```text
1. 用 `bun run .claude/plugins/zentao/fetch.ts --bug-id <id> --output <hotfix>/.temp`（cookie 优先、失效自动登录）抓取 bug 证据；读返回 JSON 的 `fields`/`sections`/`history` 定位修复路径与受影响页面、字段。
```

- [ ] **Step 2: 校验 skill 契约**

Run: `bun run check:skills`
Expected: PASS（frontmatter 白名单、行数上限、子串契约均不破坏）。

Run: `bun run check .claude/skills/case-hotfix`
Expected: 无 error。

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/case-hotfix/SKILL.md
git commit -m "docs: 📝 wire case-hotfix step 1 to zentao fetch plugin"
```

---

## Task 7: 全量验证 + 待核实项 + 合并

**Files:** 无新增（验证与收尾）。

- [ ] **Step 1: 全量测试与 lint**

Run（逐条，全部需通过）:

```bash
bun run check
bun test ./.claude/plugins
bun test
bun run check:skills
```

Expected: `bun run check` 0 error；`bun test`/`test:plugins` 全绿；`check:skills` 通过。

- [ ] **Step 2: type-check 比对基线**

Run: `bun run type-check`
Expected: 不引入**新增** TS 错误。kata main 存在约 202 条预存 type-check 错误（非绿闸门），判定标准是「相对基线无新增」，重点确认 `.claude/plugins/zentao/*.ts` 不报错。

- [ ] **Step 3: 核实 input-adapter hook（待核实项）**

调查 `.claude/plugins/zentao/plugin.json` 的 `hooks."case-hotfix:init": "input-adapter"`：

Run: `ls .claude/plugins/zentao; grep -rn "input-adapter" .claude`
判断该 hook 处理器是否存在/是否生效。结论二选一并写进交付说明：
- 死引用 → 在交付说明标注，建议单独任务清理（不在本次修）。
- 实际生效 → 确认富输出不破坏其消费契约。

- [ ] **Step 4: 真实冒烟（可选，需网络与凭据）**

若环境可达禅道且 `KATA_ZENTAO_*` 已配置：

```bash
bun run .claude/plugins/zentao/fetch.ts --bug-id 151858 --output /tmp/zt_smoke
```

Expected: stdout JSON 含 `fields.customer`/`sections.resolution_md`（含「问题原因/解决方案」）/`history`；`fix_branch` 为 `hotfix_6.3.x_ltqc_151858`。若无网络/凭据，跳过并在交付说明标注「未做真实冒烟」。

- [ ] **Step 5: 合并回 main（按项目 worktree 流程）**

在 worktree 内记录 HEAD SHA，回主工作树执行：

```bash
git merge --no-ff <worktree-head-sha>
bun test && bun run check
git push origin main
git worktree remove .worktrees/<slug>
```

交付说明写清：已验证命令、退出码、通过/失败/跳过数量、未验证范围（如真实冒烟是否执行）、input-adapter 结论。

---

## 自检（Self-Review 结论）

- **Spec 覆盖**：§3 数据基线→Task 3 解析；§4 会话→Task 4；§5 富输出→Task 3+5；§6 HTML 清洗→Task 1；§7 代码结构/测试→Task 1-5 + 合成 fixture；§8 case-hotfix 接线→Task 6；§9 input-adapter 待核实→Task 7 Step 3。无遗漏。
- **占位符**：无 TBD/TODO；每个代码步骤均给出完整代码与可跑命令。
- **类型一致**：`RichBug`/`BugFields`/`BugAction`（parse.ts）与 fetch.ts 装配字段一致；`ZentaoCreds`/`FetchFn`/`FetchAuthedOptions`（session.ts）与 fetch.ts 调用一致；re-export 的 `detectFixBranch`/`parseZentaoResponseText` 保留现有测试导入路径。

