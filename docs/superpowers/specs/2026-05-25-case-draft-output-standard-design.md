# case-draft 输出产物标准 — 重定义 — 设计

- 日期：2026-05-25
- 试点 Skill：`case-draft@1`
- 试点项目：`workspace/dataAssets`
- 状态：待用户复核
- 证据来源：codex session `019e5ccf-e644-7e12-ad3b-80d693510f84`（2026-05-25 真跑，需求 `15662【数据地图】支持筛选数据表是否绑定数据目录`）

## 1. 背景与问题

一次真实 case-draft 运行（codex）暴露出产物在**内容、格式、规范**三个维度全面不合格。对照产出目录 `workspace/dataAssets/features/2026-05-metadata-data-map-catalog-bind/` 与仓库既有 feature，确认三类偏差：

1. **文件集污染（规范）**：仓库既有 feature 普遍是 4 文件（`archive.md / cases.xmind / manifest.json / metadata.yaml`），这次产出 **10 文件**，多塞 `enhanced.md`、`confirmation-package.md`、`coverage-matrix.md`、`case-evidence-map.json`、`unresolved-summary.md`、`tmp/` 等过程脚手架，污染交付目录。skill.yaml 的 `outputs:` 又把它们列为正式产物，自相矛盾。

2. **archive.md 格式/规范漂移（格式）**：
   - 用例标题混入 `TC-DM-CATALOG-BIND-001` 这类机器 ID，并漏进 XMind 用例节点标题。
   - 括号风格用 `【】""`，与部分既有 archive 的 `「」` 冲突；仓库整体 `「」`(24) 与 `【】`(32) 混用，无统一规范。
   - frontmatter 字段漂移（这次有 `prd_id/root_name/product`，db-version 是 `case_id/dev_version`），且含无消费方的冗余字段。
   - 章节层级随机（有的平铺 `#####`，有的 `##`→`######` 深嵌套），无语义约定。

3. **内容质量（内容）**：Lanhu 设计稿与 3 个 GitLab 源码链接**全部读取失败**（fetch 只拿到页面框架、GitLab 跳转登录页），但工作流仍据历史用例 + 用户一句「是」**推断产出 8 条"最终"用例**——等于凭空编造看似权威的用例，会误导测试。

### 与「跨模型稳定产物」spec 的关系（已确认）

仓库已有 `docs/superpowers/specs/2026-05-23-cross-model-stable-artifacts-design.md`（规划完成、实现未开始）。其主轴是**跨模型稳定**（路径一致 + schema 一致），并明确把内容正确性降为次要（"语义等价为次要""不逐字节"）。

**用户决策：先定「对」再谈稳定。** 本次以**产物正确性**为唯一主线，把"正确产物"重新定义为硬标准并写进 skill；跨模型稳定 spec 降为后续，且**必须反过来遵从本次定义的正确契约**（稳定半成品没有意义）。

## 2. 目标

1. 重新定义 case-draft 的**正确产物标准**：文件集 + archive.md 格式 + 用例内容质量基准 + 命名规范，全部可机器校验。
2. 把标准**写进 skill** 作为硬约束（hard_rules + 唯一来源 reference + 收尾硬校验门），两 runtime（claude / codex）同标准。
3. 确立**证据底线**：关键设计证据读不到时，用 AskUser 直接索要，绝不凭推断产出最终用例。
4. 交付目录**干净**：只留 QA/kata 直接消费的 4 件，过程/证据沉到隐藏子目录。

## 3. 范围决策（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 正确性基准来源 | 仓库无可直接照搬的样板（既有产物用户也不认）。**由本 spec 重新定义**，用户复核。 |
| 与稳定 spec 关系 | **先定「对」**；稳定 spec 后续做、且遵从本契约。 |
| 证据底线 | 关键设计证据（Lanhu 设计内容 / 相关源码）读不到 → **不出最终档**，**用 AskUser 一次性批量向用户索要**（贴内容 / 给 cookie / 传截图 / 给可读源码路径）；仅历史/推断不足以支撑"新增行为"的最终用例。 |
| 交付层文件集 | **4 件**：`archive.md` + `cases.xmind` + `metadata.yaml` + `manifest.json`。 |
| 过程/证据产物 | **全部移到 `{feature_id}/.process/` 隐藏子目录**（`confirmation-package` / `enhanced` / `coverage-matrix` / `case-evidence-map` / `unresolved-summary` / `tmp` 等）。保留可追溯性；跨模型 spec 的机器文件（`source-snapshot.json` / `coverage-matrix.json`）以后也住这里。 |
| 括号语义 | `【】` **专用于** `【Pn】` 优先级前缀；`「」` **用于所有** UI/菜单/选项/字段名。消除仓库混用。 |
| 标题规范 | 用例标题**禁止任何机器标识**（TC-ID / SR- / RA-）；自然中文动宾句 + `【Pn】` 前缀。 |
| frontmatter | 保留有消费方的字段，砍无消费方的（`product` / `description` / `dev_version`）。 |
| 章节层级 | 语义固定：`##`=模块 `###`=页面 `####`=子分组(可选) `#####`=用例（对齐 `xmind-gen` 解析契约）。 |
| 校验门 | 收尾**硬校验**：产物不符即 skill 未完成，必须修复。扩展现有 `kata cases lint`。 |

## 4. 输出产物标准（本次定义）

### 4.1 文件集契约

所有产物落在 `workspace/{project}/features/{feature_id}/`。

**交付层（只此 4 件，干净）**

| 文件 | 作用 |
|---|---|
| `archive.md` | 用例归档 —— 唯一权威用例源 |
| `cases.xmind` | 脑图视图，从 `archive.md` 经 `kata xmind-gen` 派生，逐字段一致 |
| `metadata.yaml` | feature 元数据（kata 索引，`FeatureMetadata@1`） |
| `manifest.json` | 产物索引 + automation 状态（`FeatureManifest@2`） |

**`.process/` 隐藏子目录（过程/证据，不污染交付层）**

`confirmation-package.md`、`enhanced.md`、`coverage-matrix.*`、`case-evidence-map.json`、`unresolved-summary.md`、`archive.draft.md`、`tmp/` 等，全部落此。条件产物仅在对应分支触发时产出（如 blocking 草稿、产品确认包）。

### 4.2 archive.md 格式规范（硬）

**frontmatter** —— 字段与消费方对齐（已核对 `engine/src`）：

```yaml
---
suite_name: "15662【数据地图】支持筛选数据表是否绑定数据目录"   # → XMind 需求名 + 搜索
root_name: "数据资产 v6.3 迭代用例"                          # → XMind 根
module: "元数据"
prd_version: "v6.3"                                         # → XMind 版本
prd_id: 15662                                              # → XMind requirement_id（统一用 prd_id）
tags: ["数据地图", "数据目录", "筛选"]                        # → archive 搜索
status: "草稿"                                              # 草稿 | 已评审（引擎归一）
create_at: "2026-05-25"
case_count: 8
origin: "case-draft"
---
```

- 砍掉 `product`（与目录 `workspace/{product}/` 冗余）、`description`、`dev_version`（无消费方）。
- `prd_id` 与 `case_id` 二选一，统一 `prd_id`（`xmind-gen` 两者都映射到 `requirement_id`）。

**章节层级**（语义固定，直接映射 `xmind-gen` 的 Module/Page/SubGroup/TestCase 树）：

```
## 元数据                    ← 模块层（Module）
### 数据地图                  ← 页面层（Page）
#### 是否绑定数据目录筛选       ← 子分组（SubGroup，可选）
##### 【P0】验证…            ← 用例（TestCase）
```

**用例标题规范**（硬）：
- 必带 `【Pn】` 前缀（`xmind-gen` 靠它解析优先级，缺省回退 P1）。
- **标题内禁止任何机器标识**：TC-ID、SR-、RA- 一律不进标题。
- 自然中文动宾句，例：`验证选择「已绑定」仅返回已绑定数据目录的数据表`。

**括号语义**（硬，统一）：
- `【】` 专用于 `【Pn】` 优先级前缀。
- `「」` 用于所有 UI/菜单/选项/字段名。

**前置条件 + 步骤**（沿用 `xmind-gen` 已固定的解析契约，不改）：

```
> 前置条件

​```
1. 已登录并有数据地图访问权限
2. 存在已绑定/未绑定数据目录的数据表
​```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | … | … |
```

### 4.3 用例内容质量基准（硬）

- 每条用例：≥1 前置条件、≥1 步骤，**每步预期具体可验**（禁止「页面正常打开」作为唯一断言）。
- **原子化**：一条用例一个验证目标，不堆叠多目标。
- 覆盖维度齐全：正常路径 + 边界 + 异常/空态 + 组合联动 + 持久化（刷新/分页/排序保持）。
- **每条用例可追溯到真实证据**（设计稿/源码/产品确认）；纯推断不进最终档（见 §4.5）。
- 优先级分布合理：核心 P0 / 边界 P1 / 异常 P2。

### 4.4 cases.xmind

- 永远 `kata xmind-gen` 从 `archive.md` 生成，**不手搓**；`archive.md` 改后即重生成。
- 节点可读性：单节点不堆多操作分句、引号项 < 3（沿用 `.ai/core/rules/case-qa.md`）。
- 与 `archive.md` 逐字段一致（版本/模块/标题/优先级/前置/步骤/预期）。

### 4.5 证据底线 + AskUser 协议（硬）

- 关键设计证据（Lanhu 设计内容、相关源码）读不到 → **不产出最终 `archive.md`/`cases.xmind`**。
- 改为 **AskUser 一次性批量索要**所有缺口：贴设计内容 / 提供 Lanhu cookie / 上传截图 / 给可读源码路径或分支。
- 拿到真实证据后再产出最终档；仅靠历史/推断**不足以**支撑"新增行为"用例。
- 该底线优先于"尽力产出"——凭空用例比没有用例更危险。

## 5. skill 改动点（落地）

改 `.ai/core/skills/case-draft/skill.yaml` 与 `references/`，改完跑 `kata ai-core projection render` + `projection lock render`，重渲染到 `.claude/` 与 `.agents/`。

1. **新建 `references/output-standard.md`**：本标准（§4 全部）的**唯一规范来源**，`normative`，在 `case-draft`/`case-review`/`output` 阶段加载。
2. **`outputs:` 收敛**：交付 4 件（`archive.md` / `cases.xmind` / `manifest.json` / `metadata.yaml`）为正式产物；过程/条件产物标注落 `.process/`。
3. **`hard_rules` 增**：① 括号语义；② 标题禁机器标识；③ 空预期禁令；④ 证据底线 AskUser；⑤ 文件集边界（交付 4 件 + `.process/`）；⑥ 章节层级语义。
4. **`codex_override` 同步**：两 runtime 同标准（与 §1 跨模型根因一致，本次先保证"同一正确标准"）。
5. **收尾硬校验门**：扩展 `engine/src/cli/cases-lint.ts`（或新增 archive 格式校验）：
   - 交付层只有 4 件、无过程文件泄漏；
   - 标题无机器标识、`【Pn】` 合规、括号语义；
   - 每条用例有步骤 + 具体预期；
   - frontmatter 字段集合规；
   - 不过 → 退出码非零 → skill 未完成。

## 6. 范围边界（YAGNI）

- **只做 case-draft 输出标准 + skill 改造 + 收尾校验门**。
- **不做**跨模型 `compare` / `e2e harness` / `source-snapshot.json` / `coverage-matrix.json`（属稳定 spec 后续）。
- 不批量回刷既有 50+ feature 到新标准（按需逐个，非本次）。
- 不引入 LLM-judge。

## 7. 待核对/开放项

1. frontmatter 字段最终集合需对每个字段逐一核对消费方（已核：`suite_name`/`root_name`/`prd_version`/`prd_id`/`case_id`/`tags`/`case_count`/`status` 有消费方；`product`/`description`/`dev_version` 无）——实现阶段再确认 `features-index.ts`、`cases-validate.ts` 是否另有依赖。
2. `.process/` 是否需被 `.gitignore` 或 kata lint 排除，避免被当作交付物校验。
3. 收尾校验门是扩展 `cases-lint` 还是新增独立命令——实现阶段定。

## 8. 验收标准（Definition of Done）

1. `references/output-standard.md` 落地，`skill.yaml` `outputs:`/`hard_rules`/`codex_override` 按 §5 更新，`projection render` + `lock render` 通过，`bun run lint:ai-core` 通过。
2. 收尾校验门可用：交付层 4 件、无过程泄漏、标题无机器标识、括号语义、空预期禁令、frontmatter 合规——各有过/不过单测。
3. 证据底线生效：源读取失败时走 AskUser 索要、不产最终档——有对应测试或 fixture。
4. 用同一需求重跑（或回放 codex fixture），产物符合 §4 全部标准。
