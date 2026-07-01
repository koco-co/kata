# Hotfix Archive Format

写或复核 hotfix archive 前读本文，了解可执行格式、前置条件 SQL 与历史用例布局。

## 输出定位

Hotfix 产物必须是可直接执行的回归用例 archive，不是缺陷分析报告。每个 Hotfix archive 只写 1 条用例。

不得只产出以下内容：

- 缺陷标题、根因、影响范围、修复说明的分析报告。
- 仅含「复现步骤 / 实际行为 / 预期行为」的 bug report。
- 缺少前置条件和操作步骤表、无法直接交给测试执行的总结。
- 为同一 bug 拆出多条「主路径 / 相邻回归 / 兼容场景」用例的完整回归套件。

## 文件位置

优先写入项目共享线上问题归档目录：

```text
workspace/{project}/_shared/archive/issues/{YYYYMM}/hotfix_{fix_branch_or_bug_id}-{short-title}/
```

目录内文件约定：

```text
archive.md
source_refs.json
.temp/
```

命名规则：

- 若证据中有修复分支，文件名前缀使用修复分支，例如 `hotfix_6.2.x_150419-...md`。
- 若没有修复分支，使用 `hotfix_{bug_id}-...md`。
- `{YYYYMM}` 使用 bug 打开日期、解决日期或当前日期中最贴近该 hotfix 执行批次的月份。
- 标题片段使用中文业务短标题，不得仅写 `report`、`bug`、`case`。

## 临时证据位置

原始 bug JSON、附件截图、抓取缓存只能暂存到当前 Hotfix 目录内的 `.temp/`；不得写入仓库根级 `workspace/.temp`（污染 git 状态，且绕开 Hotfix 目录结构）。最终交付时，本目录至少包含一个 `archive.md` 和一个 `source_refs.json`，临时抓取物保留在 `.temp/` 下。

## Frontmatter

必须包含以下字段：

```yaml
---
suite_name: "Hotfix 用例 - {bug_title}"
description: "验证 Bug #{bug_id} 修复效果"
case_count: 1
keywords: "{发现大版本} | {模块} | {数据源类型} | {集群} | {最低修复版本} | {问题原因}"
tags:
  - hotfix
  - bug-{bug_id}
create_at: "{YYYY-MM-DD}"
status: 草稿
origin: zentao
zentao_url: "{zentao_bug_url}"
---
```

`case_count` 恒为 `1`（一个 hotfix archive 只写 1 条用例）。`keywords` 必须保留 6 个位置，未知字段留空但保留分隔符。

- 第 1 段写发现该 bug 的产品大版本，例如 `6.3`。
- 第 2 段写产品模块，例如 `数据质量`。
- 第 3 段写证据中数据源类型；禅道、截图或修复说明明确 SparkThrift 时必须写 `SparkThrift`，不得降级为 `Spark` 或留空。
- 第 4 段写证据中集群形态；无证据时留空，但保留分隔符。
- 第 5 段必须归一化为最低修复大版本，例如 `6.3`；不得写 `v6.3.41_ltqc`、`6.3.41`、客户缩写、修复分支名或构建号。
- 第 6 段必须写证据中的具体问题原因或修复点摘要，不得写成「代码缺陷」「需求变更」「配置错误」等分类词。问题原因无法确定时放入 `pending_items`，不得猜测。

示例：

```yaml
keywords: "6.3 | 数据质量 | SparkThrift | | 6.3 | 增量sql中完整性校验json格式校验sql模板未考虑到分区"
```

## SourceRefs JSON

Hotfix md 不得包含 `## SourceRefs`、`bug.record@N`、`[bug.record@N]` 或任何 SourceRef 引用。md 只保留人类可读的用例内容。

SourceRefs 只能写入当前 Hotfix 目录内的 JSON 文件：

```text
source_refs.json
```

示例：

```json
{
  "bug_id": "150419",
  "zentao_url": "http://zenpms.dtstack.cn/zentao/bug-view-150419.html",
  "source_refs": [
    {
      "id": "bug.record@1",
      "source": "zentao",
      "summary": "禅道 Bug #150419 标题、状态、优先级、严重程度。"
    }
  ]
}
```

每个事实性判断、修复分支、根因、影响范围、错误日志、表名、环境限制、验证路径都必须能指回 sidecar JSON 中的 SourceRef。

具体页面路径、按钮名称、字段 label、控件名称和交互入口也必须能指回 SourceRef：

- 优先使用本次 bug 记录、真实 DOM 探测、源码或当前项目规则作为证据。
- 交互文案仅来自历史用例、历史报告或项目知识时，`source_refs.json` 必须写明来源；archive 中不得将其表述为本次真实页面探测结论。
- 源码与 DOM、历史用例不一致时，以本次真实 DOM 或源码证据为准；仍无法确认的页面文案标为待确认或使用更稳妥的通用步骤，不得猜测。
- bug 截图、修复说明或用户反馈给出具体任务角色、任务类型、上下游方向时，必须原样保留业务角色与方向；不得把“上游 DorisSQL 任务、下游数据同步任务”等场景替换成自造的同质 SQL 任务。若用户纠错补充了截图中的事实，写入 `source_refs.json` 的 `user.feedback@N`，并同步修正 archive。

## 用例结构

历史 Hotfix archive 使用模块层级 + 1 个用例块：

````markdown
## 数据资产

### 元数据管理

#### 元数据同步

##### 【{bug_id}】验证{修复路径}

> 前置条件

```
1. 已部署包含 {fix_branch} 修复的包，并更新相关插件或服务。
2. 已在产品页面接入测试数据源，数据库选择 {database_name}。
3. 使用当前数据库执行以下 SQL，SQL 直接使用裸表名：

CREATE TABLE IF NOT EXISTS hotfix_{bug_id}_example (
  id BIGINT COMMENT '主键'
);

INSERT INTO hotfix_{bug_id}_example VALUES (1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | ... | ... |
````

层级根据证据中的模块调整，但必须保留「用例标题 + 前置条件 + 用例步骤表」。

同一 archive 中不得出现第二个 `#####` 用例标题。这条用例先覆盖主修复路径（直接复现 bug 的最小场景），相邻风险验证只能写进同一张步骤表，如在主修复路径验证完成后追加 1 到 3 个必要检查步骤。范围未定时记入 `pending_items`，不得外延到无证据支撑的模块、数据源或版本。

## 步骤可读性

Hotfix archive 是正式回归用例，步骤写法必须与 case-draft 产物同等严格。写含表单、规则配置、菜单路径或多子项动作的步骤前，先读 `.claude/prompt/_shared/case-format-sample.md` 头注释并执行其中内容规则。

强制要求：

- 步骤=单页面：跨页面动作拆成不同步骤行。
- 配置型步骤必须把每个字段、枚举、按钮动作拆成 `-` 列表项，并在 Markdown 表格单元格内用 `<br>` 换行；不得堆成一整句。
- 多条预期必须用 `1) 2) N)` 编号并用 `<br>` 分行；每条预期都要能独立核对。
- 规则配置类步骤必须列出关键配置项，例如「字段」「统计函数」「校验方法」「期望值」「强弱规则」「规则描述」，缺证据的字段或选项不得编造。
- 操作动词和控件文案必须明确，例如写 `点击「添加规则」-「准确性校验」`，不得写成「进行相关配置」「当前操作对应正确结果」这类不可执行描述。

示例：

```markdown
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: trade_price<br>- 统计函数: 数值-取值范围<br>- 期望值: >= 0 且 <= 1000<br>- 强弱规则: 强规则<br>- 规则描述: 成交价应在 0~1000 区间内<br>点击「保存」 | 1)规则保存成功<br>2)规则详情回显字段 trade_price<br>3)统计函数、期望值、强弱规则和规则描述均与配置一致 |
```

### 数据质量字段类型支持判定

数据质量规则配置类 hotfix 不得把“字段可选择 / 规则可配置 / 规则保存成功”当作子规则支持性的最终证据。字段类型是否支持某个统计函数或子规则，以质量任务执行后的实例结果为准：

- 实例运行失败：该字段类型不支持该子规则，或运行链路存在阻断。
- 实例进入正常业务校验并展示「校验通过」或「校验不通过」：该字段类型支持该子规则。

需要验证不支持边界时，必须单独创建并执行对应规则，预期写运行失败；不得把预期失败的边界规则混进正向修复任务，导致主修复路径无法判断。

## 前置条件

前置条件必须让测试人员可直接执行。

写法要求：

- `> 前置条件` 下所有内容必须放入一个普通 fenced code block。
- 代码块不得声明语言类型，不得使用 ```sql。
- 部署包、插件、权限、页面数据源、数据库选择、SQL 数据准备都写进同一个代码块。

Bug 涉及以下任一特定数据状态时，必须提供自包含 SQL：

- 字段为 `NULL`、空串、非法值。
- 重复键、脏数据、历史兼容数据。
- 特定状态机终态，例如失败、归档、暂停。
- 回溯时间字段。
- 特定表结构、字段组合、分区字段、数据源类型。

SQL 要求：

- 必须包含 `CREATE TABLE` 或 `CREATE TABLE IF NOT EXISTS`。
- 必须包含 `INSERT INTO` / `INSERT OVERWRITE` / 等价数据构造语句；如果目标引擎无法插入该特殊形态，需给可执行的替代构造语句，如 `ALTER TABLE ... ADD PARTITION`。
- 禅道明确数据源类型时按证据指定；未明确时默认使用 SparkThrift / Spark SQL 方言，不得写 MySQL 专属语法。
- 不得写固定库名/schema 前缀（如 `test_db.hotfix_table`、`dt_metadata.metadata_table`）；数据库选择写在前置条件说明中，SQL 直接使用裸表名。
- 需要替换的运行环境变量使用 `{{...}}` 占位。

### Spark 全分区字段表

Hotfix 目标是 Spark 元数据采集，且证据要求表的所有字段均为分区字段时，不得把以下零普通字段 DDL 写成 Spark SQL 可执行前置条件：

```text
CREATE TABLE hotfix_xxx
PARTITIONED BY (
  biz_date STRING,
  region STRING
)
STORED AS PARQUET;
```

Spark SQL / SparkThrift 会在建表分析阶段返回 `ALL_PARTITION_COLUMNS_NOT_ALLOWED`（`Cannot use all columns for partition columns`）。此类 SQL 不能作为可执行步骤交给测试。

正确写法：

- 主缺陷复现表仍必须是所有字段均为分区字段，确保元数据中 `cols=[]` 且 `partitionKeys` 非空。
- 不得为让 SQL 在 Spark 中通过而添加无关普通字段；不得用普通字段 + 分区字段的相邻回归表替代主缺陷复现表。
- 前置条件中须明确区分执行入口：全分区字段主表通过 Hive CLI / HMS / 已有 Spark 数据源预置，Spark SQL 入口只做只读检查和后续采集验证。
- 写出全分区字段建表 DDL 时，必须标注为 Hive CLI / HMS 预置命令，不得标注为 Spark SQL 即时执行。
- Spark SQL 前置条件只用于准备相邻回归表，例如“普通字段 + 分区字段”和“无分区字段”表。
- 用例步骤中验证 Spark 数据源采集这张已预置的边界表。

仅纯 UI 渲染问题或完全可通过 UI 构造数据的问题才允许不用 SQL；此时必须写清 UI 前置操作。
