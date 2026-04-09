# Hotfix Archive Format

仅当当前工作流进入 `draft_cases`、`review_cases` 或 `output`，且输出包含 `archive` 时读取。不得批量读取 `references/**`。

## 输出定位

Hotfix 产物必须是可直接执行的回归用例 archive，不是缺陷分析报告。每个 Hotfix archive 只写 1 条用例。

禁止只输出以下内容：

- 缺陷标题、根因、影响范围、修复说明的分析报告。
- 只有「复现步骤 / 实际行为 / 预期行为」的 bug report。
- 没有前置条件、没有操作步骤表、不能直接交给测试执行的总结。
- 为同一个 bug 拆出多条「主路径 / 相邻回归 / 兼容场景」用例的完整回归套件。

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
- 标题片段使用中文业务短标题，不得只写 `report`、`bug`、`case`。

## 临时证据位置

不得写入仓库根级 `workspace/.temp`。该目录不属于任何项目的标准产物边界，会污染 git 状态，也会让证据绕开 Hotfix 目录结构。

若处理过程中必须暂存原始 bug JSON、附件截图或抓取缓存，只能写入当前 Hotfix 目录内的 `.temp/`：

```text
workspace/{project}/_shared/archive/issues/{YYYYMM}/hotfix_{fix_branch_or_bug_id}-{short-title}/.temp/
```

最终交付时，当前 Hotfix 目录内必须至少包含一个 `archive.md` 和一个 `source_refs.json`；原始响应、附件截图等临时抓取物保留在该目录 `.temp/` 下，不得复制到根级 `workspace/.temp`。

## Frontmatter

必须包含以下字段：

```yaml
---
suite_name: "Hotfix 用例 - {bug_title}"
description: "验证 Bug #{bug_id} 修复效果"
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

`keywords` 必须保留 6 个位置，未知字段留空但保留分隔符。第 6 段必须写证据中的具体问题原因，不得写「代码缺陷」「逻辑错误」等泛化原因。问题原因无法确定时放入 `pending_items`，不要猜。

## SourceRefs JSON

Hotfix md 不得包含 `## SourceRefs`、`bug.record@N`、`[bug.record@N]` 或任何 SourceRef 引用。md 只保留人类可读用例内容。

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

每个事实性判断、修复分支、根因、影响范围、错误日志、表名、环境限制、验证路径都必须能在 sidecar JSON 中回指 SourceRef。

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

同一个 archive 中不得出现第二个 `#####` 用例标题。相邻风险验证只能写进同一张步骤表，例如在主修复路径验证完成后继续增加 1 到 3 个必要检查步骤。

## 前置条件

前置条件必须让测试人员能直接执行。

前置条件写法要求：

- `> 前置条件` 下所有内容必须放入一个普通 fenced code block。
- 代码块不得声明语言类型，不得使用 ```sql。
- 部署包、插件、权限、页面数据源、数据库选择、SQL 数据准备都写进同一个代码块。

当 Bug 涉及以下任一特定数据状态时，必须提供自包含 SQL：

- 字段为 `NULL`、空串、非法值。
- 重复键、脏数据、历史兼容数据。
- 特定状态机终态，例如失败、归档、暂停。
- 回溯时间字段。
- 特定表结构、字段组合、分区字段、数据源类型。

SQL 要求：

- 必须包含 `CREATE TABLE` 或 `CREATE TABLE IF NOT EXISTS`。
- 必须包含 `INSERT INTO` / `INSERT OVERWRITE` / 等价数据构造语句；如果目标引擎无法插入该特殊形态，需给可执行的替代构造语句，如 `ALTER TABLE ... ADD PARTITION`。
- 禅道明确数据源类型时按证据指定；未明确时默认使用 SparkThrift / Spark SQL 方言，不要写 MySQL 专属语法。
- 不得写固定库名/schema 前缀，例如不要写 `test_db.hotfix_table`、`dt_metadata.metadata_table`；数据库选择写在前置条件说明中，SQL 直接使用裸表名。
- 需要替换的运行环境变量使用 `{{...}}` 占位。

### Spark 全分区字段表

当 Hotfix 目标是 Spark 元数据采集，且证据要求表的所有字段均为分区字段时，不得把以下零普通字段 DDL 写成 Spark SQL 可执行前置条件：

```text
CREATE TABLE hotfix_xxx
PARTITIONED BY (
  biz_date STRING,
  region STRING
)
STORED AS PARQUET;
```

Spark SQL / SparkThrift 会在建表分析阶段返回 `ALL_PARTITION_COLUMNS_NOT_ALLOWED`，即 `Cannot use all columns for partition columns`。这种 SQL 不能作为可执行步骤交给测试。

正确写法：

- 主缺陷复现表仍必须是所有字段均为分区字段，确保元数据中 `cols=[]` 且 `partitionKeys` 非空。
- 不得为了让 SQL 在 Spark 中通过而添加无关普通字段；不得用普通字段 + 分区字段的相邻回归表替代主缺陷复现表。
- 在前置条件中明确区分执行入口：全分区字段主表通过 Hive CLI / HMS / 已有 Spark 数据源预置，Spark SQL 入口只做只读检查和后续采集验证。
- 如果写出全分区字段建表 DDL，必须标注为 Hive CLI / HMS 预置命令，不得标注为 Spark SQL 即时执行。
- Spark SQL 前置条件只用于准备相邻回归表，例如“普通字段 + 分区字段”和“无分区字段”表。
- 用例步骤中验证 Spark 数据源采集这张已预置的边界表。

只有纯 UI 渲染问题或完全可通过 UI 构造数据的问题，才允许不用 SQL；此时必须写清 UI 前置操作。

## 覆盖范围

这一条用例至少包含：

1. 主修复路径：直接复现 bug 的最小场景。
2. 必要相邻检查：修复判断逻辑旁边最容易被误伤的 1 到 3 个检查点，作为同一条用例的步骤或预期，不拆成独立用例。

不得外延到证据没有支撑的模块、数据源或版本。范围未定时写入 `pending_items`。
