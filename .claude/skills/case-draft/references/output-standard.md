# case-draft 输出产物标准（normative）

> 本文件中带 `(硬)` 的条款均为 hard_rules。文末「## 用例级节点格式（Case-Level Normative）」节是用例级格式 SSOT：旧投影规则、case-edit 同步参考与 skill 配置如出现条款冲突，以本节为准。

## 文件集
- 交付层（feature 根，仅 4 件）：archive.md、cases.xmind、metadata.yaml、manifest.json。
- 机器层 + 过程/证据：一律落 `.process/`（source-snapshot.json、coverage-matrix.json、enhanced.md、confirmation-package.md、case-evidence-map.json、unresolved-summary.md、archive.draft.md、tmp/）。feature 根禁止出现这些文件。

## archive.md frontmatter（字段固定）
suite_name / root_name / module / prd_version / prd_id / tags / status / create_at / case_count / origin。
禁止 product / description / dev_version 等无消费方字段。prd_id 与 case_id 统一用 prd_id。

## 章节层级（映射 xmind-gen 树）
详见文末「## 用例级节点格式（Case-Level Normative）」节通用 Markdown 用例节点规则 1（SSOT）。

## 用例标题（硬）
- 必带 `【Pn】` 前缀（工具解析优先级）。
- 标题内禁止任何机器标识：TC-ID、SR-、RA-。
- 自然中文动宾句。

## 括号语义（硬）
详见文末「## 用例级节点格式（Case-Level Normative）」节通用 Markdown 用例节点规则 4（SSOT）。

## 用例内容质量（硬）
- 每条用例 ≥1 前置条件、≥1 步骤，每步预期具体可验；禁止「页面正常打开」作为唯一断言。
- 原子化：一条用例一个验证目标。
- 覆盖维度齐全：正常 + 边界 + 异常/空态 + 组合联动 + 持久化。
- 每条用例可追溯真实证据；纯推断不进最终档（见证据底线）。

## cases.xmind
- 永远 `kata xmind-gen` 从 archive.md 生成；archive 改后即重生成；与 archive 逐字段一致。
- 节点可读性：单节点不堆多操作分句、引号项 < 3。

## 证据底线（硬）
- 关键设计证据（Lanhu 设计内容、相关源码）读不到 → 不产出最终 archive.md/cases.xmind。
- 用 AskUser 一次性批量索要缺口（贴内容 / Lanhu cookie / 截图 / 可读源码路径）。拿到真实证据再产出。

## 用例级节点格式（Case-Level Normative）

本节是用例级（H5 用例标题及其所有子节点）格式的唯一权威源（SSOT）。
- 旧投影规则、case-edit 同步参考与 skill 配置如出现条款冲突，以本节为准。
- 标 `(硬)` 的条款均视为 hard_rule，违反必须阻塞产出。
- 其他后续新增的 case 相关规则/技能/投影文件如涉及用例级条款，同等以本节为准。

### 通用 — Markdown 用例节点

1. (硬) 层级：`## 一级模块` → `### 二级模块` → `#### 子分组(可选)` → `##### 【Pn】用例标题`。用例 = H5。
2. (硬) 标题结构：`【Pn】+ 验证动词 + 验证对象 + 验证场景/结果`。验证对象内可嵌套业务括号 `【...】`（如规则名、字段类型）。
3. (硬) 标题禁机器标识：TC-ID、SR-、RA- 等一律不进标题。
4. (硬) 括号语义：`【】` 用于 `【Pn】` 优先级前缀、业务子括号（如规则名）以及菜单/页面导航路径（如 `进入【数据质量 → 规则任务管理】`）；`「」` 专用于 UI/按钮/字段/选项/单据/标签页名。
5. (硬) 用例正文按顺序包含两个 blockquote 段落，且只能出现一次：
   - `> 前置条件` → 紧跟一个 ` ```sql ` 代码块。
   - `> 用例步骤` → 紧跟一个三列表格 `| 编号 | 步骤 | 预期 |`。
6. (硬) 前置条件代码块内部结构：
   - 顶部 `/* ... */` 多行 SQL 注释，逐条编号描述「依赖的环境/数据源/通用配置/SQL 准备目的」。
   - 紧随可执行 SQL（USE / DROP / CREATE / INSERT / SELECT）；凡用于验证的 SELECT，末尾必须用 `-- 预期结果：N` 行内注释标注期望返回行数。
   - 环境差异项（数据库/Schema/表/库）一律用 `${SchemaA}` 等占位符；不得硬编码租户库名。
   - 非 SQL 的说明文字必须写在 `/* ... */` 注释块内，不得与可执行 SQL 混排。
7. (硬) 步骤表格规则：
   - 「步骤」单元格写「动作 + 冒号 + 配置项列表」，配置项以 `<br>- ` 拆行。进入路径用 `进入【模块 → 页面】`，按钮/字段用 `「」`。
   - 「预期」单元格用 `1)` `2)` … 编号断言，多条预期用 `<br>` 拆行。禁用「页面正常打开」之类空泛断言作为唯一预期。
   - 一行表格 = 一个交互页面/阶段的操作；不同页面（如「监控规则」与「调度属性」）必须拆成不同行。
   - 编号必须与操作发生顺序一致。
   - 表单中如有「规则描述」「备注」等描述类字段，必须填写有业务含义的内容，不得留空；预期需验证「保存 + 详情回显」。

### 通用 — XMind 用例节点（镜像 Markdown）

8. (硬) 用例 topic title = Markdown H5 标题原文（含 `【Pn】` 前缀，含业务括号）。
9. (硬) 用例 topic 必须挂 priority marker，对照表：

   | Markdown 标题前缀 | XMind markerId |
   | --- | --- |
   | `【P0】` | `priority-1` |
   | `【P1】` | `priority-2` |
   | `【P2】` | `priority-3` |
   | `【P3】` | `priority-4` |

10. (硬) 用例 topic 的 `notes.plain.content` = Markdown 前置条件代码块的**裸内容**（含 `/* */` 注释 + SQL 本体，剥离三引号 sql 围栏与结尾三引号）。
11. (硬) 用例 topic 的 attached children = 步骤列表；每个步骤是一个 child topic，title = markdown 表「步骤」单元格的**真实换行**版本（把 `<br>` 还原为 `\n`，把 `<br>- ` 还原为 `\n- `）。
12. (硬) 每个步骤 topic 下挂**一个**预期 grandchild topic，title = markdown 表「预期」单元格的真实换行版本。
13. (硬) XMind 节点 title 与 notes 内一律禁出现 `<br>`。超长 SQL/前置/步骤/预期需要拆成 children 或 notes，不得堆进单 title。
14. (硬) 单个步骤 topic title 不得包含 3 个及以上 `「...」` 引号项；超过须再拆 child 或换行。

### 数据质量子集 — DQ 规则任务管理类用例

15. (硬) 标题对象部分用三段式 `【校验类型-生效范围-统计函数】`（如 `【完整性校验-字段级-空值数】`），保留业务括号。
16. (硬) 前置条件 SQL 必须包含：`USE ${SchemaA}` → DROP/CREATE 分区表（带 `PARTITIONED BY`、`STORED AS ORC`）→ 多分区 INSERT 制造正/异常数据 → SELECT 校验空值数/期望值。
17. (硬) 步骤必须按业务前置链顺序：
    1. 「规则集管理」新建规则集 + 规则包；
    2. 在规则包中新增校验规则（含「规则描述」必填业务句）；
    3. 「规则任务管理」新建监控规则；
    4. 引用规则包；
    5. 配置「调度属性」并执行；
    6. 进入「校验结果查询」查询实例详情。
18. (硬) 正/异常对照不得通过改规则集期望值制造失败。保持规则集 + 规则包内容不变，只在「规则任务管理」编辑任务分区后再执行。
19. (硬) 「规则描述」字段必填业务含义句；预期必须验证「保存成功 + 规则集详情回显规则描述」。

### 证据与验证范围

20. (硬) 交付结论必须明确区分验证范围：静态格式、数量、XMind 同步或规则矩阵检查只能证明产物结构满足约束；未读取源码、DOM 配置或未在真实平台/数据源执行时，不得宣称用例业务配置、控件路径或规则运行结果已被完整验证。
21. (硬) 用户明确提供或要求参考源码、DOM 结构、环境 YAML、截图中的表单控件时，批量生成或编辑用例前必须先读取这些证据源并建立表单字段基线；步骤中不得出现源码/DOM/截图中不存在的表单字段、配置项或控件名称，除非明确标注为前置数据或后台配置。
22. (硬) 表单字段基线必须进入 case-review：表单类用例的字段、选项、按钮、配置项应能追溯到 repo.line、workspace.config、screenshot 或平台 DOM/YAML 证据；仅有历史用例、few-shot 或模板时，不得产出最终 archive.md/cases.xmind。
