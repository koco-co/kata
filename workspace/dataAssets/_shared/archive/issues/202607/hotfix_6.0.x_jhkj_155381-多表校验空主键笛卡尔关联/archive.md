---
suite_name: "Hotfix 用例 - 【数据资产】多表校验质量任务一直在运行中"
description: "验证 Bug #155381 修复效果"
case_count: 1
keywords: "6.0 | 数据质量/多表校验 | SparkSQL | DTHadoop 3.2.0,DTHadoop 3.2.1 | 6.0 | 多表校验 JOIN 将双方主键 NULL 纳入关联导致非等值笛卡尔式 JOIN"
tags:
  - hotfix
  - bug-155381
create_at: "2026-07-22"
status: 草稿
origin: zentao
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-155381.html"
---

## 数据资产

### 数据质量

#### 多表校验

##### 【155381】验证多表校验主键为 NULL 时仅等值 JOIN 且任务正常结束

> 前置条件

```
1. 已部署包含本次多表校验 JOIN 生成逻辑修复的待验证包，且可在数据质量模块创建、保存并执行多表校验质量任务。
2. 已在质量项目中接入数据源 ${DataSourceA}，数据源类型为 SparkSQL / DTHadoop 3.2.x；目标库或 Schema 选择 ${SchemaA}。
3. 在 ${DataSourceA} 的 ${SchemaA} 库执行以下 Spark SQL，准备左右两张多表校验数据表。SQL 体内直接使用裸表名，不带库名或 Schema 前缀：

DROP TABLE IF EXISTS hotfix_155381_left;
DROP TABLE IF EXISTS hotfix_155381_right;

CREATE TABLE hotfix_155381_left (
  id BIGINT COMMENT '多表校验逻辑主键，可为 NULL',
  payload STRING COMMENT '左表待比对字段'
)
STORED AS PARQUET;

CREATE TABLE hotfix_155381_right (
  id BIGINT COMMENT '多表校验逻辑主键，可为 NULL',
  payload STRING COMMENT '右表待比对字段'
)
STORED AS PARQUET;

INSERT INTO hotfix_155381_left VALUES
(1, 'same-1'),
(2, 'same-2'),
(NULL, 'left-null-1'),
(NULL, 'left-null-2');

INSERT INTO hotfix_155381_right VALUES
(1, 'same-1'),
(2, 'same-2'),
(NULL, 'right-null-1'),
(NULL, 'right-null-2');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】模块的规则配置入口，点击「新建监控规则」-「多表比对规则」，在「选择左侧表」页面配置:<br>- 规则名称: hotfix_155381_null_key_join<br>- 选择数据源: ${DataSourceA}<br>- 选择库或 Schema: ${SchemaA}<br>- 选择左侧表: hotfix_155381_left<br>点击「下一步」 | 进入「选择右侧表」页面，左侧表回显为 hotfix_155381_left |
| 2 | 在「选择右侧表」页面配置:<br>- 选择右侧表: hotfix_155381_right<br>点击「下一步」 | 进入「选择字段」页面，左右表字段加载完成 |
| 3 | 在「选择字段」页面配置字段映射与主键:<br>- 左侧表字段 id 映射右侧表字段 id<br>- 将左右两侧的 id 设置为逻辑主键<br>- 左侧表字段 payload 映射右侧表字段 payload<br>- 保持默认精确相等匹配，不勾选「空值与 NULL 等价」或同义的 NULL 关联条件<br>点击「下一步」 | 进入「执行配置」页面；字段映射与逻辑主键配置保存成功 |
| 4 | 在「执行配置」页面配置并保存:<br>- 调度方式: 手动触发<br>- 实例生成方式: 立即生成<br>- 告警配置: 按页面默认值保留<br>- 报告配置: 按页面默认值保留<br>保存多表校验质量任务 | 1)多表校验质量任务创建成功<br>2)任务详情或任务列表展示任务名称 hotfix_155381_null_key_join<br>3)任务可执行「立即执行」 |
| 5 | 在任务详情中点击「立即执行」，等待任务实例进入终态 | 1)任务提交成功并生成最新实例<br>2)实例不持续停留在「运行中」<br>3)任务最终进入页面定义的终态；由于左右表各有 2 条逻辑主键为 NULL 的数据，若页面将其计为未匹配数据，状态应按页面实际规则展示为「校验异常」，不得因 SQL JOIN 退化为海量数据 JOIN 而长期运行 |
| 6 | 进入【数据质量】→「任务实例查询」，按任务名称 hotfix_155381_null_key_join 查询最新实例并打开详情 | 1)列表展示该任务的最新实例<br>2)最新实例状态已从「运行中」流转到终态<br>3)实例详情可打开并展示本次多表校验结果 |
| 7 | 根据本次实例 ID 查看平台监控元数据中的生成 SQL 文本（字段名为 `sql_text`），定位左右表以 `id` 为逻辑主键的 JOIN 条件 | 1)生成 SQL 的目标 JOIN 条件为 `L.id = R.id` 等值关联<br>2)目标 JOIN 条件中不再出现 `L.id IS NULL AND R.id IS NULL`<br>3)不出现由该 NULL-NULL 分支引入的非等值笛卡尔式 JOIN 条件 |
| 8 | 回到「任务实例查询」打开该实例的结果明细，核对 NULL 主键边界数据 | 1)id=1、id=2 的同主键记录按等值 JOIN 参与比对<br>2)左右表 id 为 NULL 的记录不被互相匹配为一条关联记录，并按页面实际分类分别落入左表或右表逻辑主键为空/未找到的结果<br>3)本次实例保持已完成终态，结果明细可正常加载 |

> pending_items

- 禅道记录未给出当前验证环境的质量项目、数据源名称、库或 Schema 名称，因此正文使用 `${DataSourceA}` 与 `${SchemaA}` 占位符；执行前需替换为实际已授权对象。
- 禅道截图直接证明了【数据质量】→【任务实例查询】入口、`#/dq/taskQuery` 路由和「运行中」状态，但未提供当前环境的多表校验配置页 DOM；多表向导字段文案依据项目产品知识留存，执行时需以当前页面实际文案为准并记录差异。
- 缺陷未规定任务完成时限及 NULL 主键结果的具体状态枚举；本用例只把“不能长期停留在运行中”、生成 SQL 的 JOIN 条件和结果明细作为硬验收点，不预设固定耗时或未经证据确认的状态名称。
