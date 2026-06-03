---
title: 禅道 Bug 抓取增强（富字段 + HTML 清洗 + cookie 复用）
date: 2026-06-03
status: draft
skill: case-hotfix
plugin: zentao
---

# 禅道 Bug 抓取增强 — 设计文档

## 1. 背景与目标

`.claude/plugins/zentao/fetch.ts` 已存在并能跑通：用 `bug-view-{id}.json` API + 明文密码登录，实测抓 Bug #151858 成功返回 title/severity/pri/status/fix_branch/assigned_to。但它有三个缺口，导致 case-hotfix 作者仍要手动补抓：

1. **输出过薄**。`.json` 实际返回完整 bug（`bug` 全字段 + `actions` 动态历史 + `users`/`builds` 映射），但插件只输出 8 个摘要字段，丢掉了 hotfix 真正需要的：问题原因、解决方案、重现步骤、客户/环境/引擎/版本、关键词、修复测试意见、历史叙述。
2. **富文本未清洗**。`steps` 和 `actions[].comment` 是富文本 HTML 片段（`<p><img><span>`），直接塞进产物不可读。
3. **每次重新登录**。无 cookie 持久化与复用，每次抓取都先 POST 登录。

本设计在**不改命令面、不破坏现有测试和 hook**的前提下，把这三点补齐。

目标：

- `kata`/插件命令 `fetch` 输出一份**富结构 JSON**，覆盖 hotfix 作者所需全部字段，码值（用户、版本、严重度）解析为人类可读。
- 富文本 HTML 字段用**内置轻量 html→markdown**清洗（剥样式/脚本，保留文本与图片引用），即 defuddle「过滤思路」的落点，零外部依赖。
- 会话 **cookie 优先**：复用仓库级共享 cookie，探活失效再降级账号密码登录并回存。
- 全程 hermetic 可测；不提交真实客户 bug 数据。

## 2. 范围

**本次实现（In scope）**

- 增强 `.claude/plugins/zentao/fetch.ts` 的解析与输出（富字段 + 码值解析 + actions 叙述抽取）。
- 新增内置 html→markdown 清洗函数（纯函数，独立可测）。
- 新增 cookie 持久化 + 探活 + 降级登录的会话层。
- 扩展/新增单测（合成 fixture），保留现有测试全绿。
- `case-hotfix` SKILL/references 接线说明：用插件命令抓取，证据落 `.temp/`。

**本次不做（Out of scope）**

- 不新建 `kata zentao` 顶层命令（已确认增强现有插件）。
- 不引入 defuddle 依赖（富字段是小 HTML 片段，轻量清洗即可）。
- 不下载 bug 截图二进制（仅保留 `/zentao/file-read-*.png` 引用）。
- 不接 defect-analyze、不做多平台抓取框架。
- 不改 hotfix archive 产物格式，只换「抓取/清洗」这一段。
- 不修 `plugin.json` 里 `case-hotfix:init → input-adapter` 这个悬挂 hook（找不到处理器文件）——标为待核实项，见 §7。

## 3. 证据基线（来自 Bug #151858 实测）

`GET {base}/zentao/bug-view-{id}.json`（带登录 cookie）返回 `{status, data, md5}`，`data` 是 JSON 字符串，解析后含：

- `bug`：`id/title/keywords/severity/pri/type/steps(HTML)/status/confirmed/openedBy/openedDate/assignedTo/resolvedBy/resolution/resolvedBuild/resolvedDate/customer/customerPackage/env/founded/issueApp/issueModule/engine/version/techReason/reason/gitProject1~6/gitBranch1~6/gitProjectBranch/...`
- `actions`：动态历史 map；`resolved` 那条的 `comment`（HTML）含**问题原因（定位 SQL）+ 解决方案（增量 SQL is_deleted=1）+ 修复工程 + 修复分支 + 测试意见 + 缓存注意**。
- `users`：账号码 → 显示名（`tongmeng → 曈曚`、`xianglin → 向林`）。
- `builds`：版本码 → 名（`trunk → 主干`）。

即：**hotfix 所需数据 100% 在 `.json` 里**，无需 HTML 抓取或整页 defuddle。

## 4. 登录与会话（cookie 优先 → 降级）

会话层（建议抽到 `session.ts`，与未来 `zentao-bug-create` 的 `client.ts` 方向一致）：

1. 读仓库级共享 cookie：`./.kata/zentao/session.json`（`.gitignore` 已忽略 `.kata/`，跨项目共享一份）。无则跳到 4。
2. **探活**：带 cookie `GET bug-view-{id}.json`。判失效条件（命中任一）：
   - 响应非 JSON（返回登录页 HTML / `self.location='/zentao/user-login-...'`）。
   - JSON `status` 为 `fail` 或缺 `data`。
3. cookie 有效 → 直接进解析。`--refresh` 跳过本步强制重登。
4. **降级登录**：`POST user-login.json`（明文 `account`/`password`，现有实现可用），取 Set-Cookie 里的 `zentaosid`/`PHPSESSID`，**回存** `./.kata/zentao/session.json`，重抓 bug。
5. 登录再失败 → 保留现有错误契约（`LOGIN_FAILED` exit 1 + hint 检查 `KATA_ZENTAO_ACCOUNT/PASSWORD`）。
6. 网络不可达且传了 `--url` → 保留现有 partial 降级（仅从 URL 提取 bug_id）。

## 5. 输出契约（富结构 JSON）

成功时 stdout 打印并写入 `{output}/bug-{id}.json`：

```jsonc
{
  "bug_id": 151858,
  "url": "http://zenpms.dtstack.cn/zentao/bug-view-151858.html",
  "title": "【数据资产】总览-已配置规则分类图...",
  "fields": {
    "product": "线上问题统计", "issue_app": "数据资产", "module": null,
    "type": "产品BUG", "severity": "normal", "priority": 2, "status": "resolved",
    "confirmed": true, "keywords": "",
    "customer": "定制版本_岚图汽车", "env": "生产环境", "engine": "HDP_HDP 2.6.0.0",
    "resolved_build": "主干", // resolvedBuild=trunk 经 builds 映射；影响版本同理由 version 码映射
    "tech_reason": "历史数据影响", "reason": "其他", "found_by": "客户发现",
    "opened_by": "成龙", "opened_date": "2026-05-28 14:22:57",
    "resolved_by": "曈曚", "resolved_date": "2026-06-02 11:32:08",
    "assigned_to": "向林", "resolution": "Fixed",
    "fix_branch": "hotfix_6.3.x_ltqc_151858",
    "git_projects": ["customltem/dt-center-assets"]
  },
  "sections": {
    "steps_md": "问题现象（接口 /dassets/v1/...）：...",
    "resolution_md": "问题原因：...\n解决方案：提供增量SQL...\n修复分支：custome/hotfix_...\n测试意见：...\n注意：...缓存..."
  },
  "history": [
    { "date": "2026-06-02 11:44:41", "actor": "曈曚", "action": "resolved", "comment_md": "问题原因：..." }
  ],
  "output_path": ".../bug-151858.json"
}
```

约定：

- **码值解析**：`openedBy/resolvedBy/assignedTo` 等经 `users` 映射为显示名；`resolvedBuild/openedBuild` 经 `builds` 映射；severity 沿用现有 `parseSeverity`。
- **fix_branch** 优先级：`gitBranch1~6` / `gitProjectBranch` → `resolution_md` 里的「修复分支：」文本 → 现有 `detectFixBranch` 兜底。复用并扩展现有逻辑，不删 `detectFixBranch`（现有测试依赖）。
- **向后兼容**：现有顶层字段（`bug_id/title/severity/priority/status/fix_branch/assigned_to/module/output_path`）**保留**，新结构（`fields/sections/history/url`）为新增。现有成功路径无字段级断言，加字段安全。
- 错误/partial 输出契约**原样保留**（`error`/`hint`/`partial`），现有错误路径测试不变。

## 6. HTML 片段清洗（内置 html→markdown）

新增纯函数 `htmlFragmentToMarkdown(html: string): string`（独立文件，便于单测）：

- `<p>`/`<br>` → 换行；`<img src="x">` → `![](x)`（保留图片引用，不下载）。
- `<li>` → `- `；`<a href>` → `[text](href)`（可选）。
- 剥除 `style`/`onload` 等属性与 `<span>` 包裹，保留内部文本。
- 反转义 HTML 实体；折叠多余空行。
- 不追求通用 readability，只覆盖禅道富文本编辑器产出的标签集（p/br/img/span/a/li/strong）。

这是 defuddle「剥标记留正文」过滤思路的落点，零外部依赖、可热测。

## 7. 代码结构与测试

落点（`.claude/plugins/zentao/`）：

- `fetch.ts`：编排（会话 → 抓取 → 解析 → 输出），保留 CLI 入口与导出函数。
- `session.ts`（新）：cookie 读写、探活、降级登录。
- `parse.ts`（新，或并入 fetch.ts 的导出区）：`.json` → 富结构（含 users/builds 解析、actions 叙述抽取）。
- `html-md.ts`（新）：`htmlFragmentToMarkdown`。

测试（hermetic、改后即测，`bun test .claude/plugins/zentao`）：

- 保留现有 `__tests__/fetch.test.ts` 全部用例（`extractBugIdFromUrl`/`detectFixBranch`/`parseZentaoResponseText`/CLI 错误路径）。
- 新增：
  - `html-md`：各标签 → markdown 断言。
  - `parse`：喂**合成** `.json`（假字段、假 ID、码值映射）→ 断言富结构、码值解析、actions 叙述抽取、fix_branch 优先级。
  - `session`：依赖注入 fetch，断言「cookie 有效→直用」「探活失效→降级登录→回存」两条分支。
- **合成 fixture**：手写最小 ZenTao 形状 JSON，不提交任何真实客户 bug 页。

## 8. case-hotfix 接线

- SKILL.md 工作流第 1 步「抓取 bug 证据」改为：调插件 `fetch` 命令，读 stdout 富 JSON 拿标题建目录，把 `bug-{id}.json` 落到 `<hotfix>/.temp/`。
- references 写明命令用法与证据放置；保持「archive.md 无 SourceRef、证据分层、md 仅人类可读」约束不变。
- `sections.resolution_md`/`steps_md` 供作者写 archive 与 source_refs.json，**不直接整段粘进 archive 正文**（仍按现有用例格式改写）。

## 9. 风险与待核实

- `plugin.json` 的 `hooks."case-hotfix:init": "input-adapter"` 指向的处理器**未找到对应文件**——本设计不修，但实现阶段需核实它是否生效/是否死引用，结论写进交付说明。
- `.json` 各字段在不同禅道版本可能缺省；解析层对缺字段一律降级为 `null` 并保留 partial 语义，不抛错。
- 明文密码登录是现状契约；本设计沿用，不引入 HTML 表单的 `md5(md5(pwd)+rand)` 流程（仅在 `.json` 登录失效时才需要，届时再评估）。
- cookie 存仓库级共享，多项目并发抓取可能互相刷新 cookie；探活+重登可自愈，可接受。

