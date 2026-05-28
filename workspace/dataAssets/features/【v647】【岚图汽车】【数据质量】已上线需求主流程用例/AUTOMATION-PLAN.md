# 岚图已上线需求主流程用例 — Playwright 自动化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL — 用 `superpowers:subagent-driven-development`(推荐)或 `superpowers:executing-plans` 逐任务执行本计划。并行扇出用 `superpowers:dispatching-parallel-agents`。所有 Playwright 步骤的【最高权威】是 `.agents/skills/playwright-automation/SKILL.md`,本计划与其冲突时以 SKILL.md 的 codex_override 为准。任务勾选用 `- [ ]`。

**Goal:** 把约 1215 条「已上线需求」用例(源:`岚图已上线需求主流程用例.md/.xmind`,按 v6.4.x 版本组织)转成可运行、自跑通过的 Playwright UI 自动化,并反哺用例质量、汇总无法自决的问题供人工统一回答。

**Architecture:** 在专用 git worktree 内,由一个 orchestrator 串行搭好共享基座(预检 + 基础页对象/helper + runner 骨架),再按【UI 功能域】把用例切成互不重叠的分片,**并行**派发 subagent 各自编写本域脚本(页对象与 spec 文件名空间彼此不相交),最后由 orchestrator 串行做集成(注册 runner、跑 full.spec.ts、聚合反哺与待答问题)。并行轴选「功能域」而非「版本」,因为页对象是跨版本共享的可变产物——按域切分天然让每个 agent 独占自己的页对象文件,避免互相踩文件。

**Tech Stack:** Playwright (TS) + 仓库 kata 的 playwright-automation skill;Bun 运行时;superpowers writing-plans / dispatching-parallel-agents / subagent-driven-development;git worktree 隔离。

---

## 0. 执行模型与关键假设(先确认再跑)

- **假设:本任务由 Claude orchestrator + 并行 subagent 执行**(不是单个 codex exec——codex 0.130.0 无 subagent/并行能力)。
- **若你的 /goal 实际只能起单个 codex**:并行退化为「人工开 N 个 tmux 面板,每个 codex 跑一个功能域分片」,本计划的分域、文件归属、隔离规则照样适用;orchestrator 的串行集成步骤改由人工或最后一个 codex 收口。
- orchestrator = 读到本计划与 slim goal 提示词的那个主会话;它**独占**所有共享触点(见 §4)。

## 1. 必读(按需,不要批量预读)

- `.agents/skills/playwright-automation/SKILL.md` —— 动作前完整读完,遵守 codex_override 全部 hard_rules。
- 本计划(canonical 绝对路径):`/Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/AUTOMATION-PLAN.md`
- 进入对应 step 时再读 `.agents/skills/playwright-automation/references/<step>.md`。

## 2. 环境事实

- env profile:`workspace/dataAssets/_shared/env/ltqc-local.yaml`(worktree 内那份)。
- `base_url` = `http://shuzhan63-test-ltqc.k8s.dtstack.cn`;headless;租户 `pw_test`(tenant_id 10481);质量项目 `id=92`;`allow_write: true`;`runtime.table_prefix` 默认 `qa_auto`。
- 登录态会话文件(被 git 忽略,必须拷入 worktree):`workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json`(主工作树已存在,3453B)。
- 主流程任务曾人工探针确认会话有效:`...2099-01-lt-dq-main-flow/results/preflight-260522-01/.../probe.json`。但本任务仍须按 skill 跑**自己的 env-preflight**形成判定。

## 3. 关键仓库现实(gitignore / 合并回主干)

`git check-ignore` 已确认:
- `workspace/dataAssets/.gitignore:1: _shared/` → **整个 `_shared/` 被忽略**(env、helpers、pages 都不随 git 走)。
- 根 `.gitignore: **/.kata/` → 会话目录被忽略。
- 根 `.gitignore: workspace/*/features/*/results/` → **results/ 被忽略**(run 证据、截图、case-corrections、OPEN-QUESTIONS 都不随 git 走)。

含义:
- **会随 git 合并回主干的(tracked):** 本 feature 的 `manifest.json`、`metadata.yaml`、`tests/`(含 specs 与 runners)、本计划文件。可在批次边界 commit 到 worktree 分支(不 push、不 commit 到 main)。
- **不随 git、需人工从 worktree 物理收取的(ignored):** `_shared/` 下一切、`results/` 下一切。**最终 handoff 必须列出这些产物的 worktree 绝对路径。**
- 因 `_shared/` 在 worktree 内不存在,必须在 Task 0 从主工作树拷入。

## 4. 并发与共享状态(并行安全的核心)

主流程任务正与本任务**并发**跑,**同一后端 / 同一质量项目 id=92 / 同一租户**,且双方 `allow_write:true`。worktree 只隔离文件,不隔离后端数据。

**共享可变状态清单(决定谁能并行)：**
1. 后端数据(项目 92 内 `qa_auto*` 表)—— 跨 agent 共享 → 用**每分片唯一 table_prefix**隔离。
2. `_shared/pages/2099-01-lt-dq-launched-reqs/` 页对象 —— 跨域复用 → **按域独占**(见 §5 文件归属)。
3. `tests/runners/{smoke,full}.spec.ts`、`results/OPEN-QUESTIONS.md`、case-corrections 汇总 —— 单文件 → **只由 orchestrator 串行写**。
4. 登录会话文件 —— 只读共享,OK。

**并行/串行边界(硬规则):**
- **作者(写脚本/页对象)= 全并行**,因为是纯文件创建、无后端。
- **自跑(真实浏览器打后端)= 限并发 ≤ 2**,每个分片用唯一 `table_prefix = qa_auto_lr_<area>`;若某域多为只读 UI 校验可放开并发;有写/清理重的域且拿不准 → 记 open-question。
- **共享文件写入(runner 注册、OPEN-QUESTIONS 追加、corrections 汇总)= 仅 orchestrator,在集成阶段串行做。** subagent 不直接改这些文件,而是把「待注册 spec 列表 / 新增 open-questions / 新增 corrections」作为结构化结果**返回**给 orchestrator。
- subagent **不得编辑基础(共享)页对象**;若发现基础页对象需改,记 open-question / 把改动需求返回 orchestrator,由 orchestrator 串行改。

## 5. 文件结构与归属(decomposition 锁定在这里)

worktree 根:`/Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs/`(分支 `codex/2099-lt-dq-launched-reqs`)。以下均为 worktree 内相对该根的路径,**所有读写一律用绝对路径前缀该 worktree 根**,严防误写主工作树。

```
workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/
  岚图已上线需求主流程用例.md / .xmind        # 源(tracked,随 checkout 出现;缺则从主树拷入)
  manifest.json / metadata.yaml               # tracked
  AUTOMATION-PLAN.md                          # 本计划
  tests/
    cases/lr-<area>-<nn>-<slug>.ts            # 各域 agent 独占;文件名以 area 前缀分命名空间
    runners/smoke.spec.ts                     # 仅 orchestrator 维护
    runners/full.spec.ts                      # 仅 orchestrator 维护
    data/                                     # 测试数据(按域子目录,避免互相覆盖)
  results/
    inventory.json                            # Task 2 产出:用例清单(version × area × count)
    OPEN-QUESTIONS.md                         # 仅 orchestrator 追加(全局唯一)
    <run-id>/...                              # 各次 run 证据、截图、triage、case-corrections.{md,json}、open-questions.md

workspace/dataAssets/_shared/                  # 整体被 gitignore;Task 0 从主树拷入 env+helpers
  env/ltqc-local.yaml                          # 基础 env(拷入)
  env/ltqc-local-lr-<area>.yaml                # 可选:每域副本仅改 table_prefix(若 skill 不支持 prefix 覆盖参数)
  helpers/                                      # 共享 helper(拷入 + orchestrator 在 Task 3 扩展)
  pages/2099-01-lt-dq-launched-reqs/
    base/                                      # 基础/跨域页对象:仅 orchestrator 在 Task 3 建,subagent 只读复用
    <area>/                                    # 各域 agent 独占建/改自己域的页对象
```

**归属总表:**
| 产物 | 谁写 | 并行? |
|---|---|---|
| `pages/.../base/**` | orchestrator | 否(Task 3 串行) |
| `pages/.../<area>/**` | 对应 area-agent | 是(各占各的) |
| `tests/cases/lr-<area>-*.ts` | 对应 area-agent | 是 |
| `tests/runners/*.spec.ts` | orchestrator | 否(集成串行) |
| `results/OPEN-QUESTIONS.md`、corrections 汇总 | orchestrator | 否 |
| `results/<run-id>/**`(各域自己的 run) | 对应 area-agent | 是(run-id 含 area,互不覆盖) |

## 6. 任务分解

### Task 0:建立 worktree + 拷入依赖 + 校验源(orchestrator,串行)

- [ ] **0.1 建 worktree**
  Run:
  ```bash
  git -C /Users/poco/Projects/kata worktree add \
    /Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs \
    -b codex/2099-lt-dq-launched-reqs
  ```
  Expected:`Preparing worktree ... HEAD is now at ...`;`git worktree list` 出现该路径。
- [ ] **0.2 拷入被忽略的依赖**(worktree 内不存在)
  ```bash
  W=/Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs
  M=/Users/poco/Projects/kata
  mkdir -p "$W/workspace/dataAssets/_shared" "$W/workspace/dataAssets/.kata/auth/dataAssets"
  cp -R "$M/workspace/dataAssets/_shared/env"     "$W/workspace/dataAssets/_shared/"
  cp -R "$M/workspace/dataAssets/_shared/helpers" "$W/workspace/dataAssets/_shared/" 2>/dev/null || true
  cp "$M/workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json" \
     "$W/workspace/dataAssets/.kata/auth/dataAssets/"
  ```
  Expected:`$W/.../_shared/env/ltqc-local.yaml` 与会话文件存在。**不要拷其它 feature 的 pages。**
- [ ] **0.3 校验源用例存在于 worktree**(tracked,正常随 checkout;缺则从主树拷入)
  ```bash
  ls -la "$W/workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/"
  ```
  Expected:`岚图已上线需求主流程用例.md`、`.xmind`、`manifest.json`、`metadata.yaml`、`AUTOMATION-PLAN.md` 均在;任何缺失从 `$M/...` 同名拷入。
- [ ] **0.4 确认可跑 Playwright**:node 解析向上找到 `$M/node_modules` 即可。若必须单独安装才能跑 → **不要静默安装**,记 open-question 停在此步等人工。

### Task 1:env-preflight 闸门(orchestrator,串行)

- [ ] **1.1** 按 SKILL.md 的 env-preflight step,用 worktree 内 env + 拷入会话,跑真实预检。
- [ ] **1.2** 通过(HTTP 200、落正常落地页、未跳登录)→ 继续。失败(登录跳转/会话过期/网络不可达,且重试后仍失败)→ 按 skill 输出结构化 blocker,写入 `results/OPEN-QUESTIONS.md` 标 `blocker`,**停止并报告**,不绕过登录。
- Evidence:`results/preflight-<ts>/...`(probe.json + 截图)。

### Task 2:用例清单与分片(orchestrator,串行)

- [ ] **2.1** 解析 `岚图已上线需求主流程用例.md`(H2 = 版本:已探明 v6.4.2 / .3 / .4 / .5 / .6 / .8 / .10,缺 .1/.7/.9 属正常)。按【版本 × 功能域】统计用例数,产出 `results/inventory.json`。
  - 候选功能域(以实际解析为准,与此不符记 open-question):`assets`(资产盘点)/ `metadata`(元数据)/ `standard`(数据标准)/ `model`(数据模型)/ `quality`(数据质量)/ `security`(数据安全)/ `platform`(平台管理)。
- [ ] **2.2** 按功能域定 N 个并行分片(每片 = 一个 area,跨所有版本)。某域用例过多 → 该域内再按版本切子分片(spec 文件名加版本后缀,仍互不相交)。
- [ ] **2.3** 为每片分配:`area` 名、`table_prefix = qa_auto_lr_<area>`、页对象目录 `pages/.../<area>/`、spec 命名前缀 `lr-<area>-`、run-id 前缀 `<ts>-lr-<area>`。

### Task 3:共享基座(orchestrator,串行)

- [ ] **3.1** 对应用主导航/公共壳层做一次基础 ui-probe(登录后落地、各模块入口、公共表格/弹窗),留证据 `results/<ts>-base-probe/`。
- [ ] **3.2** 据探测建**基础页对象** `pages/.../base/**`(导航、登录态复用、公共组件)与**共享 helper** `_shared/helpers/**`(env 装载、storageState、公共断言/等待)。遵循 SKILL.md 与主流程同名结构;DRY、文件聚焦(单一职责,200–400 行)。
- [ ] **3.3** 建 runner 骨架 `tests/runners/{smoke,full}.spec.ts`(可参考主流程同名文件结构),先留空导入区,集成阶段填充。
- [ ] **3.4**(可选)若 skill 不支持 `table_prefix` 覆盖参数,为每片复制 `_shared/env/ltqc-local-lr-<area>.yaml` 仅改 `runtime.table_prefix`。具体以 SKILL.md env 入参为准,拿不准记 open-question。
- [ ] **3.5** commit tracked 基座(manifest/metadata/tests 骨架)到 worktree 分支:`git add` 指名文件 + `git commit`(不 push)。

### Task 4:并行派发 area-agent(orchestrator 扇出;各 agent 并行)

- [ ] **4.1** 用 `dispatching-parallel-agents`,每个**功能域**派一个 subagent(作者并行)。Prompt 用 §8 模板,逐片填具体值。
- [ ] **4.2** 每个 area-agent 在其域内对每条用例跑 SKILL.md 的**内循环**(见 §7),只写自己独占的文件,自跑限并发 ≤ 2,用本片 `table_prefix`。
- [ ] **4.3** area-agent **返回**(不直接写共享文件):本片新建 spec 路径清单、各 spec self-run 结果与 triage 分类、case-corrections 条目(结构化)、open-questions 条目(结构化)、需 orchestrator 改基础页对象的请求(若有)、本片被忽略产物的 worktree 绝对路径。

### Task 5:集成(orchestrator,串行)

- [ ] **5.1** 汇总各 agent 返回,核对页对象/spec 文件无重叠冲突(按 §5 归属应天然不冲突;有则裁决)。
- [ ] **5.2** 把所有新 spec 注册进 `tests/runners/full.spec.ts`(冒烟子集进 `smoke.spec.ts`)。
- [ ] **5.3** 跨片去重并落 `results/OPEN-QUESTIONS.md`(全局唯一,编号汇总)与 case-corrections 汇总。
- [ ] **5.4** 跑目标 `full.spec.ts`(交付前必须真实运行)。失败按 §9 分类修复(每 spec ≤3 次)。
- [ ] **5.5** commit tracked 产物(specs + runners + manifest 更新)到 worktree 分支(不 push)。

### Task 6:Handoff(orchestrator,串行)

- [ ] **6.1** 产出最终 handoff(见 §10 交付契约)。
- [ ] **6.2** 列出所有**被忽略产物**的 worktree 绝对路径供人工收取(`_shared/**`、`results/**`)。
- [ ] **6.3** 把所有 open-questions 聚合成**一份编号清单**,供人工一次性统一回答。

## 7. 每条用例的内循环(area-agent 执行,遵循 SKILL.md)

`ui-probe → plan-reconcile → playwright-generate → self-run → run-triage → case-feedback`。
- 无 ui-probe 证据不生成最终脚本;无 self-run 实际通过不算完成。
- 每个 run 留证据于 `results/<ts>-lr-<area>-<seq>/`:截图、生成的 spec、self-run 输出、triage 分类、`case-corrections.{md,json}`、`open-questions.md`。
- 复用 `base/` 页对象;本域 UI 未覆盖才在 `<area>/` 新建页对象;**不改 base/**。

## 8. area-agent Prompt 模板(派发时逐片填值)

```
你是负责【<area-中文名> / <area>】功能域的 Playwright 自动化 subagent。最高权威是
/Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs 内的
.agents/skills/playwright-automation/SKILL.md(先完整读 codex_override),其次是
.../features/2099-01-lt-dq-launched-reqs/AUTOMATION-PLAN.md。

范围:仅本域(<area>)跨全部版本(v6.4.2..v6.4.10)的用例,清单见 results/inventory.json 中 area=<area> 部分。
环境:env profile ltqc-local(worktree 内那份),base_url http://shuzhan63-test-ltqc.k8s.dtstack.cn,
质量项目 id=92,租户 pw_test。本域专用 table_prefix=qa_auto_lr_<area>(用它隔离后端数据,勿用默认 qa_auto)。

只允许写这些路径(用绝对路径,前缀 worktree 根 /Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs/):
- spec:tests/cases/lr-<area>-*.ts
- 本域页对象:_shared/pages/2099-01-lt-dq-launched-reqs/<area>/**
- 本域 run 证据:results/<ts>-lr-<area>-*/**
禁止:改 base/ 页对象、改 runner、改 OPEN-QUESTIONS.md、改 corrections 汇总、写主工作树、碰其它 area、碰 .kata/repos、改源 .md/.xmind。

按 SKILL.md 内循环逐条做:ui-probe → plan-reconcile → playwright-generate → self-run → run-triage → case-feedback。
- 自跑限并发 ≤ 2;每 spec 最多 3 次修复,locator 重试 ≤ 2。
- 失败先分类(产品/脚本/数据/权限/环境/未知);禁止弱断言、try/catch、test.skip、宽泛条件掩盖失败。
- 软性不确定:做合理临时决定 + 记 open-question + 继续,不要停下来问。
- case-feedback 反哺:每 run 出 case-corrections.{md,json}(8 类 category、3 级 confidence、跨轮去重,证据引用截图/locator/source_ref);不要改源用例。

返回(结构化,供 orchestrator 串行集成,不要自己写共享文件):
1) 新建 spec 路径清单;2) 每 spec 的 self-run 结果 + triage 分类;3) case-corrections 条目;
4) open-questions 条目;5) 需 orchestrator 改 base 页对象的请求(若有);6) 本域被忽略产物的 worktree 绝对路径;
7) fix-exhausted 的用例及原因。
```

## 9. 失败处理

- 分类:产品 / 脚本 / 数据 / 权限 / 环境 / 未知。
- 每 spec ≤ 3 次修复;locator 内部重试 ≤ 2;3 次不过 → `fix-exhausted` + 分类 + 写 handoff,继续下一条。
- 严禁用弱断言、`try/catch`、`test.skip`、宽泛条件掩盖失败。

## 10. 交付与完整性契约

- **每片(area)小结**:通过/阻塞/部分完成/修复耗尽 + 证据路径 + 本片 corrections 摘要 + 本片新增 open-questions。
- **最终 handoff 必含**:已自动化 case 数、各版本×各域结果、`full.spec.ts` 真实通过率、全部 blocker/未解决项、累计待审批 case-corrections 数、**聚合后的 OPEN-QUESTIONS 编号清单**、所有被忽略产物的 worktree 绝对路径。
- 没有真实 self-run 证据不得宣称某片完成;无 full.spec.ts 真实运行不得宣称整体完成。

## 11. 反哺用例(case-feedback)

- 每 run:`results/<run-id>/case-corrections.md` + `case-corrections-summary.json`;8 类 category、3 级 confidence、跨轮去重;证据须引用 ui-probe 截图 / locator / run-triage source_ref。
- **不直接改** `岚图已上线需求主流程用例.md` / `.xmind`;回写由人工 `/case-edit apply-corrections` 审批落地。

## 12. 待答问题(open-questions)协议

- 软性不确定(步骤含糊、业务规则吃不准、前置缺失但可临时合成、范围/命名不定、文案漂移到无法取舍)→ 做临时决定 + 记录 + 继续,**不中途问**。
- 记录两处:各 run `results/<run-id>/open-questions.md` + 全局 `results/OPEN-QUESTIONS.md`(orchestrator 串行汇总)。每条:编号、版本/域、用例引用、问题、为继续所做的临时假设、需人工提供什么、证据引用。
- 与 case-corrections 区分:corrections = 有证据的用例文本改进;open-questions = 需人工拍板的事项。可两边都记。
- 硬性环境 blocker 仍停批报告,但也记入 OPEN-QUESTIONS 标 blocker。
- **任务结束统一聚合成一份编号清单**(用户核心要求)。

## 13. 禁止 / Action Safety

- 只在 worktree `/Users/poco/Projects/kata/.worktrees/2099-lt-dq-launched-reqs/` 内写;用绝对路径,严防误写主工作树(主流程正在那里跑)。
- 只做 `2099-01-lt-dq-launched-reqs` 一个 feature;不碰主流程或任何其它 feature 目录。
- `workspace/dataAssets/.kata/repos/**` 只读;不 commit/push 任何源码仓库;只写 workspace 产物(且只在 worktree 内)。worktree 分支可 commit tracked 产物,但**不 push、不 commit 到 main**。
- 不重跑任何已冻结的 bootstrap pipeline;不直接改源 `.md/.xmind`。

## 14. Self-Review(写完计划后自查,已执行)

- **Spec 覆盖**:goal 的每项(转脚本 / 自跑通过 / 反哺 / 待答聚合 / worktree / 并行 subagent / 隔离)均有对应任务(Task 0–6 + §7/§11/§12)。✓
- **Placeholder 扫描**:并行轴、文件归属、隔离 prefix、命令与预期、返回契约均给实值;未用 TBD/TODO。逐条 1215 用例不手列(YAGNI/DRY)——内循环机制由 SKILL.md 承担,本计划给算法 + 模板 + 归属,属有意为之而非占位。✓
- **一致性**:`table_prefix=qa_auto_lr_<area>`、`lr-<area>-*` spec 命名、`pages/.../<area>/` 与 `base/` 归属、worktree 根路径在 §4/§5/§6/§8 全文一致。✓
