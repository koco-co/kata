# kata .ai/core audit — design

- date: 2026-05-19
- status: brainstormed, awaiting user review
- type: one-shot read-only audit spec
- next step: writing-plans skill turns this into an implementation plan

## 背景与目标

kata 体系在 `.ai/core/**` 维护单一真源,经 `engine/bin/kata ai-core projection render` 投影到 `.claude/.agents`。随着 skill / command / agent / contract / schema / reference 增长,出现以下用户感受到的「乱」:

- 同一规则多处表述
- prompt / skill 文件较长,决策负担上升
- 临时产物落盘位置散乱
- 文本中英文混用
- skills 与 commands、prompts、agents 之间边界不清

本 spec 设计一次**只读 audit**,产出一份 Markdown 报告,逐条列出按严重度分级的发现与修复建议;不在本次工作中实施任何修复。

## 范围

### audit 主范围(read)
- `.ai/core/**`(skills / commands / agents / prompts / workflows / schemas / contracts / runtimes / rules / guards / references / runners / source-refs / threat-model.yaml)
- `AGENTS.md` 及其 symlink `CLAUDE.md`
- `README.md`、`README-EN.md`、`INSTALL.md`、`CHANGELOG.md`
- `workspace/` 现有目录骨架(不读用户产物内容)

### cross-check 范围(read-only,仅用于验证发现)
- `.claude/**`、`.agents/**`(渲染产物,用 `grep -l` / `rg --files-with-matches` 检查引用)
- `engine/tests/**`(grep schema / skill 引用,**不读** engine src)
- `package.json` scripts、`.github/workflows/**` 入口

### 显式 Non-Goals
- 不修改任何文件、不重排目录、不提 PR
- 不评估 `engine/src/**` 代码质量,不做性能 / 安全审计
- 不对比 git 历史、不做 blame 溯源
- 不读 `plugins/**`、`tools/**`、用户在 `workspace/` 中的产物内容

## 判定基准

报告里的「问题」严格限定在以下三类之一,不接受主观美学判断:

1. **内部不一致** — 以 `.ai/core` 自身声明为准绳,合同与实现偏离、schema 与实例偏离、同事实多处定义冲突、未加载的 reference、文本中英文不一致。
2. **决策负担** — 单次会话需多次跳转才能找到职责、prompt 文件过长(经验阈值见下)、同一规则三处重复表述。
3. **可维护性** — 命名不一致、目录粒度不均、死文档 / stale TODO、未被 projection 引用的孤儿文件、可抽公共片段的 boilerplate。

**安全维度不在判定基准内**(用户已显式排除)。

## 五个 audit 维度

每个维度的「看什么」清单见下;典型发现示例略,执行计划阶段会展开。

### A. 文本审查(prompts / skills 内容)
- 同一规则在 `SKILL.md` / `prompts/*.yaml` / `references/*.md` 三处重复表述
- `prompts/*.yaml` 字段冗长(单 prompt > 500 行视为告警)、嵌套过深
- `references/*.md` 是否被对应 skill 真正加载(grep 校验)
- 段落中「ALWAYS / MUST / 严禁」分布密度过高
- 隐含约束未显式化(只有反例没有正例)

### B. 触发链路(routing)
- 用户 prompt → slash command → skill → worker agent → output 的跳转步数
- `AGENTS.md` 命令索引与 `.ai/core/commands/*.command.yaml` 的 slug 是否一一对应
- skill 内部分派(如 case-draft 三种入口)的 fallback 是否闭环
- 同义入口(`/case-draft` 与 Lanhu URL 直接落 `case-draft`)是否被显式声明
- 命令归属层级(根入口 vs `.ai/core` vs plugin)是否含糊

### C. 临时产物输出位置
- `workspace/{project}/` 实际目录(features / archives / reports / evidence / tmp)与 AGENTS.md 声明是否对齐
- 是否存在跨产物类型混在同一目录(如 evidence 写入 features 子树)
- `.kata/repos/` 是否真的 read-only(看是否有 skill 在向其中声明写入)
- `.worktrees/` 命名规约执行情况
- 中间产物(`.auth/`、screenshots、解析中间态 JSON)落盘位置是否声明

### D. 语言一致性
- `.ai/core` 内中英文混用密度(同一术语两种写法:case / 用例、worktree / 工作树)
- 文件名英文 vs 内容中文,slug vs title 不一致
- skill description / SKILL.md 首行 vs 命令索引摘要 是否口径一致
- 错误消息、CLI 输出语言基线
- 仅看「可量化的不一致」,不打分美学

### E. 结构精简(.ai/core 内部冗余)
- `skills/{slug}/SKILL.md` vs `prompts/{slug}.prompt.yaml` 内容重叠度
- `schemas/` 内重复 / 派生 schema 没有 base 抽出
- `contracts/` 与 `schemas/` 边界(数据形状 vs 行为约定)是否清晰
- `references/` 文件长度分布,孤儿(未被加载)清单
- `agents/{slug}-worker.agent.yaml` 之间的 boilerplate 抽取空间

## 严重度分级

只用 3 档,避免「中等」陷阱:

| 等级 | 含义 | 判定 |
|---|---|---|
| **P0 阻断** | 路由 / 契约**已经**不一致,会让 coding-agent 走错路 | 必须修才能保证当前体系自洽 |
| **P1 负担** | 不阻断但每次会话都在花决策成本 | 修了能省 token / 减少误用,不修也能跑 |
| **P2 维护** | 长期会变烂,单次会话感知不到 | 顺手清理项,可批量打包 |

**不存在 P3 / 不打 "low" 标签**。落到 P2 还嫌轻就直接不写。

### 每条发现的 schema

```
[P?] <一句话标题>
位置: <相对路径>:<行号>(可多个)
证据: <grep / 文件大小 / 路径对照,一两行可验证的事实>
影响: <如果不修会发生什么>
建议: <一句话怎么修;列方向,不替用户拍板>
```

### 总量上限

P0 不限,P1+P2 合计上限约 60 条;超出则按等级与信号强度砍 P2 → 信号弱的 P1。报告末尾**不留**「其他备注」「待定」「low」类兜底。

## 报告产物

### 落盘位置

- spec(本文档): `docs/superpowers/specs/2026-05-19-ai-core-audit-design.md`
- 报告: `docs/audits/2026-05-19-ai-core-audit.md`

**理由:** `docs/` 已有 `architecture/`、`superpowers/`,新增同级 `audits/` 与「报告类历史输入」归在一起;不写到 `workspace/`,因为它是 QA 项目产物专用区,这次产物是仓库自身的元报告,放入会污染 workspace boundary(AGENTS.md 已声明)。

### 报告骨架(固定章节,空章节也保留并写「无发现」)

```
# kata .ai/core audit — 2026-05-19

## 摘要
- 总览(P0 / P1 / P2 计数)
- Top 3 修复杠杆(投入产出比最高的三条,链接到正文锚点)

## 范围与方法
- 范围:.ai/core/** + AGENTS.md + workspace/ 布局
- cross-check:.claude/.agents 渲染、engine/tests grep
- 判定基准:内部不一致 / 决策负担 / 可维护性

## A. 文本审查
- 发现 A1 [P?] ...
- 发现 A2 [P?] ...

## B. 触发链路
...

## C. 临时产物输出位置
...

## D. 语言一致性
...

## E. 结构精简
...

## 附录:扫描覆盖清单
- 已扫文件数 / 行数(分维度)
- cross-check grep 命令清单
- 跳过项 + 原因(若有)
```

### 不产其他文件
无 csv、无分维度子报告、无中间笔记。报告 + spec 两份 md。

### git commit
spec 与报告各一次 commit,follow 仓库 conventional commits(`docs: ...`)。merge 回 main 按 worktree-first workflow 自动进行。

## 验收标准

### 用户视角

1. 读完报告能立即指出「先修哪 3 条」——`摘要 / Top 3 修复杠杆` 必须独立支撑该决定,无需翻正文。
2. 每条发现可被一行 `grep` / 一条 `ls` / 单文件路径在本地复现,不出现「读起来啰嗦」「主观觉得长」类无证据描述。
3. P0 条目若按建议方向实施,跑 `bun run ci` 仍能通过(audit 只看不改,但建议方向不能与现有 CI 冲突)。

### 执行者退出条件

- 五个维度全部扫过,每维度至少明确一句「无发现」或列出条目
- 报告附录的覆盖清单(已扫文件数、跳过项)写实,不糊弄
- 自查通过:无 P3、无「其他」、无 TODO、无未填位

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 发现量超 60 上限 | 按 P 等级砍 P2;再不行砍信号弱的 P1;不引入 P3 |
| cross-check 触发 `.claude/.agents` 大范围读取导致 token 膨胀 | 用 `grep -l` / `rg --files-with-matches` 仅 list,必要时再读单文件 |
| 语言一致性维度容易主观化 | D 维度只看「同一术语两种写法」「文件名 vs 内容语言不一致」类可量化点 |
| 误把 projection 产物当源 | 任何 `.claude/.agents` 下的发现都需回溯到 `.ai/core` 源头才计数;否则归 projection bug,不在本次 audit 范围 |

## 后续

本 spec 由 `superpowers:writing-plans` 转为实施计划:计划应将五维扫描拆为 5 个有序子任务 + 1 个汇总任务,执行时使用 TaskCreate 跟踪进度,串行进行,共享同一上下文。
