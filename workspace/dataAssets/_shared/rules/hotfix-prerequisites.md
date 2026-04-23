---
name: hotfix-prerequisites
applies_to: hotfix-case-gen
priority: project
---

# Hotfix 用例前置条件规范（dataAssets）

## 核心原则

Hotfix 线上用例的**前置条件**必须给出可直接复制执行的自包含 SQL，不得只用自然语言描述数据状态。

## 强制要求

当 Bug 涉及以下任一"特定数据状态"时，前置条件**必须**同时提供：

1. **建表语句**（`CREATE TABLE` / `CREATE TABLE IF NOT EXISTS`）
2. **插入语句**（`INSERT INTO ... VALUES ...`）

覆盖场景：

- 字段为 `NULL` / 空串 / 非法值
- 重复键、脏数据、历史兼容数据
- 特定状态机状态（已失败/已归档/已暂停等无法从 UI 构造的终态）
- 回溯时间字段（`gmt_create`、`gmt_modified`、触发时间等）

## SQL 示例格式

前置条件代码块必须自包含、可直接复制执行：

- **建表**：包含测试需要的所有字段、类型、主键、必要索引；外部业务源表在测试业务库下建；产品内部表（`dt_metadata.*` 等）引用线上 schema 结构
- **数据源类型**：禅道 Bug 明确指定数据源类型时按指定类型建表（MySQL/Oracle/Hive/Doris 等）；**未明确时默认使用 SparkThrift 语法建表**（Hive SQL 方言，如 `CREATE TABLE ... STORED AS PARQUET` / `STORED AS TEXTFILE`，不使用 MySQL 的 `AUTO_INCREMENT` / `ENGINE=InnoDB` / `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` 等 MySQL 专属语法）
- **插入**：至少覆盖 Bug 针对的异常数据形态（NULL / 空串 / 脏数据 / 重复键 / 边界值），字段名写全
- **占位**：需替换的变量用 `{{...}}`（如 `{{tenant_id}}`、`{{ds_id}}`、`{{table_id}}`）
- **UI 优先**：若能通过 UI 操作构造的部分先列 UI 步骤，SQL 作为兜底

示例：

````sql
-- 1) SparkThrift 库下建测试源表（数据源类型未明确，默认 SparkThrift）
CREATE TABLE IF NOT EXISTS test_db.hotfix_149200_src (
  id         BIGINT   COMMENT '主键',
  col_a      STRING   COMMENT '普通列',
  col_null   STRING   COMMENT '用于构造空属性列',
  col_empty  STRING   COMMENT '用于构造空串属性列'
)
COMMENT 'hotfix 149200 测试源表'
STORED AS PARQUET;

INSERT INTO test_db.hotfix_149200_src VALUES
  (1, 'v1', 'x', 'y'),
  (2, 'v2', NULL, '');

-- 2) 产品内部 metadata 表构造异常属性（模拟历史脏数据）
-- 先在 UI 完成一次同步，记录 table_id / tenant_id / db_id / ds_id，再执行：
INSERT INTO dt_metadata.metadata_data_table_column
  (column_name, column_type, table_id, db_id, data_source_id, table_name,
   col_extra_attribute, tenant_id, is_deleted, create_at, update_at)
VALUES
  ('col_null_attr', 'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', NULL,     {{tenant_id}}, 0, NOW(), NOW()),
  ('dup_col',       'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', '{"a":1}', {{tenant_id}}, 0, NOW(), NOW()),
  ('dup_col',       'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', '{"a":2}', {{tenant_id}}, 0, NOW(), NOW());
````

## 例外情况

- Bug 纯 UI 渲染问题（无数据依赖）：前置条件可写「无」
- Bug 完全可通过 UI 构造数据：前置条件给出 UI 操作步骤，不要求 SQL

## 校验要点

- 用例 reviewer 检查前置条件代码块：缺 `CREATE TABLE` 或缺 `INSERT` 直接打回
- 表结构不确定时，从源码 `.repos/.../*.xml`（MyBatis Mapper）、`sql/*/init/create/*.sql` 初始化脚本或实体类 `@TableName` 注解反查
