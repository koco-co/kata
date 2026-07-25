---
suite_name: "Hotfix 用例 - 【数据资产】元数据同步失败"
description: "验证 Bug #149200 修复效果"
keywords: "6.3 | 元数据 | SparkThrift | | 6.3 | 代码缺陷"
tags:
  - hotfix
  - bug-149200
create_at: "2026-04-22"
status: 草稿
origin: zentao
---

## 数据资产

### 元数据管理

#### 元数据同步

##### 【149200】验证字段 colExtraAttribute 为 NULL 或 columnName 重复时元数据同步正常完成不报 NPE

> 前置条件

```sql
-- ① SparkThrift 库下建测试源表（禅道未指定数据源类型，默认 SparkThrift）
CREATE TABLE IF NOT EXISTS test_db.hotfix_149200_src (
  id         BIGINT  COMMENT '主键',
  col_a      STRING  COMMENT '普通列',
  col_null   STRING  COMMENT '用于构造空 col_extra_attribute 列',
  col_empty  STRING  COMMENT '用于构造空串 col_extra_attribute 列',
  dup_col    STRING  COMMENT '用于构造重复列名'
)
COMMENT 'hotfix 149200 测试源表'
STORED AS PARQUET;

INSERT INTO test_db.hotfix_149200_src VALUES
  (1, 'v1', 'x', 'y', 'z1'),
  (2, 'v2', NULL, '', 'z2');

-- ② UI：在【数据资产 > 数据源管理】新建 SparkThrift 数据源指向 test_db，
--     在【元数据管理】接入 test_db.hotfix_149200_src 并手动同步一次（成功后记录以下 ID）：
--     data_table.id → {{table_id}}、tenant_id → {{tenant_id}}、db_id → {{db_id}}、data_source_id → {{ds_id}}

-- ③ 向产品内部 metadata 表插入历史脏数据（模拟 colExtraAttribute 为 NULL / 空串 / 重复 columnName 场景）
INSERT INTO dt_metadata.metadata_data_table_column
  (column_name, column_type, table_id, db_id, data_source_id, table_name,
   col_extra_attribute, tenant_id, is_deleted, create_at, update_at)
VALUES
  ('col_null_attr',  'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', NULL,      {{tenant_id}}, 0, NOW(), NOW()),
  ('col_empty_attr', 'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', '',        {{tenant_id}}, 0, NOW(), NOW()),
  ('dup_col',        'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', '{"a":1}', {{tenant_id}}, 0, NOW(), NOW()),
  ('dup_col',        'varchar(64)', {{table_id}}, {{db_id}}, {{ds_id}}, 'hotfix_149200_src', '{"a":2}', {{tenant_id}}, 0, NOW(), NOW());
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产 > 元数据管理】，定位到前置条件中接入的数据源 / test_db / hotfix_149200_src | 页面正常展示，目标表可见 |
| 2 | 对 test_db 点击"同步"，触发元数据同步任务 | 同步任务提交成功，任务列表出现新任务记录 |
| 3 | 在同步任务列表等待任务执行完毕，查看最终状态 | 状态为"同步成功"，无"失败"/"异常"态 |
| 4 | 查看同步任务日志或服务端日志，搜索关键词：<br>- `NullPointerException`<br>- `IllegalStateException`<br>- `duplicate key`<br>- `JSON parse error` | 日志中无上述关键词，同步过程无异常堆栈 |
| 5 | 进入 hotfix_149200_src 表详情页，查看字段列表 | 字段完整展示；col_null_attr / col_empty_attr 属性为空但页面不崩溃；dup_col 仅保留一条（后值覆盖前值）；其余字段显示正常 |
| 6 | 执行 SQL 核对：<br>`SELECT column_name, col_extra_attribute FROM dt_metadata.metadata_data_table_column WHERE table_id = {{table_id}} AND is_deleted = 0;` | 查询结果与页面展示一致，字段数符合预期，无残留异常记录 |
