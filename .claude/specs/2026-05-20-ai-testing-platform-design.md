# AI 测试可视化平台 — 框架设计 + MVP

- 日期：2026-05-20
- 范围：整体框架（三子系统）+ 第一个 MVP（只读可视化 + MCP）
- 状态：已与用户对齐，待复核
- 后续：本 spec 获批后转 `superpowers:writing-plans` 出 **MVP 的**实施计划；②③ 各自再走 spec → plan → 实现

## 1. 背景与问题

kata 当前是一组以 Claude Code / Codex 运行时 skill codified 的 AI QA 工作流。数据其实已经结构化（`workspace/{project}/features/**` 下的 `metadata.yaml`、`manifest.json`、`archive.md`、`cases.xmind`、`INDEX.md`），engine 也有刻意收敛的 facade（`engine/src/api.ts` 是唯一公共入口）。

真正缺的不是「平台能力」，而是一个**呈现 / 控制的门面层**：现在一切都是黑盒，用户必须自己在文件夹里翻产物。用户的目标是把 kata 进化成一个 **AI 测试可视化平台**：

1. 能可视化浏览所有 QA 产物（features / artifacts / cases / xmind），终结「黑盒翻文件夹」。
2. 拥有 **Claude Code / Codex 式的协调调度能力**（agent 运行时 + 编排）。
3. 像 hermes-agent 那样**既能用外部 API，也能复用本机 claude / codex 的登陆态**。

### 1.1 历史包袱（本次全重来的起点）

此前有一版 P1（console）+ P2（MCP）在主干以 off-process 方式建好并验证过，但未走 superpowers 流程（无 worktree、无 spec、tests-after 而非 TDD）。用户决定 **完全重来（B）**：丢弃这版，按 brainstorm → spec → plan → worktree + TDD 重建。

待丢弃的 off-process footprint（fresh worktree 自动不携带，因均为 untracked/uncommitted）：
- `apps/`（9 文件）、`engine/src/api.ts`（+6）、`package.json`（+2）、`.mcp.json`、`.claude/launch.json`。

无关的既有未提交改动（`.agents`/`.ai/core`/`.claude` 的 case-edit、`workspace/dataAssets/**`）**不属于本任务，不得触碰**。

## 2. 目标与非目标

**目标**
1. 定下覆盖三子系统的**整体框架**，把扩展缝留对，保证 MVP 不把 ②③ 逼进死角。
2. 交付 **MVP = 只读可视化 + MCP**：Web UI 浏览 + 外部 Claude Code/Codex 可结构化查询工作区。
3. 全程 TDD，目标覆盖率 80%。

**非目标（MVP 内不做，仅留缝）**
- 不实现 agent 运行时 / provider（②）。
- 不实现从 UI 触发 skill 的写操作（③）。
- 不实现多用户鉴权 / 服务化部署（仅留接口缝）。
- 平台对 workspace **只读**，绝不 push/commit/mutate 源仓库或产物（CLAUDE.md 铁律）。

## 3. 范围决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 回归方式 | 完全重来（B）：丢弃旧 P1/P2，TDD 重建 |
| 分解 | 三子项目：① 只读访问平台、② agent 运行时、③ 动作集成；各自独立 spec |
| 推进顺序 | 先定整体框架 → 做 MVP（①）→ 按框架逐步扩展 ②③ |
| 运行/部署模型 | 本地优先（localhost 单用户，直接复用本机 claude/codex 登陆态），架构留服务化缝（鉴权 + 持久化抽象） |
| MVP 边界 | 只读可视化 + MCP |
| 前端栈 | React + Vite + TypeScript，从 MVP 即采用（不做「原生→重写」） |
| Agent 运行时策略（②，仅留缝） | A：自建薄 agent loop + 可插拔 provider（ExternalApi / ClaudeLocal / CodexLocal） |
| 代码落点 | `apps/`（不新建 `platform/`），贴现有 `apps/console`、`apps/mcp` 习惯 |
| Worktree | 走 `.worktrees/<slug>`，TDD 完成后 `--no-ff` 合并回 main |

## 4. 整体架构与分层

`engine/` 保持领域核心（facade，唯一公共入口）。新增内容全部落 `apps/`，消费 `kata-engine` 顶层 API，再叠加 transports + UI + 未来 runtime。

```
engine/                      # 既有领域核心(api.ts facade,只读 .ai/core、sessions…)
apps/
  core/
    catalog/                 # 读层:解析 features/artifacts/cases/xmind(包 kata-engine facade)  ← MVP 建
    runtime/                 # ② agent 运行时:provider 抽象 + 编排                              ← 仅留缝
      providers/             #   ExternalApi / ClaudeLocal / CodexLocal
    persistence/             # RunStore 接口 + 文件实现(运行历史)                              ← 仅留缝
    types.ts                 # 共享类型
  mcp/                       # MCP stdio server(消费 catalog)                                  ← MVP 建
  console/                   # Bun.serve HTTP+SSE,并托管 web 构建产物(消费 catalog)            ← MVP 建
  web/                       # React+Vite 前端                                                ← MVP 建
```

**依赖方向**：`web → console(HTTP) → core/catalog → kata-engine facade`；`外部 CC/Codex → mcp(stdio) → core/catalog → kata-engine facade`。core 不依赖任何 transport；transport 薄。

## 5. 核心接口（扩展缝）

MVP 只实现 **Catalog**；其余四个仅在本 spec 声明形状，保证 ②③ 与服务化能无改动接入。

### 5.1 Catalog（读，MVP 实现）

纯读、路径安全、绝不写 workspace；所有返回值为新对象，绝不 mutate。

```ts
listProjects(): ProjectSummary[]                                  // { name, featureCount }
listFeatures(project, filters?): FeatureRow[]                     // filters: module/customer/version/owner/createdAfter/status/automationStatus/lastRun
getFeature(project, featureId): FeatureDetail                     // metadata + manifest + 产物清单
listArtifacts(project, featureId): ArtifactInfo[]                 // { name, bytes }
readTextArtifact(project, featureId, name): string               // 白名单文本产物
parseXmind(project, featureId): XmindSheet[]                      // jszip 解析 content.json
listSkills(): SkillSummary[]                                      // 读 .ai/core/skills/*/skill.yaml
```

### 5.2 Provider（②，仅留缝）

流式 `AsyncIterable<RunEvent>` 是「可视化每个 token / 工具调用」的基础。

```ts
interface Provider {
  readonly id: "external-api" | "claude-local" | "codex-local";
  run(input: RunInput): AsyncIterable<RunEvent>;
}
type RunEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | { type: "tool_result"; id: string; result: unknown }
  | { type: "done"; usage?: unknown }
  | { type: "error"; message: string };
```
- `ExternalApi`：直连 Anthropic/OpenAI API，自跑 tool-call 循环。
- `ClaudeLocal`：shell `claude -p --output-format stream-json --mcp-config`，复用 Keychain 登陆态。
- `CodexLocal`：shell `codex exec`，复用 `~/.codex`。
- **不直接读 token**（脆弱 + 安全味），统一 shell 到本机 CLI。

### 5.3 RunStore（持久化，仅留缝）

```ts
interface RunStore {
  create(run: NewRun): Promise<RunId>;
  append(id: RunId, event: RunEvent): Promise<void>;
  get(id: RunId): Promise<Run>;
  list(filters?: RunFilters): Promise<RunSummary[]>;
}
```
MVP 文件实现位 `.kata/platform/runs/`，以后可换 sqlite / 服务化。MVP 只读，不实际使用，仅声明。

### 5.4 Transport

HTTP（Bun.serve + SSE）与 MCP（stdio JSON-RPC 2.0）是同一 core 上的两个薄传输层。MCP `dispatch(req)` 抽成纯函数（返回响应对象或 null），便于单测。

### 5.5 RequestContext（服务化，仅留缝）

MVP 隐式单本地用户 `{ user: "local" }`，贯穿 handler 入参，以后加真鉴权不重写 handler。

## 6. 数据流

- **读（MVP）**：web → `/api/...` → catalog → kata-engine facade + fs/jszip → JSON → 渲染。
- **MCP（MVP）**：外部 Claude Code → stdio JSON-RPC → tool handler → catalog → JSON。
- **运行（②，留缝）**：web → `POST /api/runs`（SSE）→ runtime.orchestrate → `Provider.run()` 流 → 写 RunStore + SSE 推 → web 时间线。

### 6.1 MVP HTTP 路由

```
GET /api/projects
GET /api/projects/:project/features            (+ filter query)
GET /api/projects/:project/features/:id
GET /api/projects/:project/features/:id/artifacts
GET /api/projects/:project/features/:id/artifact/:name
GET /api/projects/:project/features/:id/xmind
GET /api/skills
GET /*                                          → 托管 web 构建产物(SPA fallback)
```

### 6.2 MVP MCP 工具（6 只读）

`kata_list_projects` / `kata_list_features` / `kata_get_feature` / `kata_read_artifact` / `kata_get_cases` / `kata_list_skills`。

## 7. 错误处理

- 类型化错误：`NotFound`→404、`InvalidInput`→400、`Forbidden`→403；MCP 侧映射为 `{ isError: true, content:[text] }`。
- 路径安全：project 白名单（对 `listProjects`）、featureId 正则 `^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$`、artifact 文件名白名单、`resolve().startsWith(featureDir)` 防目录逃逸。
- 输入校验：所有 transport 入参先校验再进 core。
- 不向客户端泄露绝对路径 / 内部栈。

## 8. 测试策略（TDD，目标 80%）

| 单元 | 方式 |
|---|---|
| `core/catalog` | bun test + 临时 workspace fixture：`mkdtemp` 播种 metadata.yaml/manifest.json/archive.md + jszip 构建 cases.xmind，设 `KATA_WORKSPACE_ROOT`；覆盖各读函数 + 安全拒绝（非法 project/featureId/非白名单产物/逃逸路径） |
| `mcp` | bun test 纯 `dispatch()`：initialize / tools.list=6 / tools.call(成功 + unknown tool isError + 缺参 isError) / 未知方法 -32601 |
| `console` | bun test：对临时 `Bun.serve` 发 fetch，校验路由与状态码映射 |
| `web` | Vitest + Testing Library 组件测；关键浏览流补 Playwright e2e |
| CI | 扩 `bun run ci`：后端 `bun test`，web `vitest`（后端与前端 runner 分离） |

每个单元遵循 RED → GREEN → REFACTOR。

## 9. 组件清单（MVP 落地文件，皆小文件）

- `apps/core/types.ts` — 共享类型（ProjectSummary / FeatureRow / FeatureDetail / ArtifactInfo / XmindSheet / SkillSummary / RequestContext）。
- `apps/core/catalog/{projects,features,artifacts,xmind,guards}.ts` + `apps/core/catalog/skills.ts` — 读层（拆小）。
- `apps/mcp/{server,tools,dispatch}.ts` — MCP stdio server + 工具注册 + 纯 dispatch。
- `apps/console/server.ts`（必要时拆 `routes.ts`/`static.ts`）— Bun.serve HTTP+SSE + 托管 web。
- `apps/web/**` — React+Vite：侧栏、feature 列表+筛选、详情 tabs(Archive/XMind/元数据/产物)、markdown + xmind 树渲染。
- `apps/tsconfig.json`（后端，`types:["bun"]`）；`apps/web` 自带 Vite tsconfig。
- `.mcp.json`、`package.json` 脚本（console / mcp / web dev/build / test:apps）。

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| Vite 引入前端 build 链，与 Bun/Biome 现状冲突 | web 自带独立 tsconfig + vitest；后端仍 bun test；CI 分两段 |
| skill.yaml 含 backtick 标量解析失败 | `parseDocument(text,{strict:false}).toJS()` 容错，仅取顶层字段 |
| 大 xmind（1k+ 用例）渲染卡顿 | 树节点折叠 + 虚拟列表（web 层） |
| ②③ 接入时返工 | 本 spec 预声明 Provider/RunStore/Transport/RequestContext 四缝 |
| 误改无关未提交改动 | worktree 从 main HEAD 起,只动 apps/ + 必要 facade/脚本 |
