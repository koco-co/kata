---
title: sql-merge-validate skill 设计
date: 2026-06-05
status: draft
owner: koco-co
related:
  - 质量规则合并细节技术方案.md
  - workspace/dataAssets/features/【v6.4.11】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并/
  - workspace/dataAssets/features/【v6.4.11】【岚图汽车】【数据资产】落标检查任务性能优化，规则sql合并/
sources:
  - dt-center-assets@hotfix_6.3.x_ltqc_149659
  - dt-center-metadata@feat_6.3.x_ltqc_19639
verified_against:
  - monitorId=4471 真实数据（packagelist/packagesql + assets_dq_monitor_rule），2026-06-05 快照
---

# sql-merge-validate skill 设计

## 1. 背景与目标

v6.4.11 对「数据质量监控任务」和「落标检查任务」做了性能优化：把可合并的子规则
合并成一条 SQL（扫一次源表、多个 `SUM(CASE WHEN)` 并行计算、`LATERAL VIEW STACK`
拆行），不可合并的规则仍走原 union 逐条逻辑。详见 `质量规则合并细节技术方案.md`。

这种合并对 QA 极难手工验收：要逐包读上千行生成 SQL，核对「该合的合了没、不该合的
有没有被错合、强弱有没有分开、抽样/分区/过滤条件有没有正确体现、分包对不对」。

**目标**：做一个 skill，输入一个质量任务标识 + 一段预期描述，自动校验该任务**所有
规则包**生成 SQL 的合并正确性，在终端给出逐包结论；发现缺陷可联动 bug 报告 skill。

**非目标**：见 §13。

## 2. 范围与核心约束

覆盖两种任务（两种模式）：

- `dq`：数据质量监控任务合并。输入 `monitorId`。合并 SQL 走 `packagesql` 接口。
- `std`：落标检查任务合并。输入落标任务 id（`metadata_standard_table_check.id`）。
  合并 SQL 直接存在 DB（`metadata_standard_table_check_package.sql_text`）。

**核心约束（用户确认）**：

1. **不产出任何文件**。全程终端问答，结论直接在对话给出。脚本中间产物只落 `/tmp`，
   不写进 feature 目录或仓库。
2. **真值来源 = DB 元数据为权威**，三方比对（见 §6/§7）。
3. **校验方法 = 脚本确定性提取 SQL 结构事实 + 比对**；模型只做语义复核与叙述。
4. 发现预期之外的缺陷 → **联动 `defect-analyze` bug 模式**生成 bug / 推禅道（见 §8）。
5. **一次性/可丢弃**：服务 v6.4.11 这批合并需求，过后不复用；脚本自包含在 skill 的
   `scripts/` 目录，不进共享 SDK，保持轻量、可整体删除（见 §10）。

## 3. 输入与收集（Step1：AskUser）

用 AskUserQuestion 收集，凭据带默认值、可回车确认：

| 输入 | 用途 | 默认/示例 |
| --- | --- | --- |
| 模式 | `dq` / `std` | 由用户给的标识推断，含糊则问 |
| 任务标识 | `dq`→monitorId；`std`→落标任务 id | 如 `4471` |
| baseUrl | `dq` 调接口 | `http://shuzhan63-test-ltqc.k8s.dtstack.cn` |
| cookie | `dq` 调接口鉴权（含 `dt_token`） | 用户粘贴 |
| X-Valid-Project-ID | `dq` 接口必带头 | 如 `92` |
| DB host/port/user/pass | 取规则元数据/落标 sql_text | `172.16.124.100:30882 / root / <DB_PASSWORD>` |
| 预期描述（可选） | 人读交叉核对，非硬真值 | 用户粘贴 |

降级：cookie 失效/接口 401 → 提示重取，不静默；DB 不可达 → 降级为「SQL 结构事实 +
预期文本」比对并显式声明无法独立判定分组真值（见 §9）。

## 4. 架构与组件

确定性脚本提取事实、模型做语义判定与叙述。流水线：

```
AskUser(输入)
  ↓
[1] fetch        dq: packagelist→逐包 packagesql；std: 读 DB sql_text   → 每包 SQL 文本
  ↓
[2] db-metadata  按 package_id 取规则元数据 + merge_group_key / check_columns → 规则真值表
  ↓
[3] sql-extractor 确定性解析每包 SQL                                    → 结构事实 JSON
  ↓
[4] expectation  按文档算法独立重算「应合并分组」                        → 期望分组
  ↓
[5] comparator   三方比对（期望 vs merge_group_key vs 实际 SQL），逐包判 7 维 → verdict
  ↓
模型：知识库语义复核（condition/expansion/have_dirty）+ 渲染终端报告 + 失败联动 bug
```

组件职责：

- **脚本（确定性，可复现）**：[1]–[5]，输出结构化 verdict。
- **知识库 `references/`**：规则字典、合并白名单、落标校验项白名单、合并/抽样 SQL 范式。
- **模型（语义层）**：判 `SUM(CASE WHEN)` condition 是否匹配 function 模板、占比 expansion
  是否为「命中/总数」、`have_dirty=0` 规则是否正确不进脏数据；组装终端报告、失败联动 bug。

**sql-extractor 抽取的结构事实**（每包）：

- 源表 `FROM` 在合并块内出现次数（应 = 1）
- 合并块内 `SUM(CASE WHEN)` / `count(distinct)` 清单 → 各自 rule_id 与 condition 文本
- `LATERAL VIEW STACK(N, ...)` 的元数 N 与拆出的 rule_id 列表
- 脏数据 `LATERAL VIEW explode(filter(array(...)))` 里的 rule_id（落标/抽样形态）
- 脏表名：`dq_monitor_#{jobId}_<merge_group_key | ruleId>`
- `rand()` / `_temp_sample_table_#{jobId}` 是否存在；抽样表建表/灌数/尾部 DROP
- 分区谓词（如 `dt='xxx'`）出现的位置（抽样表填充 / 源扫描 / 脏数据查询）
- 各 union 段（不可合并规则的独立扫描段）

## 5. 数据流（两模式）

### 5.1 dq 模式（数据质量，已用 4471 真实跑通）

1. `POST {baseUrl}/dassets/v1/valid/monitor/packagelist`，body `{"monitorId":"4471"}`，
   带 cookie + `X-Valid-Project-ID` → 返回 `data:[{packageId,packageName}]`（4471→4622..4630）。
2. 逐包 `POST .../monitor/packagesql`，body `{"packageId":"4622"}` → `data` 是整段合并 SQL 字符串。
3. DB 一次性查 `assets_dq_monitor_rule WHERE monitor_id=? AND (is_deleted=0 OR NULL)`，
   取 `id, function_id, rule_strength, column_name, filter, merge_group_key, is_percentage, package_id`。
4. **对齐键**：packagelist 的 `packageId` = DB `package_id` = SQL 内嵌 `rule_id` 所属包。
   三者按 `package_id` + `rule_id` 对齐。
5. 一个 monitor 可能存在多套 `rule_package_id`（4471 有 2391/2392 两套）；**以 packagelist
   实际返回的包为准**，DB 侧按这些 package_id 过滤。

### 5.2 std 模式（落标，按 schema 设计，当前环境无数据）

1. DB 读 `metadata_standard_table_check_package WHERE standard_table_check_id=? AND 未删`，
   每包取 `sql_text`（合并 SQL）+ `check_columns`（每列校验项 JSON）+ `dirty_schema_name`。
2. 期望分组从 `check_columns` 的校验项类型推导（无 merge_group_key、无 filter，按列 + 多车型）。
3. 落标表当前环境为空（功能已部署未跑数）；std 路径暂只过结构/schema 校验，待真实数据端到端验。

## 6. 合并规则知识库（references/）

### 6.1 合并键（dq）—— 修正

合并键 = **`同源表 + 同标准化 filter + 同强弱(rule_strength) + function_id ∈ 可合并白名单`**，
**与字段(column)无关**；组内规则数 ≥ 2 才合并，单条退回不合并。

> 证据：monitor 4471 包 4622 合并组 `eUvlyF1G` 的 5 条规则字段各不同
> (id,age / name / money / string_num)，均弱规则、同 filter `id<=100`，被合进一个 SUM 块；
> 用例第 36 步预期「1、5、7、9 合并」字段同样各不同。技术方案 §5.2.1 写的「columnNameStr
> 相同」与实现不符，**以实现 + 用例预期为准**（字段不入键）。

### 6.2 可合并白名单（dq）

- 文档白名单（方案 §5.2.1）：`{1,3,4,5,6,11,12,13,14,15,16,17,20,21,25,30,49}`。
- 经验集（DB 中 merge_group_key 非空的 function_id）：`{1,3,4,5,6,12,25,26,30,49}`。
- **分歧：fn26（length_str 字符串长度）实际被合并，但不在文档白名单。** 白名单作为 KB 显式
  标注此分歧；当某 function 的 merge_group_key 非空却在规格白名单外，**作为 finding 抛出**，
  不静默通过（§7 子检查 + §8）。
- 不可合并类（恒不进白名单）：type=4 分组类(7/8/9/10/34)、type=6 异常值(35/36/37/38)、
  type=7/8/9 多表/时间差/合理性、正则模板(22/23/24/31/32/33)、多表(40/41/45/50)、自定义 SQL。

### 6.3 have_dirty 与占比语义（dq）

- `assets_dq_function.have_dirty=0`（fn1 表行数 / fn12 枚举个数 / fn20 求平均 / fn21 求和）：
  在 SUM 块算 `val`，但**不得**出现在脏数据 `explode(array(...))` 与 `dq_monitor_#{jobId}_xxx`
  脏表（实测 fn12/rule 13035 确实未进脏数据）。
- `is_percentage=1`（占比，如空值率/取值范围&枚举）：`val` 应为 命中/总数（`CAST(hit AS DOUBLE)/total`，
  total=0 时为 0）；`expansion` 应为 `CONCAT(hit,'/',total)`。

### 6.4 落标校验项白名单（std）

- 可合并：数据长度、数据精度、允许空值、取值范围。
- 不可合并：是否重复。
- 多车型用 `(cond AND 车型1) OR (cond AND 车型2)` OR 分支合并；无 filter、无 merge_group_key。

## 7. 七维校验矩阵（确定性，逐包判 PASS/FAIL）

用例的规则包名即七维场景组合：
「可合并 + 不可合并 + 抽样开启 + 设置分区 + 不同过滤条件 + 包含强弱规则 + 多/单规则包」。

| # | 维度 | 判据（证据来自 sql-extractor + db-metadata） | FAIL 信号 |
| --- | --- | --- | --- |
| ① | 可合并→已合并 | 同源表+同filter+同强弱+可合并 且组内≥2 的规则，全部进同一 `SUM(CASE WHEN)` 块；源表 `FROM` 仅 1 次；`STACK(N)` 拆出恰好这 N 个 rule_id | 该合的散在 union 段 / FROM 多次 |
| ② | 不可合并→未合并 | function 不在白名单 / 桶内独一份 → 独立 union 段、自带 FROM、自带脏表 `_<ruleId>` | 被塞进 SUM 块 |
| ③ | 抽样开启 | `_temp_sample_table_#{jobId}` 建+灌+尾 DROP；块 `FROM` 抽样表；脏数据 `ROW_NUMBER() OVER(... ORDER BY rand()) ... rn<=N` | 直扫源表 / 缺 rand() / 缺抽样表 |
| ④ | 设置分区 | 分区谓词（如 `dt='xxx'`）正确出现在抽样表填充（抽样时）或源扫描（非抽样时），脏数据查询亦带；不漏不重不错位 | 分区谓词缺失 / 错位 |
| ⑤ | 不同过滤条件 | filter 是合并键一部分：不同 filter 不得合进同一 SUM 块；同 filter+强弱+可合并 才合并；块内 WHERE filter 全块一致 | 不同 filter 被合并 / 同 filter 漏合 |
| ⑥ | 强弱规则 | 任何 SUM 块 / STACK 内不混 strength=1 与 2；强弱各自成组 | 同块混强弱 |
| ⑦ | 多/单规则包 | 合并组（同 merge_group_key）不跨包；每包强弱同质；包数符合用户设置（=1 全进一包但块内仍强弱分合；=2 强弱各一包；=total 一规则一包；其余 merge 优先、unable 补） | 合并组被拆 / 强弱混包 / 包数不符 |

**附加子检查**：

- have_dirty=0 规则不进脏数据数组与脏表（§6.3）。
- 占比规则 val/expansion 语义正确（§6.3，模型 + KB）。
- 白名单分歧：merge_group_key 合并了规格外 function（如 fn26）→ finding（§6.2 / §8）。

**std 模式镜像同七维**：用校验项白名单代替 function 白名单；用多车型 OR 分支代替单 filter；
期望分组从 `check_columns` 推导（无 merge_group_key）。

## 8. 终端报告与 bug 联动

**不落盘**，只在终端输出：

1. 任务概览：模式、任务标识、包数、规则总数、抽样/分区是否开启。
2. 逐包矩阵：每包 ①–⑦ 的 PASS/FAIL/NA（NA = 该包不涉及该维度）。
3. 每个 FAIL 的证据：包号、出错 rule_id、期望分组 vs 实际结构事实、定位到的 SQL 片段。
4. 白名单分歧等 finding 单列。

**bug 联动**：

- 全包 PASS → 输出「合并校验通过」汇总矩阵，结束。
- 有 FAIL/finding → 汇总后用 AskUserQuestion 问「是否把这些合并缺陷交给 `defect-analyze`
  生成 bug / 推禅道？」（推荐「是」）。选「是」→ 组装证据（包号、rule_id、期望 vs 实际、
  SQL 片段）转交 defect-analyze bug 模式；选「否」→ 结束。

## 9. 错误与降级

| 情况 | 处理 |
| --- | --- |
| cookie 失效 / 接口 401 | 提示重取 cookie，不静默；dq 模式无 SQL 即停 |
| DB 不可达 | 降级为「SQL 结构事实 + 用户预期文本」比对，显式声明无法独立判定分组真值 |
| 本地 mysql 9.5 CLI 不兼容 `mysql_native_password` | 脚本改用支持 native_password 的驱动（TS `mysql2`，与 Bun 工具链一致；pymysql 可应急） |
| 落标环境无数据 | 明确告知 std 模式当前只过结构校验，等真实落标任务跑过再端到端验 |
| packagesql 返回非合并/退化形态 | 按「全部独立 union 段」处理，照样判 ②⑦ |

## 10. 打包与契约

**一次性/可丢弃定位**：本 skill 服务 v6.4.11 这一批合并需求，需求过后不再复用。因此
**脚本全部自包含在 skill 自己的 `scripts/` 目录下**，**不写进 dtstack-sdk / kata CLI 共享层**
（不新增 `kata <subcommand>`、不放 `.claude/scripts/_shared/`），保持轻量、最小仪式，
便于需求结束后整体删除而不留共享层残骸。

- 目录：`.claude/skills/sql-merge-validate/`
  - `SKILL.md`：frontmatter 仅用白名单字段（name / description / argument-hint /
    user-invocable / model / effort），description 前置触发线索（monitorId + 预期 / 校验规则
    SQL 合并），并声明 std 与 bug 联动的路由边界。
  - `scripts/`：fetch、db-metadata、sql-extractor、expectation、comparator —— **自包含、零共享依赖**。
    语言取最轻的自包含方案：Python（`pymysql` 已实测可连库、`urllib`/`curl` 调接口，不污染
    项目 Bun 依赖）或 TS（Bun 内置 fetch + `mysql2`）；二选一在实现计划里定，避免为一次性
    脚本给项目加长期依赖。
  - `references/`：rule-dictionary、merge-rules、std-check-merge（各 ≤ 行数上限）。
- 路由：`CLAUDE.md` 命令索引表 + 路由规则补一行（monitorId+预期 / 落标任务 id → 本 skill）。
- 契约校验：`bun run check:skills`（SKILL.md frontmatter 契约必须绿）、`bun run check` lint
  对纳入的脚本绿；脚本自测见 §11。一次性定位下不强求接入 `strategy-templates.test.ts` 等
  共享模板测试，除非新增 SKILL.md 触发其断言时按需补齐。
- Git：按项目 worktree-first 流程，在 detached worktree 内实现 + 验证，合并回 main 再 push。

## 11. 验证策略

- **dq 模式**：已用 monitor 4471 真实数据全程跑通（packagelist 9 包、packagesql 合并 SQL、
  assets_dq_monitor_rule 元数据 + merge_group_key），结构事实与 merge_group_key 对齐验证通过。
- **std 模式**：按 `metadata_standard_table_check_package` schema + 方案 §5.6 设计；当前环境
  落标表为空，仅能做结构/schema 校验，**未做真实数据端到端验证**（坦诚标注）。
- 脚本单测：sql-extractor 对若干真实/构造 SQL 样本断言结构事实；comparator 对已知
  PASS/FAIL 样本断言判定。改后即跑相关测试，失败必修。

## 12. 未决与风险

- **fn26 白名单分歧**：实现合并 fn26、文档白名单未含；需用户/开发确认是「文档漏列」还是
  「实现误合」。skill 先作 finding 抛出，不预设结论。
- **落标真实数据缺失**：std 路径上线前需在有落标任务的环境补端到端验证。
- **filter 标准化**：filter 是 JSON 配置（`{"conditionType":...}`），比较需标准化（解析后规范化
  再比，而非裸字符串）；标准化口径需与后端 MergeKey 构造一致，作为 KB/脚本的明确实现点。
- **凭据安全**：cookie / DB 密码仅运行期用，不写进任何产物或仓库（§2 约束）。
- **环境/数据漂移**：结论标注所依据的 commit 与快照日期（本设计依据 2026-06-05 快照）。

## 13. 非目标（YAGNI）

- 不真连库执行生成 SQL 验算结果（含 `#{jobId}` 占位、依赖 Yarn/集群，不现实）。
- 不产出 archive/report 等文件，不做 XMind/CSV。
- 不校验规则本身的业务正确性（阈值、期望值对不对），只校验**合并结构**正确性。
- 不覆盖合并范围外的规则类型（多表 join、正则模板、自定义 SQL 的内部逻辑）。
- 不做监控任务的保存/运行等写操作；全程只读。
