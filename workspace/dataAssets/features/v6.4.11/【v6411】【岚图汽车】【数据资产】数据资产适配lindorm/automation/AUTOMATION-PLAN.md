# 岚图主流程用例整理 — Playwright 自动化实现计划(续跑 / worktree 版)

> **For agentic workers:** REQUIRED SUB-SKILL — 用 `superpowers:subagent-driven-development`(推荐)或 `superpowers:executing-plans` 逐任务执行;并行扇出用 `superpowers:dispatching-parallel-agents`。所有 Playwright 步骤的【最高权威】是 `.agents/skills/playwright-automation/SKILL.md`,与本计划冲突时以其 codex_override 为准。任务勾选用 `- [ ]`。

**Goal:** 把「岚图主流程用例整理」(597 条,按模块组织)转成可运行、自跑通过的 Playwright UI 自动化。这是**续跑**:复用已有 specs/页对象/run 证据,先收尾未完成模块,再补齐剩余模块;同时反哺用例质量、汇总无法自决的问题供人工统一回答。

**Architecture:** 把主工作树现有进度提交 + 物理迁入一个专用 git worktree,在其中续跑。orchestrator 串行做迁入/基座校验/集成;按【功能模块】把工作切成互不重叠的分片,**并行**派发 subagent(页对象按模块独占、spec 文件名按模块分命名空间)。并行轴=模块,与现有「扁平按模块命名的页对象」布局一致,不重构。

**Tech Stack:** Playwright (TS) + kata playwright-automation skill;Bun;superpowers writing-plans / dispatching-parallel-agents / subagent-driven-development;git worktree。

---

## 0. 执行模型与关键假设

- **假设:Claude orchestrator + 并行 subagent**(codex 0.130.0 无 subagent 能力)。若 /goal 只能起单 codex,并行退化为人工开多面板各跑一模块,其余照用。
- **续跑性质**:严禁推倒重写已有产物;先 inventory 现状再决定每模块该「收尾」还是「新建」。
- **与 launched-reqs 并发**:launched-reqs 在它自己的 worktree 跑;本任务在 `.worktrees/2099-lt-dq-main-flow` 跑;两者文件已隔离,但共享同一后端项目 92 → 用不同 table_prefix 隔离数据(本套件 `qa_auto_mf_<module>`)。

## 1. 必读

- `.agents/skills/playwright-automation/SKILL.md`(动作前完整读,遵守 codex_override)。
- 本计划 canonical 路径:`/Users/poco/Projects/kata/workspace/dataAssets/features/2099-01-lt-dq-main-flow/AUTOMATION-PLAN.md`。
- 进入对应 step 再读 `references/<step>.md`。

## 2. 环境事实

- env：`ltqc-local`，通过 `kata env run ltqc-local -- <command...>` 使用主工作树共享的私密配置。
- `base_url` = `http://shuzhan63-test-ltqc.k8s.dtstack.cn`;headless;租户 `pw_test`(10481);质量项目 `id=92`;`allow_write:true`;`runtime.table_prefix` 默认 `qa_auto`(本套件改用 `qa_auto_mf_<module>`)。
- 会话文件(gitignored,必须拷入):`workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json`。
- 历史人工预检:`results/preflight-260522-01/.../probe.json`(确认有效),但仍须跑自己的 env-preflight。

## 3. 仓库现实(gitignore / 合并回主干)

`git check-ignore` 已确认:`_shared/`、`**/.kata/`、`workspace/*/features/*/results/` 均被忽略。
- **随 git 合并回主干(tracked):** 本 feature 的 `manifest.json`、`metadata.yaml`、`tests/`(specs+runners)、`AUTOMATION-PLAN.md`。
- **不随 git、需人工从 worktree 物理收取(ignored):** `_shared/` 下一切(含**现有 10 个页对象**)、`results/` 下一切(含现有 run 证据 + corrections)。
- 因此续跑迁入 = 「tracked 靠 commit + checkout」+「ignored 靠物理 cp」,缺一不可。

## 4. 续跑现状(本快照截于撰写时;运行中已推进,Task 2 必须从磁盘重新 inventory)

- specs(`tests/cases/`):t01 assets-stats、t02 assets-ui-contract、t03 metadata-data-map、t04 metadata-sync-model、t05 standard-statistic、t06 model-build-table、**t07 data-quality-shell(untracked,数据质量已开工)**。
- 页对象(`_shared/pages/2099-01-lt-dq-main-flow/`,扁平命名):`assets-inventory-page.ts`、`metadata-{lineage,search,shell,subscribe,sync,table-detail}-page.ts`(6)、`standard-page.ts`、`model-page.ts`、`data-quality-page.ts`。另有疑似误放的 `assets-inventory-page.test.ts`(测试文件不该在 pages/ 下,记 open-question 待确认,勿误当页对象)。
- run 证据(`results/`):含 `20260522-0301-assets01`、`-0310-metadata`、`-0320-standard`、`-0330-model`、`-1745-repair01`、`-1810-dqflow01`、`run-260522-assets-01`、多个 `preflight-*` 等。
- corrections:已分布在 **7 个 run 目录**的 `case-corrections.{md,json}`(总数已超早先的 12,Task 2 重新合计、跨轮去重)。
- 模块状态(推断,Task 2 校正):assets/metadata/standard/model = **partial(收尾)**;quality = **in-progress(继续)**;security/platform = **not-started(新建)**。
- ⚠️ **源 `岚图主流程用例整理.md`/`.xmind` 当前为 Modified(未提交)**。原因未明(可能来自拆分/bootstrap,也可能被误改)。**Task 0 提交时不得纳入这两个源文件**;源用例任何改动只能走 `/case-edit`。把「源文件为何 Modified」记一条 open-question。

## 5. 并发与共享状态(并行安全核心)

主工作树原 run + launched-reqs(另一 worktree)+ 本任务可能并存,**同后端 / 同项目 92 / 同租户**,均 `allow_write:true`。

**共享可变状态:** ①后端数据(项目 92 内 `qa_auto*` 表)→ 每分片唯一 `qa_auto_mf_<module>`;②`_shared/pages/.../*-page.ts` → 按模块文件名前缀独占;③`tests/runners/{smoke,full}.spec.ts`、`results/OPEN-QUESTIONS.md`、corrections 汇总 → 仅 orchestrator 串行写;④会话文件 → 只读共享。

**并行/串行边界:** 作者(写脚本/页对象)=全并行;自跑(打后端)=限并发 ≤ 2 且各用本模块 prefix;共享文件写入=仅 orchestrator 集成阶段串行;subagent 不改公共/base 页对象(需改则记 open-question / 返回 orchestrator)。

## 6. 文件结构与归属

worktree 根:`/Users/poco/Projects/kata/.worktrees/2099-lt-dq-main-flow/`(分支 `codex/2099-lt-dq-main-flow`)。**所有读写一律用绝对路径前缀该根**,严防误写主工作树。

```
workspace/dataAssets/features/2099-01-lt-dq-main-flow/
  岚图主流程用例整理.md / .xmind        # 源(只读;不改;Modified 问题见 §4)
  manifest.json / metadata.yaml / AUTOMATION-PLAN.md   # tracked
  tests/cases/<module-前缀>-*.ts        # 现有 t01..t07 + 新增;新文件按模块前缀命名
  tests/runners/{smoke,full}.spec.ts    # 仅 orchestrator 维护
  results/inventory.json                # Task 2 产出
  results/OPEN-QUESTIONS.md             # 仅 orchestrator 追加(全局唯一)
  results/<run-id>/...                  # 各 run 证据/截图/triage/case-corrections.{md,json}/open-questions.md
workspace/dataAssets/_shared/           # 整体 gitignored;Task 0 物理迁入
  env/ltqc-local.yaml                   # 迁入(可选每模块副本仅改 table_prefix)
  helpers/                              # 迁入 + 按需扩展
  pages/2099-01-lt-dq-main-flow/*-page.ts   # 迁入现有 10 个 + 新增,按模块文件名前缀独占
```

**模块 ↔ 页对象前缀 ↔ spec 前缀 ↔ prefix:**
| module | 页对象前缀 | 状态 | table_prefix |
|---|---|---|---|
| assets(资产盘点) | `assets-*` | partial | `qa_auto_mf_assets` |
| metadata(元数据) | `metadata-*` | partial | `qa_auto_mf_metadata` |
| standard(数据标准) | `standard-*` | partial | `qa_auto_mf_standard` |
| model(数据模型) | `model-*` | partial | `qa_auto_mf_model` |
| quality(数据质量) | `data-quality-*` | in-progress | `qa_auto_mf_quality` |
| security(数据安全) | `security-*` | not-started | `qa_auto_mf_security` |
| platform(平台管理) | `platform-*` | not-started | `qa_auto_mf_platform` |

## 7. 任务分解

### Task 0:迁入(orchestrator,串行)

- [ ] **0.0 前置**:确认主工作树正在跑的 main-flow run **已停止**(进程结束),否则提交/拷贝会拿到半写状态。
- [ ] **0.1 选择性提交 tracked 产物**(在主工作树,**指名路径,禁止 `git add -A`**;**不要**纳入源 `.md/.xmind`):
  ```bash
  M=/Users/poco/Projects/kata
  cd "$M"
  git add \
    workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/cases/t0*.ts \
    workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/runners/*.spec.ts \
    workspace/dataAssets/features/2099-01-lt-dq-main-flow/manifest.json \
    workspace/dataAssets/features/2099-01-lt-dq-main-flow/metadata.yaml \
    workspace/dataAssets/features/2099-01-lt-dq-main-flow/AUTOMATION-PLAN.md
  git commit -m "chore: snapshot main-flow automation progress before worktree resume"
  ```
  Expected:提交成功;`git status` 中源 `.md/.xmind` 仍为 Modified(未纳入,符合预期)。
- [ ] **0.2 建 worktree**(从含上述提交的 HEAD 分叉):
  ```bash
  git -C "$M" worktree add "$M/.worktrees/2099-lt-dq-main-flow" -b codex/2099-lt-dq-main-flow
  ```
- [ ] **0.3 物理迁入 gitignored 产物 + 依赖**(worktree 内不存在):
  ```bash
  W=$M/.worktrees/2099-lt-dq-main-flow
  mkdir -p "$W/workspace/dataAssets/_shared" "$W/workspace/dataAssets/.kata/auth/dataAssets"
  # config/env 由 kata env 通过 Git common-dir 自动复用，不复制 Cookie。
  cp -R "$M/workspace/dataAssets/_shared/helpers" "$W/workspace/dataAssets/_shared/" 2>/dev/null || true
  mkdir -p "$W/workspace/dataAssets/_shared/pages"
  cp -R "$M/workspace/dataAssets/_shared/pages/2099-01-lt-dq-main-flow" "$W/workspace/dataAssets/_shared/pages/"
  cp -R "$M/workspace/dataAssets/features/2099-01-lt-dq-main-flow/results" \
        "$W/workspace/dataAssets/features/2099-01-lt-dq-main-flow/"
  cp "$M/workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json" \
     "$W/workspace/dataAssets/.kata/auth/dataAssets/"
  ```
  Expected:worktree 内现有 10 个页对象、results/、env、会话齐全;源 `.md/.xmind`、t0*.ts、runners 随 checkout 出现。
- [ ] **0.4** 校验可跑 Playwright(复用仓库根 node_modules);若必须单独安装→不要静默装,记 open-question 停步。

### Task 1:env-preflight 闸门(orchestrator)
- [ ] 按 SKILL.md 用 worktree 内 env + 会话跑真实预检。通过→继续;失败(登录跳转/会话过期/网络,重试仍败)→输出 blocker、写入 `results/OPEN-QUESTIONS.md` 标 blocker、停止报告,不绕过登录。证据 `results/preflight-<ts>/`。

### Task 2:从磁盘 inventory + 解析剩余(orchestrator)
- [ ] **2.1** 扫描 worktree 内 specs/页对象/results/corrections,产出 `results/inventory.json`:每模块状态(partial/in-progress/not-started)、已覆盖用例、未覆盖用例、各 spec 上次 self-run 结论、各模块已有 corrections。
- [ ] **2.2** 解析 `岚图主流程用例整理.md`(只读)按模块归类 597 条,标出每模块「待收尾的失败项」与「未开工的新用例」。
- [ ] **2.3** 跨 7+ run 目录合并 corrections 并去重,得当前总数(校正早先 12)。

### Task 3:基座校验(orchestrator)
- [ ] 现有页对象/helper/runner 已存在 → **校验可用、按需小幅扩展,勿重写**。若需新增公共能力,在此串行加。可选:每模块复制 `ltqc-local-mf-<module>.yaml` 仅改 table_prefix(若 skill 不支持 prefix 覆盖参数,以 SKILL.md 入参为准,拿不准记 open-question)。

### Task 4:并行派发 module-agent(orchestrator 扇出;各 agent 并行)
- [ ] **Phase A(收尾)**:对 partial/in-progress 模块(assets/metadata/standard/model/quality)各派一 agent,**复用现有 spec/页对象**,只补失败项与未覆盖用例,每 spec ≤ 3 次修复。
- [ ] **Phase B(新建)**:对 not-started 模块(security/platform)各派一 agent,走完整内循环(§9)。
- [ ] 每 agent 用 §10 模板,只写本模块独占文件,自跑限并发 ≤ 2,用 `qa_auto_mf_<module>`;**结构化返回**(见模板),不直接写共享文件。

### Task 5:集成(orchestrator)
- [ ] 汇总返回、核对无文件冲突;把新 spec 注册进 `full.spec.ts`(冒烟子集进 `smoke.spec.ts`);跨片去重落 `results/OPEN-QUESTIONS.md` 与 corrections 汇总;**真实运行 `full.spec.ts`**;失败按 §11 分类修复;commit tracked 产物到 worktree 分支(不 push)。

### Task 6:Handoff(orchestrator)
- [ ] 产出最终 handoff(§14);列被忽略产物 worktree 绝对路径;聚合 open-questions 成一份编号清单交人工。

## 8. 每条用例内循环(module-agent,遵循 SKILL.md)
`ui-probe → plan-reconcile → playwright-generate → self-run → run-triage → case-feedback`。无 ui-probe 证据不出最终脚本;无 self-run 通过不算完成。证据落 `results/<ts>-mf-<module>-<seq>/`。复用现有页对象;本模块 UI 未覆盖才新建同前缀页对象;不改其它模块/公共页对象。

## 9.(并入 §8)

## 10. module-agent Prompt 模板(派发时填值)
```
你是负责【<module-中文> / <module>】模块的 Playwright 自动化 subagent。最高权威是 worktree 内
.agents/skills/playwright-automation/SKILL.md(先读 codex_override),其次 AUTOMATION-PLAN.md。
worktree 根:/Users/poco/Projects/kata/.worktrees/2099-lt-dq-main-flow/(所有路径用绝对前缀它)。
范围:仅本模块用例(见 results/inventory.json 中 module=<module>)。本模块状态=<partial|in-progress|not-started>;
若为收尾,务必复用现有 spec(<列出本模块现有 t0x>)与页对象(<module>-* / data-quality-*),只补失败项与未覆盖用例,别新建重复文件。
环境:env ltqc-local(worktree 内),项目 92,租户 pw_test。本模块 table_prefix=qa_auto_mf_<module>(勿用默认)。
只允许写:tests/cases/<module前缀>-*.ts、_shared/pages/2099-01-lt-dq-main-flow/<module前缀>-*-page.ts、results/<ts>-mf-<module>-*/**。
禁止:改其它模块/公共页对象、改 runner、改 OPEN-QUESTIONS/corrections 汇总、写主工作树、碰其它 feature、碰 .kata/repos、改源 .md/.xmind、重跑 tmp/ 冻结 pipeline。
按 SKILL.md 内循环逐条做。自跑并发 ≤ 2;每 spec ≤ 3 次修复,locator 重试 ≤ 2;失败先分类(产品/脚本/数据/权限/环境/未知);禁止弱断言/try-catch/test.skip/宽泛条件掩盖失败。
软性不确定:临时决定+记 open-question+继续,不中途问。case-feedback 反哺:每 run 出 case-corrections.{md,json}(8 类/3 级/跨轮去重/证据引用截图·locator·source_ref),不改源用例。
结构化返回(供 orchestrator 集成,勿自写共享文件):①新建/改动 spec 清单;②每 spec self-run 结果+triage;③corrections 条目;④open-questions 条目;⑤需 orchestrator 改公共页对象的请求;⑥本模块被忽略产物 worktree 绝对路径;⑦fix-exhausted 用例及原因。
```

## 11. 失败处理
分类(产品/脚本/数据/权限/环境/未知);每 spec ≤ 3 次修复,locator 重试 ≤ 2;3 次不过→`fix-exhausted`+分类+写 handoff+继续。禁止弱断言/`try-catch`/`test.skip`/宽泛条件掩盖失败。

## 12. 反哺用例
每 run 出 `results/<run-id>/case-corrections.{md,json}`(8 类 category、3 级 confidence、跨轮去重、证据引用 ui-probe 截图/locator/source_ref);**不直接改** `岚图主流程用例整理.md`/`.xmind`,回写由人工 `/case-edit apply-corrections`。

## 13. 待答问题协议
软性不确定→临时决定+记录+继续,不中途问;记 `results/<run-id>/open-questions.md` + 全局 `results/OPEN-QUESTIONS.md`(orchestrator 串行汇总);每条:编号、模块、用例引用、问题、临时假设、需人工提供什么、证据引用。硬性环境 blocker 停批且记 blocker。结束聚合成一份编号清单。已知首条 open-question:源 `.md/.xmind` 为何 Modified;`assets-inventory-page.test.ts` 是否误放。

## 14. 交付与完整性
每模块小结(通过/阻塞/部分/修复耗尽 + 证据路径 + 本模块 corrections 摘要 + 新增 open-questions)。最终 handoff:已自动化 case 数、各模块结果、`full.spec.ts` 真实通过率、全部 blocker/未解决项、累计待审批 corrections 数、聚合 OPEN-QUESTIONS 清单、被忽略产物 worktree 绝对路径。无真实 self-run 不宣称模块完成;无 full.spec.ts 真实运行不宣称整体完成。

## 15. 禁止 / Action Safety
- 只在 worktree `/Users/poco/Projects/kata/.worktrees/2099-lt-dq-main-flow/` 内写,绝对路径,严防误写主工作树。
- 只做 `2099-01-lt-dq-main-flow` 一个 feature;不碰 launched-reqs 或任何其它 feature。
- **不重跑 `tmp/` 下冻结 pipeline(pipeline.py/validate.py/rules.py/test_pipeline.py)——会把姊妹套件写回、破坏目录拆分。**
- 不直接改源 `.md/.xmind`;`.kata/repos/**` 只读;不 commit/push 源码仓库;worktree 分支可 commit tracked 产物但不 push、不 commit 到 main。

## 16. Self-Review(已执行)
- **覆盖**:续跑迁入(Task0)、预检(1)、inventory(2)、基座复用(3)、按模块并行收尾+新建(4)、集成+full.spec.ts(5)、handoff+聚合问题(6)、反哺(12)、待答(13)均落任务。✓
- **Placeholder**:迁入命令、提交白名单、prefix/命名/归属、返回契约均给实值;逐条 597 用例不手列(机制归 SKILL.md),属有意。✓
- **一致性**:`qa_auto_mf_<module>`、`<module>-*` 前缀、worktree 根路径、「源文件不提交/不改」在 §4/§5/§6/§7/§10/§15 全文一致。✓
