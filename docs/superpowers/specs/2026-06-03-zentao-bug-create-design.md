---
title: 禅道 Bug 自动创建集成
date: 2026-06-03
status: draft
skill: defect-analyze
plugin: zentao
---

# 禅道 Bug 自动创建集成 — 设计文档

## 1. 背景与目标

`defect-analyze` 的 `bug` 模式当前能组装 `BugReport` JSON 并渲染 `report.html`，但缺陷信息只能人工搬进禅道。本设计为它增加一条**确认即推送**的链路：bug 报告生成后，询问用户是否推送禅道；确认后由 CLI 集成的禅道能力**自动创建 bug**，正文复用 `zentao` variant 渲染的富文本（环境/报错/复现/预期/实际/根因/修复建议），指派人固定为**向林**，创建完成后回显固定汇总（禅道链接 + bug 标题）。

目标：

- 禅道相关配置（产品、模块、指派人、严重度映射等）**外置不写死**，密钥与会话凭据分层存放。
- 推送是**显式确认**的副作用，未确认不写禅道。
- 一个 bug 链接只承载**一处主修复建议**；额外问题单独询问，不堆进同一 bug。
- 节点输出走**固定模板**，不夹带无关内容。

## 2. 范围

**本次实现（In scope）**

- `defect-analyze` `bug` 模式末尾的「推送禅道」编排节点。
- 禅道插件新增 `create` 能力（`create.ts` + 抽取共享 `client.ts`）。
- 配置分层：`zentao.config.yaml`（纳入 git）+ `.env.local`（密钥）。
- `bug-report-zentao.html.hbs` 模板改造（= 定稿 mockup v5）。
- `BugReport` 类型扩展（租户/账号/数据源/报错信息/复现/预期/实际/代码行高亮/diff）。
- 成功/失败的固定汇总输出模板。
- 单元测试。

**本次不做（Out of scope）**

- `conflict` / `diff` 模式推送禅道、`case-hotfix` 回写禅道。
- 「所有 skill 全局按模板回复」纪律 —— 另立任务。

## 3. 已确认的禅道接口契约

> 以下经只读研究确认（以 `xianglin` 账号登录 `http://zenpms.dtstack.cn`，GET 创建页/编辑页解析）。

| 项 | 结论 |
| --- | --- |
| 登录 | `POST /zentao/user-login.json`（`account` + `password`，表单编码）→ `{"status":"success","user":{...}}` + `PHPSESSID` cookie。与现有 `fetch.ts` 的 `zentaoLogin` 完全一致。 |
| bug 模型字段 | `title / assignedTo / openedBuild / severity / pri / type / steps / product / module / project / deadline / keywords / mailto / status` 均存在（标准禅道模型）。 |
| **必填字段** | `title, openedBuild, assignedTo`（来自创建页 `window.config.requiredFields`）。 |
| CSRF token | **无**。POST 只需 session cookie + 表单字段。 |
| 端点 | `requestType: PATH_INFO`，`POST /zentao/bug-create-{product}-{branch}-moduleID={module}.html`；前端为 zui + ajax 提交。 |
| steps | 字段存在，存富文本 HTML → `zentao` variant 渲染结果直接灌入。 |
| 创建页 HTML | JS 驱动，静态 HTML 无传统 `<form>`（不影响 POST 契约）。 |

**仍待实现期实测（已被权限正确拦下，留到第 1 步联调，需用户当时点头）**

1. 创建成功响应的确切 JSON 形态（标准新版禅道 ajax 为 `{"result":"success", id|load|locate}`，失败为 `{"result":"fail","message":{...}}`）。
2. `openedBuild` 取值：产品 23 是否接受 `"trunk"`，还是要具体 build id —— 决定 yaml `opened_build` 默认值。

## 4. 配置分层

### 4.1 `.claude/plugins/zentao/zentao.config.yaml`（纳入 git，非敏感默认值）

```yaml
product: 23                # RDOS
branch: 0
module: 0
assignee:
  account: xianglin        # 禅道登录名（指派人固定向林）
  display: 向林
opened_build: trunk        # 影响版本，禅道必填项（实测后确认取值）
bug_type: codeerror        # 禅道 bug 类型默认值
severity_map:              # BugReport.severity → 禅道 severity 数字
  critical: 1
  major: 2
  normal: 3
  minor: 4
priority_map:              # BugReport.priority(可选) → 禅道 pri 数字，缺省 3
  "1": 1
  "2": 2
  "3": 3
  "4": 4
```

### 4.2 `.env.local`（不入库，敏感）

- `KATA_ZENTAO_PASSWORD`（已有，登录用）。
- `KATA_ZENTAO_COOKIE`（**新增**，登录失败时的兜底会话 cookie）。

### 4.3 `.env`（已有，不改）

- `KATA_ZENTAO_BASE_URL` / `KATA_ZENTAO_ACCOUNT` / `KATA_ZENTAO_PASSWORD`。
- `base_url` 继续走 env，不重复进 yaml；`fetch.ts` 不受影响。

## 5. 数据流

```
defect-analyze (bug 模式)
  1. 组装 BugReport JSON（已有，扩展新字段）
  2. kata defect-report render-bug --variant full → report.html（已有）
  3. AskUserQuestion：「是否推送禅道创建 bug？」
       ├─ 否 → 结束（不写禅道）
       └─ 是 → kata zentao create --json <BugReport.json>
                 a. 读 yaml 默认值 + env/.env.local 密钥
                 b. validateBugReport(json)
                 c. renderBugReport(report, "zentao") → steps 富文本
                 d. 字段映射（severity→map、assignedTo=向林、product/branch/module/openedBuild/type←yaml）
                 e. 登录(账号密码) → PHPSESSID；失败/被拒 → 回退 KATA_ZENTAO_COOKIE
                 f. POST bug-create 表单
                 g. 解析响应 → { bug_id, url, title }
  4. 打印固定汇总模板（成功/失败）
```

## 6. 组件设计

### 6.1 `.claude/plugins/zentao/client.ts`（新增，抽取）

把 `fetch.ts` 现有的 `zentaoLogin()` 与 cookie 解析抽到此共享模块，导出：

- `zentaoLogin(baseUrl, account, password): Promise<{ cookie: string }>`
- `resolveSession(env): Promise<string>` —— 先账号密码登录，失败回退 `KATA_ZENTAO_COOKIE`；都没有则抛错。

`fetch.ts` 改为从 `client.ts` 引入（行为不变，`fetch.test.ts` 须保持全绿）。

### 6.2 `.claude/plugins/zentao/create.ts`（新增）

CLI 选项：

- `--json <path>`（必填）：`BugReport` JSON 路径。
- `--config <path>`（默认 `.claude/plugins/zentao/zentao.config.yaml`）。
- `--dry-run`：只组装 payload 与渲染 steps，不发 POST（供测试/预览，打印将要提交的字段）。

流程：load yaml → load env → `validateBugReport` → `renderBugReport(report,"zentao")` → 字段映射 → `resolveSession` → POST → 解析 → 输出 JSON `{ ok, bug_id, url, title }` 或结构化 `{ ok:false, error, hint }`。

### 6.3 `plugin.json`

`commands` 增加：

```json
"create": "bun run .claude/plugins/zentao/create.ts --json {{json}}"
```

### 6.4 `BugReport` 类型扩展（`bug-report-types.ts`）

新增**可选**字段（命名对齐已有 `Bug` 接口的 `reproduction_steps/expected/actual`）：

```ts
environment.tenant?: string        // 租户信息（如 DT_demo）
environment.account?: string       // 账号信息（如 admin@dtstack.com / DrpEco_2020）
environment.datasource?: string    // 数据源信息（默认「无」）
error_info?: { curl?: string; log?: string }      // 报错信息：CURL信息 + 日志信息
reproduction_steps?: string[]                       // 复现步骤
expected?: string                                   // 预期结果
actual?: string                                     // 实际结果
code_location.snippet_lines?: Array<{ no?: number | string; text: string; error?: boolean }>
                                                    // 根因代码：上下文行 + 仅错误行标红
fix_suggestions[0].diff_lines?: Array<{ sign: " " | "+" | "-"; text: string }>
                                                    // 修复 diff 红绿展示
```

- 全部可选；缺失时模板按 `{{#if}}` 不渲染（符合「无证据不编造」）。
- 无 `snippet_lines` 时回退到现有 `snippet` 纯文本，保证 `full`/`simple` variant 不破。
- `validateBugReport` 只做透传，不强制新字段。

### 6.5 `bug-report-zentao.html.hbs` 改造（= 定稿 mockup v5）

固定区块与顺序：

1. **标题**（header 仅标题，删除时间/严重/类型/环境那行元信息）
2. **环境信息**：部署环境(平台 URL) / 租户信息 / 账号信息 / 数据源信息（删除 framework、java_version、source_ref 渲染）
3. **报错信息**：`CURL信息`（全量含 cookie，`white-space:pre-wrap` 可复制）+ `日志信息`（关键报错段）
4. **复现步骤**（有序列表）
5. **预期结果**（绿）
6. **实际结果**（红，纯文字）
7. **根因分析**：根因概述 + 置信度徽标（删除 confidence_reason 文案）+ 异常类型/消息 + 调用链 + 根因代码定位（上下文 + 仅错误行标红）
8. **修复建议**：仅渲染一条（`fix_suggestions[0]`），高亮块标题 + `（AI 分析，仅供参考）` + diff 代码块（`-` 红底 / `+` 绿底）

样式约束（沿用现有禅道兼容规范）：纯 inline style、table 布局、无 `<style>`/flex/grid。两个高亮块（根因概述、修复建议标题）**左缩进一致**：色条贴区块左边缘、文字从 16px 起；删除 footer。

> 严重度 / 类型不在正文展示，但仍作为禅道字段（`severity` / `type`）提交。

### 6.6 `defect-analyze` SKILL.md 编排调整

`bug` 模式渲染 `report.html` 后追加节点：

- `AskUserQuestion`：「是否推送禅道创建 bug？」（推荐项「是」+ 理由；可选「否」）。
- 选「是」→ 调 `kata zentao create --json <BugReport.json>` → 解析输出 → 打印固定汇总模板。
- **单一建议纪律**：推送时 `fix_suggestions` 只取首条主建议；分析中发现的额外问题（补单测、相邻隐患等）用 `AskUserQuestion` 单独询问是否另开 bug / 另行处理，**不堆进同一 bug**。
- 节点输出只走固定模板，不夹带无关内容。

### 6.7 字段映射表（BugReport → 禅道 create 表单）

| 禅道字段 | 来源 | 备注 |
| --- | --- | --- |
| `title` | `BugReport.title` | 必填 |
| `assignedTo` | `yaml.assignee.account`（`xianglin`） | 必填，固定向林 |
| `openedBuild` | `yaml.opened_build` | 必填，实测后定值 |
| `product` | `yaml.product`（23） | |
| `branch` | `yaml.branch`（0） | 进 URL 与表单 |
| `module` | `yaml.module`（0） | 进 URL 与表单 |
| `severity` | `yaml.severity_map[BugReport.severity]` | 1–4 |
| `pri` | `yaml.priority_map[BugReport.priority]`，缺省 3 | 1–4 |
| `type` | `yaml.bug_type`（codeerror） | |
| `steps` | `renderBugReport(report,"zentao")` | 富文本 HTML |

## 7. 固定汇总输出模板

**成功：**

```
禅道链接已生成，相关信息如下：
- 禅道地址：<zentao_url>
- Bug 标题：<title>
```

**失败：** 一行简明原因（登录失败 / 缺必填字段 / 网络不可达 / 创建被拒），透出禅道返回，不编造、不夹带无关内容。

## 8. 错误处理与降级

- 登录失败 → 回退 `KATA_ZENTAO_COOKIE`；两者皆失败 → 报错不写。
- 网络错误 → 明确报错，不静默。
- 创建被拒（权限/缺字段）→ 透出禅道 `message`。
- `--dry-run` 跳过 POST，仅打印将提交的字段与 steps 预览。
- 缺密钥（密码与 cookie 都没有）→ 提示在 `.env.local` 配置，退出非零。

## 9. 测试计划

- `tests/zentao/create.test.ts`（新）：字段映射、severity/priority 映射、yaml 加载、auth 回退（mock fetch）、响应解析（success/fail）、缺密钥/缺必填的错误分支、`--dry-run`。
- `tests/zentao/client.test.ts`（新或并入）：抽取后的 `zentaoLogin` / `resolveSession` 行为。
- `tests/bug-report/render.test.ts`：更新 `zentao` variant 断言 —— 新区块齐全、framework/java_version/source_ref 不再渲染、`snippet_lines` 错误行标红、单条修复建议、diff 红绿、无 footer。
- `tests/bug-report/validate.test.ts`：新可选字段透传不报错。
- `tests/zentao/fetch.test.ts`：抽 `client.ts` 后保持全绿。
- 命令：`bun test .claude/scripts/_shared/tests/bug-report` 与 `bun test .claude/plugins/zentao`；合并前 `bun test` + `bun run check` + `bun run check:skills`。

## 10. 实现顺序

1. **联调冒烟（需用户当时点头）**：登录 → 用一条完整 payload `POST` 真实创建一个 bug（指派向林）→ 确认成功响应 JSON 形态与 `openedBuild` 取值；据此回填 yaml 与响应解析。
2. 抽 `client.ts`，`fetch.ts` 改引入，跑 `fetch.test.ts` 保绿。
3. 扩展 `BugReport` 类型 + `validate` 透传 + 改造 `bug-report-zentao.html.hbs`，更新 render/validate 测试。
4. 写 `create.ts` + `zentao.config.yaml` + `plugin.json` 注册 + `create.test.ts`（mock fetch）。
5. 改 `defect-analyze` SKILL.md 编排 + 固定汇总模板，跑 `check:skills`。
6. 全量 `bun test` + `bun run check`，合并回 main。

> 全程走 detached worktree；`workspace/{project}/.kata/repos/**` 只读。

## 11. 风险与未决

- 创建响应 JSON 形态、`openedBuild` 取值 → 第 1 步冒烟确认。
- 会话过期：账号密码登录为主，cookie 仅兜底；登录失败有明确提示。
- 禅道实例自定义字段（如 `gitBranch1~6`）：本次不填，留默认。

## 12. 验收标准

- bug 模式生成报告后能弹出推送确认；选「否」不产生任何禅道写操作。
- 选「是」且配置齐全时，禅道新建 bug 指派向林，正文区块与 mockup v5 一致，回显固定汇总（链接 + 标题）。
- 配置全部来自 yaml/env，代码中无写死的产品号/指派人/cookie。
- 一个 bug 链接只含一处修复建议；额外问题经单独询问。
- 相关测试与 `bun run check` / `check:skills` 全绿。


