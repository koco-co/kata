# 岚图主流程用例优化 — 设计

- 日期: 2026-05-25
- 目标产物: `workspace/dataAssets/features/2099-01-lt-dq-main-flow/`(`岚图主流程用例整理.md` + `.xmind`)
- 内容来源: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/`(只读)
- 真值源: 源码(前端 `dt-insight-studio@dataAssets/release_6.3.x_ltqc`、后端 `dt-center-assets@release_6.3.x_ltqc`)、`ltqc-local.yaml` DOM
- 执行模型: 全量交给 codex(多实例并发),Claude 仅做编排、合并、渲染、自检、沉淀

## 1. 背景与现状

`岚图主流程用例整理.md`(621 例)存在系统性规范缺陷:

- 层级塌陷:模块放在 `###`(应为 `##`),缺少 `## 模块 → ### 菜单 → #### 功能点 → ##### 用例` 标准层级
- frontmatter 不合规:含禁用字段 `description`,缺 `module/root_name/prd_version/prd_id/origin`
- 格式 bug:SQL 注释泄漏成 markdown 标题(如第 5994 行 `# 表在白名单中...`)
- 数据质量段按"需求名"分组,无法保证 8 大规则下每条小规则都有用例
- 数据标准-落标检查、数据质量用例来自不同作者,格式/规范/前置条件 SQL 不统一

launched-reqs(1216 例,按 `## 版本 → ### 需求名` 组织)是已上线需求的历史用例池,作为内容来源。

## 2. 范围

| 模块 | 处理深度 |
|---|---|
| 数据质量(全模块,8 大规则) | 深度重建:按规则分类法重组,每小规则 ≥1 例 |
| 数据标准(整模块) | 落标检查子模块深度重建;其余子模块格式标准化 + 覆盖体检 |
| 资产盘点 / 元数据 / 数据模型 / 数据安全 / 平台管理 | 格式标准化 + 覆盖体检(补"功能点零用例"缺口) |

- launched-reqs 只读,不修改。
- 不做全模块功能穷举,非重点模块只补缺口。

## 3. 总体架构

```
Claude(编排层)
 ├─ 准备: 更新 codex 插件 → 克隆前后端源码仓库(release_6.3.x_ltqc)→ 写「规格包」+ 每模块 prompt-file
 ├─ 并发派发 codex(codex-companion --prompt-file 直发, 多实例并行, 各写独占 fragment):
 │    批次一(深度重建, 9 实例):
 │      数据标准 ×1(落标检查深度重建 + 其余子模块格式标准化)
 │      数据质量 ×8(完整性/有效性/唯一性/统计性/自定义SQL/一致性/时效性/合理性)
 │    批次二(格式标准化+覆盖体检, 5 实例):
 │      资产盘点 / 元数据 / 数据模型 / 数据安全 / 平台管理
 │    每实例 → .process/fragments/<key>.md(独占文件, 零写冲突)
 ├─ 合并: 片段按模块顺序拼接 → 岚图主流程用例整理.md, 统一 frontmatter + case_count
 ├─ 渲染: 重生成 .xmind(scripts/build-main-flow-xmind.mjs / kata xmind-gen)
 ├─ 自检: 层级/标题/括号/空断言/覆盖矩阵, 不达标回派对应 codex 实例
 └─ 沉淀: knowledge-curate 落库权威小规则清单 + 新踩坑
```

### 3.1 并发与写冲突

多个 codex 不可同时改同一个 851KB 的 md。每实例**独占一个 fragment 文件**(`.process/fragments/<key>.md`),Claude 最后合并。这是获得真并发又零冲突的唯一干净路径,且单实例上下文聚焦单模块,降低 codex 臆造路径风险。

### 3.2 分批策略

先派批次一(9 个深度重建实例),产出后 Claude 抽检规格合规性,再派批次二(5 个格式实例),降低返工。

### 3.3 codex 约束

- codex 直接写各自 fragment 文件(独占,安全)。
- 禁止脚本机械转换;逐条语义重写。
- Claude 不预先推导小规则清单,在 prompt-file 中给 codex 精确的源码搜索起点,由 codex 自源码推导权威清单。

## 4. 格式/标准化规格(规格包,所有实例共享)

每个 fragment 必须满足:

- **章节层级**: `## 模块 → ### 菜单/页面 → #### 功能点(可选) → ##### 【Pn】用例`
- **用例标题**: 必带 `【Pn】` 前缀;禁止机器标识(TC-ID/SR-/RA-);自然中文动宾句
- **括号语义**: `【】` 仅用于 `【Pn】`;`「」` 用于所有 UI/菜单/选项/字段名
- **内容质量**: 每条 ≥1 前置条件、≥1 步骤,每步预期具体可验(禁止"页面正常打开"类空断言);原子化(一例一验证目标);可读换行(前置/步骤/预期分段,SQL 用代码块)
- **前置条件 SQL**: 有数据依赖的用例给可执行 SQL(`DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT` 三段可重入,按数据源方言;岚图默认 SparkThrift2.x)
- **frontmatter**: 补齐 `suite_name/root_name/module/prd_version/prd_id/tags/status/create_at/case_count/origin`,删 `description`
- **已知 bug**: SQL 注释泄漏成 `#` 标题的,必须包进代码块

参照真值: `.claude/skills/case-draft/references/output-standard.md`、`_shared/rules/case-writing.md`、`_shared/rules/xmind-structure.md`、`_shared/knowledge/modules/data-quality.md`。

## 5. 数据质量模块重建(重点①)

- **组织**: `## 数据质量` → `### <8 大规则>` → `#### <小规则>` → `##### 【Pn】用例`
- **权威小规则清单**: codex 从源码(规则库内置规则定义)推导,非凭记忆。8 大规则 = 完整性/有效性/唯一性/统计性/自定义SQL/一致性/时效性/合理性;每大规则枚举全部小规则(如 完整性-字段级-空值数、完整性-单表-表行数…),每小规则 ≥1 例
- **内容来源优先级**: ① 源码(规则行为/字段/按钮/toast)② launched-reqs 已有用例(语义复用+标准化)③ DOM yaml(按钮/提示核对)。冲突以源码为准
- **覆盖维度**: 每小规则至少 校验通过 + 校验不通过(明细/报告展示);按业务流 规则库→规则集→规则任务→校验结果→质量报告 串联
- **业务约束**(见 data-quality.md): 不得跳过规则集直接在规则任务建规则;数据源选型 sparkthrift2.x > doris3.x > hive2.x

## 6. 数据标准模块重建(重点②)

- 由 1 个 codex 实例处理整模块:`数据标准-落标检查` 子模块深度重建;数据标准其余子模块按 §7 格式标准化 + 覆盖体检
- 来源: 源码 + launched-reqs 落标检查相关需求(如「支持 dbc 标准落标检查」「落标检查任务配置环境参数」)
- 统一为 §4 规格,前置条件给可执行 SQL/数据准备,操作步骤清晰

## 7. 非重点 5 模块

- **格式标准化**: 现有用例就地改写为 §4 规格
- **覆盖体检**: 对照源码/DOM 列功能点,确保每功能点 ≥1 例;缺口从 launched-reqs/源码补(不穷举)

## 8. 合并、渲染、自检、沉淀

- **合并**: Claude 按模块顺序拼接 fragments → `岚图主流程用例整理.md`,统一 frontmatter 与 `case_count`
- **渲染**: 重生成 `岚图主流程用例整理.xmind`(复用/调整 `scripts/build-main-flow-xmind.mjs`),xmind 与 md 逐字段一致、节点可读(单节点不堆多操作、引号项 < 3)
- **自检**: 层级/标题/括号/空断言/覆盖矩阵(每小规则、每功能点命中)体检;不达标回派对应 codex 实例
- **沉淀**: `knowledge-curate` 把权威 8×小规则清单、新发现的按钮/toast/踩坑落库到 `_shared/knowledge`

## 9. 前置条件

1. 更新 codex 插件到最新
2. 克隆源码仓库到 `.kata/repos/customltem/`(`dt-insight-studio@dataAssets/release_6.3.x_ltqc`、`dt-center-assets@release_6.3.x_ltqc`)
3. 确认 `workspace/dataAssets/_shared/env/ltqc-local.yaml` DOM 可用

## 10. 验收标准

- md 通过 §4 全部硬规则;无 `description` 字段、无泄漏 `#` 标题
- 数据质量 8 大规则下每条小规则均 ≥1 例,且小规则清单可追溯源码
- 数据标准-落标检查、数据质量、5 个非重点模块均符合 §4 规范
- 每模块功能点 ≥1 用例(覆盖体检通过)
- xmind 与 md 逐字段一致,节点可读
- 权威小规则清单与新踩坑已入知识库

## 11. 风险

- **codex 源码推导偏差**: 小规则清单是核心,prompt-file 必须给精确源码搜索起点;Claude 抽检批次一时重点核对清单完整性
- **合并顺序/重复**: fragment 按固定模块顺序拼接,Claude 校验无重复/遗漏 case
- **xmind 体量**: 合并后用例数可能显著增长,渲染需校验 xmind 节点上限与可读性
