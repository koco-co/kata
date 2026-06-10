# Workspace 产物分层重组设计

- 日期：2026-06-10
- 状态：已与用户对齐（痛点、分层维度、feature 内部布局、落地范围、生命周期策略五项决策均已确认）
- 范围：`workspace/{project}/` 目录结构、feature 内部布局、skill 输出路径契约、配套 CLI 与迁移

## 1. 背景与痛点

现状（以 dataAssets 为例，xyzh 同构）：

- `features/` 下 58 个需求目录平铺，多版本（v6.4.6 ~ v6.4.11）混在同层，还混有 `2099-01-lt-dq-*` 这类长期用例目录。
- 单个 feature 目录内，稳定产物（`archive.md`、`cases.xmind`）、自动化（`tests/`、`scripts/`、`AUTOMATION-PLAN.md`）、运行结果（`results/` 下 27 个命名不一致的 run 目录）、临时文件（`tmp/`）全部混放。
- run 目录命名至少四种风格并存：`20260519-1443-faddbcf8`、`run-20260519T130447Z`、`preflight-260519-01`、`self-run-260603-01`。
- `INDEX.md` 严重过期：列的是旧 slug 命名（`2026-01-...`），实际目录早已换成 `【v6410】...` 命名。
- 仓库根散落业务文件：`数据资产_STD-用例.csv`、`质量规则合并细节技术方案.md`。
- 各 skill 输出路径硬编码散落在 phase/prompt/lint 多处，没有中心契约。

本次要全部解决：产物分类、feature 分层、临时产物治理、skill 输出契约统一。

## 2. 目标目录结构

```
kata/                                  # 仓库根：清除散落业务文件
├── .claude/                           # runtime（结构不动，只改路径契约）
└── workspace/{project}/               # dataAssets / xyzh 同构
    ├── INDEX.md                       # 脚本生成，禁止手改（带 generated 头）
    ├── features/
    │   ├── v6.4.10/                   # 版本层（在测版本，目录名 = 版本号）
    │   │   └── 【v6410】【岚图汽车】【数据质量】JSON格式配置/
    │   │       ├── metadata.yaml      # feature 元数据（manifest.json 合并进来）
    │   │       ├── cases/             # 稳定区：archive.md、cases.xmind、*.csv
    │   │       ├── automation/        # 自动化区：AUTOMATION-PLAN.md、tests/、scripts/
    │   │       └── runs/              # 易变区：运行结果，统一命名
    │   │           ├── <run-id>/
    │   │           └── _tmp/          # 临时产物唯一落点，清理脚本默认可删
    │   ├── _standing/                 # 长期主流程/冒烟用例（如 2099-01-lt-dq-*），不随版本归档
    │   └── _archived/v6.4.6/          # 已交付版本整体迁入，内部结构原样保留
    ├── _shared/                       # 基本不动（knowledge/env/pages/helpers 分类已清晰）
    │   └── archive/                   # 仅规范：吸收仓库根散落文件、历史 CSV
    └── .kata/                         # 完全不动（只读 repos、auth、infra）
```

要点：

- feature 目录命名规则不变（`【v{version}】...`），只是上面多一层版本目录；版本目录名用完整语义版本（`v6.4.10`），与目录内 feature 名里的紧凑版本号（`v6410`）由 `kata features resolve` 引擎换算。
- `cases/`、`automation/`、`runs/` 三区是 feature 内布局的唯一标准；没有自动化的 feature 允许缺省 `automation/`，但有产物时必须落对应区，不得新增同级目录。
- `metadata.yaml` 为 feature 级元数据唯一载体；现有 `manifest.json` 字段合并进 `metadata.yaml` 后删除。

## 3. 命名与生命周期规则

### 3.1 run-id 统一格式

- 格式：`YYYYMMDD-HHmm-<type>-<seq>`；type 枚举 `preflight|run|selfrun|repair|baseline`；seq 两位递增。
- 由现有 `.claude/scripts/_shared/lib/features/run-id.ts` 扩展为唯一出口，所有 skill 生成 run 目录都调用它，不得手拼。
- 27 个旧 run 目录迁移时不重命名，整体移入对应 feature 的 `runs/`（历史证据保真）；新规则只约束新增 run。

### 3.2 保留策略（`kata features clean`）

- 每 feature 的 `runs/` 保留：最近 3 次 run + 每版本 baseline run（type=baseline 的全部保留）。
- `runs/_tmp/` 一律可清。
- 命令默认 dry-run，输出将删除清单；`--apply` 才真正删除。

### 3.3 版本归档（`kata features archive`）

- 迭代交付后执行 `kata features archive v6.4.10`，把 `features/v6.4.10/` 整体移入 `features/_archived/v6.4.10/`，内部结构不动。
- `_standing/` 下的长期用例不参与版本归档。

### 3.4 INDEX.md（`kata features index` 增强）

- 按版本分组渲染：在测版本在前，`_standing`、`_archived` 分节列出。
- 每行列出 feature 名、状态、产物齐全度（cases/automation/runs 是否齐备）。
- 文件头保留 generated 注释；INDEX.md 出现手工编辑视为违规，由 lint 校验。

## 4. skill / 脚本契约改动

### 4.1 中心路径契约

新增 `.claude/scripts/_shared/lib/features/paths.ts`：feature 内布局（cases/automation/runs/_tmp、metadata.yaml 位置、版本层解析）只在这一处定义。所有 CLI、lint、测试从这里取路径，不再各自硬编码。

### 4.2 skill 写入路径

| Skill | 改动 |
| --- | --- |
| case-draft / case-edit / case-hotfix | 用例产物（archive.md、cases.xmind、csv）写 `cases/` |
| playwright-automation | 计划与脚本写 `automation/`，测试写 `automation/tests/`，运行结果写 `runs/<run-id>/`，临时产物写 `runs/_tmp/`（约 12 个 phase/prompt 文件含路径引用需逐一更新） |
| 其余 skill（defect-analyze、sql-merge-validate 等） | 输出落 `_shared/archive/` 既有分类，路径不变，仅在文档中显式声明 |

### 4.3 lint 与测试

- `archive-case-qa`、`no-feature-local-helpers`、`path-treatment`、`case-md-sourceref-leak` 等 lint 规则改为从 `paths.ts` 取路径。
- 对应测试（`.claude/scripts/_shared/tests/**`）同步更新。
- 新增 lint：feature 目录内出现三区之外的同级目录或根级散落产物时报错。

### 4.4 新增 CLI

- `kata features migrate`：一次性迁移，先 dry-run 输出「旧路径 → 新路径」全量映射，`--apply` 执行，底层用 `git mv` 保留历史。
- `kata features clean`：见 3.2。
- `kata features archive`：见 3.3。

## 5. 迁移方案

1. dry-run 输出 dataAssets + xyzh 全量映射表，人工确认后 `--apply`。
2. 迁移内容：feature 平铺 → 版本层；feature 内文件 → 三区；`manifest.json` → `metadata.yaml`（路径字段同步重写）；`tmp/` → `runs/_tmp/`；`results/*` → `runs/*`。
3. 仓库根 `数据资产_STD-用例.csv`、`质量规则合并细节技术方案.md` 归档进 `workspace/dataAssets/_shared/archive/history/`。
4. 迁移后重新生成两个工作区的 INDEX.md。
5. 两个工作区一次迁完，不留新旧双轨。

## 6. 测试与已知风险

- 全程在 detached worktree 执行（symlink `.kata`）；每步跑 `bun test` + `bun run check` + `bun run check:skills`，合并前全量绿。
- 已知红线：
  1. `runtime-detach.ts` 对 CLAUDE.md/rules 文案有子串校验，改文档前先抽子串清单当不变量。
  2. SKILL.md 有 11 字段 frontmatter 白名单与行数上限（SKILL≤500、references≤260）。
  3. worktree symlink 的 ignored 目录可能被 `git add -A` 误纳入，commit 前查 staged 清单。
- xmind/csv 为独立文件，内部无相对路径引用，迁移安全；`manifest.json`/`metadata.yaml` 中的路径字段由迁移脚本重写。
- 验证口径：交付时按「已验证 / 未验证」分别列出，迁移映射表与测试输出作为证据。

## 7. 决策记录

| 决策点 | 结论 |
| --- | --- |
| 核心痛点 | 产物分类乱、feature 平铺、临时产物堆积、skill 输出不统一 —— 四项全解 |
| feature 分层维度 | 按版本分层 |
| feature 内部布局 | cases / automation / runs 三区分治 |
| 落地范围 | dataAssets + xyzh 全量迁移，同步改 skill 契约 |
| 生命周期 | 脚本化治理（clean + archive + index 生成） |
