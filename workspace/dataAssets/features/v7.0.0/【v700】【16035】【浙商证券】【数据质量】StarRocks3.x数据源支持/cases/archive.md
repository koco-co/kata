---
suite_name: "【数据质量】支持starrocks 3.x数据源"
description: "数据质量模块适配 StarRocks 3.x 数据源集成验证用例，覆盖平台管理-数据源引入与数据质量全模块；迭代 v7.0.0"
tags:
  - "StarRocks"
  - "数据质量"
  - "浙商证券"
  - "集成测试"
  - "平台管理"
  - "概览"
  - "规则任务配置"
  - "多表比对"
  - "规则集"
  - "任务实例查询"
  - "质量报告"
  - "项目管理"
prd_version: "7.0.0"
product_line: "数据资产"
dev_version:
  - "浙商证券"
create_at: "2026-06-22"
status: "草稿"
origin: "case-draft"
case_count: 46
case_id: 16035
---

> 覆盖范围：平台管理-数据源引入（非 meta 单一链路）+ 数据质量全模块（概览 / 规则任务配置 / 多表比对规则 / 规则集 / 任务实例查询 / 质量报告 / 项目管理）。
> 规则覆盖：完整性 / 准确性 / 规范性 / 唯一性 / 自定义SQL 五大规则下每个小规则各 1 条富用例，支持多字段的统计函数额外补多字段组合，每条覆盖校验通过与不通过。
> 约定：数据源版本正文统一写「StarRocks 3.x」；每条前置自包含可重复，不设通用前置；表单填写按 `<br>` 逐字段换行。

## 平台管理

### 数据源管理

##### 【P0】验证 StarRocks 3.x 数据源经数据源中心引入并质量项目授权后数据质量可用

> 前置条件

```
1) 数据资产平台与数据质量各服务已正常部署运行。
2)「控制台-公共管理-数据源中心」已新建 StarRocks 3.x 数据源 sr_ds_zszq（JDBC，非 Meta 标识），连接测试通过。
3)「数据质量」已存在质量项目 quality_project_zszq。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 |「公共管理-数据源中心」找到 sr_ds_zszq，点击「应用授权」:<br>- 勾选应用: 数据资产<br>点击「确定」 | 应用授权成功，sr_ds_zszq 在数据资产应用下可见 |
| 2 | 进入【数据资产】-【平台管理】-【数据源管理】，点击「引入数据源」 | 弹窗列出平台中未引入资产平台的数据源，含 sr_ds_zszq |
| 3 | 勾选 sr_ds_zszq，点击「确定」引入 | 引入成功，数据源管理列表新增 sr_ds_zszq 记录 |
| 4 | 在 sr_ds_zszq 记录上点击「质量项目授权」:<br>- 选择质量项目: quality_project_zszq<br>点击「确定」 | 授权成功，提示「操作成功」 |
| 5 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，数据源下拉选择 sr_ds_zszq | 数据源下拉出现 sr_ds_zszq；选择后可正确加载其下数据库与数据表 |

## 数据质量

### 概览

##### 【P1】验证 StarRocks 3.x 数据源规则任务统计在概览正确反映

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已创建并运行以下 4 个规则任务并产生最新实例：2 个完整性单表任务（1 校验通过、1 校验未通过）、1 个唯一性单表任务（校验未通过）、1 个多表比对任务（校验通过）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【概览】 | 概览页加载成功，展示规则任务统计卡片与图表 |
| 2 | 查看「规则任务总数」「校验通过率」统计卡片 | 1) 规则任务总数显示为 4<br>2) 校验通过率显示为 50%（2 通过 / 4 总数） |
| 3 | 查看「单表/多表规则分布」图表 | 单表规则数显示 3、多表规则数显示 1，与实际任务一致 |
| 4 | 将时间维度筛选切换为「近 7 天」 | 统计数据按近 7 天范围刷新，仅统计该区间内运行的实例 |
| 5 | 将数据源筛选为 sr_ds_zszq | 概览仅统计 sr_ds_zszq 的规则任务，4 个任务数据全部归属该数据源 |

### 规则任务配置

##### 【P0】验证 StarRocks 3.x 数据源完整性校验表行数规则校验通过与不通过

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL，准备测试表与数据（可重入）：

DROP TABLE IF EXISTS zszq_trade_orders;
CREATE TABLE zszq_trade_orders (
  order_id      BIGINT        COMMENT '交易订单ID',
  security_code VARCHAR(10)   COMMENT '证券代码',
  trade_amount  DECIMAL(18,2) COMMENT '交易金额',
  trade_date    DATE          COMMENT '交易日期'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_orders VALUES
(1001,'600036',25000.00,'2025-01-01'),
(1002,'000001',18000.00,'2025-01-01'),
(1003,'601318',88000.00,'2025-01-02'),
(1004,'600519',150000.00,'2025-01-02'),
(1005,'000858',60000.00,'2025-01-02'),
(1006,'300750',36000.00,'2025-01-02');
-- 表行数 = 6
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」 | 进入 Step1 监控对象 |
| 2 | 配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_orders<br>点击「下一步」 | 数据源/数据库/数据表三级联动正常，加载到 StarRocks 表 |
| 3 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 表级<br>- 统计函数: 表行数<br>- 校验方法: 固定值<br>- 期望值: > 5<br>- 强弱规则: 弱规则<br>- 规则描述: StarRocks表行数校验<br>点击「保存」 | 规则保存成功 |
| 4 | 点击「下一步」保持默认调度，点击「完成」 | 规则任务创建成功，列表展示该任务 |
| 5 | 对该任务点击「立即运行」，查看任务实例 | 实例状态由「运行中」→「校验通过」（表行数 6 > 5） |
| 6 | 编辑该规则:<br>- 期望值: > 10<br>保存后重新「立即运行」 | 1) 实例状态由「运行中」→「校验未通过」（表行数 6 不满足 > 10）<br>2) 实例详情含「校验未通过」标识 |

##### 【P0】验证 StarRocks 3.x 数据源完整性校验字段级空值数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 含 1 条空值：

DROP TABLE IF EXISTS zszq_trade_null;
CREATE TABLE zszq_trade_null (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_null VALUES
(1001,'600036','招商银行'),
(1002,'000001','平安银行'),
(1003,'601318',NULL);
-- security_name 空值数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」 | 进入 Step1 监控对象 |
| 2 | 配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_null<br>点击「下一步」 | 三级联动正常 |
| 3 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券名称空值数校验<br>点击「保存」 | 规则保存成功 |
| 4 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（security_name 空值数 1 不满足 = 0） |
| 5 | 查看实例详情，点击「查看明细」 | 明细展示空值记录 order_id=1003 |
| 6 | 编辑规则:<br>- 期望值: <= 1<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（空值数 1 满足 <= 1） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空值数多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 与 account_no 各含空值：

DROP TABLE IF EXISTS zszq_trade_multi_null;
CREATE TABLE zszq_trade_multi_null (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_multi_null VALUES
(1001,'招商银行','ACC001'),
(1002,NULL,'ACC002'),
(1003,'中国平安',NULL);
-- security_name 空值数 = 1，account_no 空值数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_multi_null<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空值数校验<br>点击「保存」 | 1) 字段支持多选，security_name 与 account_no 均被选中<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（两字段各 1 个空值，均不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细按字段展示 security_name（order_id=1002）、account_no（order_id=1003）的空值记录 |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空值率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 5 行含 1 条空值，空值率 20%：

DROP TABLE IF EXISTS zszq_trade_null_rate;
CREATE TABLE zszq_trade_null_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_null_rate VALUES
(1001,'招商银行'),
(1002,'平安银行'),
(1003,'中国平安'),
(1004,'贵州茅台'),
(1005,NULL);
-- security_name 空值率 = 1/5 = 20%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_null_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空值率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券名称空值率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（空值率 20% 不满足 <= 10%） |
| 4 | 查看实例详情，点击「查看明细」 | 1) 空值率实际值显示 20%<br>2) 明细展示空值记录 order_id=1005 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（空值率 20% 满足 <= 20%） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空值率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 空值率 20%、account_no 空值率 40%：

DROP TABLE IF EXISTS zszq_trade_multi_null_rate;
CREATE TABLE zszq_trade_multi_null_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_multi_null_rate VALUES
(1001,'招商银行','ACC001'),
(1002,'平安银行','ACC002'),
(1003,'中国平安','ACC003'),
(1004,'贵州茅台',NULL),
(1005,NULL,NULL);
-- security_name 空值率 = 1/5 = 20%，account_no 空值率 = 2/5 = 40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_multi_null_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空值率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空值率校验<br>点击「保存」 | 1) 字段支持多选，两字段均被选中<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（security_name 20%、account_no 40% 均不满足 <= 10%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细按字段展示 security_name（order_id=1005）、account_no（order_id=1004、1005）的空值记录 |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（两字段空值率均满足 <= 40%） |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空串数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 含 1 条空字符串（区别于 NULL）：

DROP TABLE IF EXISTS zszq_trade_blank;
CREATE TABLE zszq_trade_blank (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_blank VALUES
(1001,'招商银行'),
(1002,''),
(1003,'平安银行');
-- security_name 空串数 = 1（order_id=1002 为空字符串）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_blank<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空串数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券名称空串数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（空串数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示空字符串记录 order_id=1002 |
| 5 | 编辑规则:<br>- 期望值: <= 1<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（空串数 1 满足 <= 1） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空串数多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 与 account_no 各含 1 条空字符串：

DROP TABLE IF EXISTS zszq_trade_multi_blank;
CREATE TABLE zszq_trade_multi_blank (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_multi_blank VALUES
(1001,'招商银行','ACC001'),
(1002,'','ACC002'),
(1003,'平安银行','');
-- security_name 空串数 = 1，account_no 空串数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_multi_blank<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空串数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空串数校验<br>点击「保存」 | 1) 字段支持多选，两字段均被选中<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（两字段各 1 个空串，均不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细按字段展示 security_name（order_id=1002）、account_no（order_id=1003）的空字符串记录 |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空串率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 5 行含 1 条空字符串，空串率 20%：

DROP TABLE IF EXISTS zszq_trade_blank_rate;
CREATE TABLE zszq_trade_blank_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_blank_rate VALUES
(1001,'招商银行'),
(1002,'平安银行'),
(1003,'中国平安'),
(1004,'贵州茅台'),
(1005,'');
-- security_name 空串率 = 1/5 = 20%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_blank_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空串率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券名称空串率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（空串率 20% 不满足 <= 10%） |
| 4 | 查看实例详情，点击「查看明细」 | 1) 空串率实际值显示 20%<br>2) 明细展示空字符串记录 order_id=1005 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（空串率 20% 满足 <= 20%） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空串率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 空串率 20%、account_no 空串率 40%：

DROP TABLE IF EXISTS zszq_trade_multi_blank_rate;
CREATE TABLE zszq_trade_multi_blank_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_multi_blank_rate VALUES
(1001,'招商银行','ACC001'),
(1002,'平安银行','ACC002'),
(1003,'中国平安','ACC003'),
(1004,'贵州茅台',''),
(1005,'','');
-- security_name 空串率 = 1/5 = 20%，account_no 空串率 = 2/5 = 40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_multi_blank_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空串率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空串率校验<br>点击「保存」 | 1) 字段支持多选，两字段均被选中<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（security_name 20%、account_no 40% 均不满足 <= 10%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细按字段展示 security_name（order_id=1005）、account_no（order_id=1004、1005）的空字符串记录 |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（两字段空串率均满足 <= 40%） |

##### 【P0】验证 StarRocks 3.x 数据源准确性校验字段级求和规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_amount 求和为 131000.00：

DROP TABLE IF EXISTS zszq_trade_sum;
CREATE TABLE zszq_trade_sum (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_sum VALUES
(1001,25000.00),
(1002,18000.00),
(1003,88000.00);
-- trade_amount 求和 = 131000.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_sum<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_amount<br>- 统计函数: 求和<br>- 校验方法: 固定值<br>- 期望值: = 131000<br>- 强弱规则: 强规则<br>- 规则描述: 交易金额求和校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验通过」（求和实际值 131000 满足 = 131000） |
| 4 | 编辑规则:<br>- 期望值: = 130000<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验未通过」（求和 131000 不满足 = 130000） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级求平均规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_amount 平均值为 200.00：

DROP TABLE IF EXISTS zszq_trade_avg;
CREATE TABLE zszq_trade_avg (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_avg VALUES
(1001,100.00),
(1002,200.00),
(1003,300.00);
-- trade_amount 求平均 = 200.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_avg<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_amount<br>- 统计函数: 求平均<br>- 校验方法: 固定值<br>- 期望值: = 200<br>- 强弱规则: 弱规则<br>- 规则描述: 交易金额求平均校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验通过」（求平均实际值 200 满足 = 200） |
| 4 | 编辑规则:<br>- 期望值: = 250<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验未通过」（求平均 200 不满足 = 250） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级负值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_pnl 5 行含 2 个负值，负值比 40%：

DROP TABLE IF EXISTS zszq_trade_neg;
CREATE TABLE zszq_trade_neg (
  order_id  BIGINT        COMMENT '交易订单ID',
  trade_pnl DECIMAL(18,2) COMMENT '当日盈亏'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_neg VALUES
(1001,1200.00),
(1002,-800.00),
(1003,3000.00),
(1004,-500.00),
(1005,1500.00);
-- trade_pnl 负值比 = 2/5 = 40%（order_id=1002、1004 为负值）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_neg<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_pnl<br>- 统计函数: 负值比<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 强规则<br>- 规则描述: 当日盈亏负值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（负值比 40% 不满足 <= 0%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示负值记录 order_id=1002、1004 |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（负值比 40% 满足 <= 40%） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级零值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_volume 5 行含 1 个零值，零值比 20%：

DROP TABLE IF EXISTS zszq_trade_zero;
CREATE TABLE zszq_trade_zero (
  order_id     BIGINT COMMENT '交易订单ID',
  trade_volume BIGINT COMMENT '成交量'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_zero VALUES
(1001,100),
(1002,200),
(1003,0),
(1004,300),
(1005,400);
-- trade_volume 零值比 = 1/5 = 20%（order_id=1003 为零值）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_zero<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_volume<br>- 统计函数: 零值比<br>- 校验方法: 固定值<br>- 期望值: = 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 成交量零值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（零值比 20% 不满足 = 0%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示零值记录 order_id=1003 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（零值比 20% 满足 <= 20%） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级正值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_pnl 5 行含 3 个正值，正值比 60%：

DROP TABLE IF EXISTS zszq_trade_pos;
CREATE TABLE zszq_trade_pos (
  order_id  BIGINT        COMMENT '交易订单ID',
  trade_pnl DECIMAL(18,2) COMMENT '当日盈亏'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_pos VALUES
(1001,1200.00),
(1002,-800.00),
(1003,0.00),
(1004,3000.00),
(1005,1500.00);
-- trade_pnl 正值比 = 3/5 = 60%（order_id=1001、1004、1005 为正值）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_pos<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_pnl<br>- 统计函数: 正值比<br>- 校验方法: 固定值<br>- 期望值: >= 80%<br>- 强弱规则: 弱规则<br>- 规则描述: 当日盈亏正值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（正值比 60% 不满足 >= 80%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示非正值记录 order_id=1002、1003 |
| 5 | 编辑规则:<br>- 期望值: >= 60%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（正值比 60% 满足 >= 60%） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级最大值规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_price 最大值为 150.00：

DROP TABLE IF EXISTS zszq_trade_max;
CREATE TABLE zszq_trade_max (
  order_id    BIGINT        COMMENT '交易订单ID',
  trade_price DECIMAL(18,2) COMMENT '成交价格'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_max VALUES
(1001,10.00),
(1002,50.00),
(1003,150.00),
(1004,80.00),
(1005,30.00);
-- trade_price 最大值 = 150.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_max<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_price<br>- 统计函数: 最大值<br>- 校验方法: 固定值<br>- 期望值: <= 100<br>- 强弱规则: 弱规则<br>- 规则描述: 成交价格最大值校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（最大值 150 不满足 <= 100） |
| 4 | 编辑规则:<br>- 期望值: <= 200<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（最大值 150 满足 <= 200） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验字段级最小值规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_price 最小值为 10.00：

DROP TABLE IF EXISTS zszq_trade_min;
CREATE TABLE zszq_trade_min (
  order_id    BIGINT        COMMENT '交易订单ID',
  trade_price DECIMAL(18,2) COMMENT '成交价格'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_min VALUES
(1001,10.00),
(1002,50.00),
(1003,150.00),
(1004,80.00),
(1005,30.00);
-- trade_price 最小值 = 10.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_min<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 准确性校验<br>- 生效范围: 字段级<br>- 字段: trade_price<br>- 统计函数: 最小值<br>- 校验方法: 固定值<br>- 期望值: >= 50<br>- 强弱规则: 弱规则<br>- 规则描述: 成交价格最小值校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（最小值 10 不满足 >= 50） |
| 4 | 编辑规则:<br>- 期望值: >= 5<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（最小值 10 满足 >= 5） |

##### 【P0】验证 StarRocks 3.x 数据源规范性校验字段级取值范围规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_price 含 1 条越界值 1500：

DROP TABLE IF EXISTS zszq_trade_range;
CREATE TABLE zszq_trade_range (
  order_id    BIGINT        COMMENT '交易订单ID',
  trade_price DECIMAL(18,2) COMMENT '成交价格'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_range VALUES
(1001,100.00),
(1002,500.00),
(1003,1500.00),
(1004,800.00),
(1005,300.00);
-- 取值区间 [0,1000] 下越界数 = 1（order_id=1003 的 1500 越界）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_range<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: trade_price<br>- 统计函数: 取值范围<br>- 取值下限: 0<br>- 取值上限: 1000<br>- 校验方法: 固定值<br>- 期望值: 越界数 = 0<br>- 强弱规则: 强规则<br>- 规则描述: 成交价格取值范围校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（越界数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示越界记录 order_id=1003（成交价格 1500） |
| 5 | 编辑规则:<br>- 取值上限: 2000<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（取值区间 [0,2000] 下越界数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验字段级枚举范围规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_type 含 1 条不在枚举集合的值「申购」：

DROP TABLE IF EXISTS zszq_trade_enum;
CREATE TABLE zszq_trade_enum (
  order_id   BIGINT      COMMENT '交易订单ID',
  trade_type VARCHAR(10) COMMENT '交易类型'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_enum VALUES
(1001,'买入'),
(1002,'卖出'),
(1003,'买入'),
(1004,'卖出'),
(1005,'申购');
-- 枚举集合 {买入,卖出} 下越界数 = 1（order_id=1005 的「申购」越界）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_enum<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: trade_type<br>- 统计函数: 枚举范围<br>- 枚举值: 买入,卖出<br>- 校验方法: 固定值<br>- 期望值: 越界数 = 0<br>- 强弱规则: 强规则<br>- 规则描述: 交易类型枚举范围校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（越界数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示越界记录 order_id=1005（交易类型「申购」） |
| 5 | 编辑规则:<br>- 枚举值: 买入,卖出,申购<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（全部取值在枚举集合内，越界数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验字段级枚举个数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_type 去重后枚举个数为 3：

DROP TABLE IF EXISTS zszq_trade_enum_cnt;
CREATE TABLE zszq_trade_enum_cnt (
  order_id   BIGINT      COMMENT '交易订单ID',
  trade_type VARCHAR(10) COMMENT '交易类型'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_enum_cnt VALUES
(1001,'买入'),
(1002,'卖出'),
(1003,'申购'),
(1004,'买入'),
(1005,'卖出');
-- trade_type 枚举个数 = 3（买入/卖出/申购）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_enum_cnt<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: trade_type<br>- 统计函数: 枚举个数<br>- 校验方法: 固定值<br>- 期望值: = 2<br>- 强弱规则: 弱规则<br>- 规则描述: 交易类型枚举个数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（枚举个数实际 3 不满足 = 2） |
| 4 | 编辑规则:<br>- 期望值: = 3<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（枚举个数 3 满足 = 3） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验字段级字符串最大长度规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 最大字符串长度为 9：

DROP TABLE IF EXISTS zszq_trade_strlen;
CREATE TABLE zszq_trade_strlen (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(20) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_strlen VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'600519.SH');
-- security_code 字符串最大长度 = 9（order_id=1003 的「600519.SH」长度 9）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_strlen<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 字符串最大长度<br>- 校验方法: 固定值<br>- 期望值: <= 6<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码字符串最大长度校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（字符串最大长度 9 不满足 <= 6） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示超长记录 order_id=1003（证券代码 600519.SH，长度 9） |
| 5 | 编辑规则:<br>- 期望值: <= 9<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（字符串最大长度 9 满足 <= 9） |

##### 【P2】验证 StarRocks 3.x 数据源规范性校验字段级字符串最小长度规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 最小字符串长度为 2：

DROP TABLE IF EXISTS zszq_trade_strlen_min;
CREATE TABLE zszq_trade_strlen_min (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(20) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_strlen_min VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'AB');
-- security_code 字符串最小长度 = 2（order_id=1003 的「AB」长度 2）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_strlen_min<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 字符串最小长度<br>- 校验方法: 固定值<br>- 期望值: >= 6<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码字符串最小长度校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（字符串最小长度 2 不满足 >= 6） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示过短记录 order_id=1003（证券代码 AB，长度 2） |
| 5 | 编辑规则:<br>- 期望值: >= 2<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（字符串最小长度 2 满足 >= 2） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验字段级数据精度规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_amount 含 1 条小数位为 4 的越界值：

DROP TABLE IF EXISTS zszq_trade_precision;
CREATE TABLE zszq_trade_precision (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,4) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_precision VALUES
(1001,25000.0000),
(1002,18000.5000),
(1003,88000.1234);
-- 有效小数位（去尾随零）：25000.0000=0、18000.5000=1、88000.1234=4
-- 小数位上限 2 下越界数 = 1（仅 order_id=1003 的 88000.1234 越界）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_precision<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: trade_amount<br>- 统计函数: 数据精度<br>- 小数位上限: 2<br>- 校验方法: 固定值<br>- 期望值: 越界数 = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 交易金额数据精度校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（越界数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示精度越界记录 order_id=1003（交易金额 88000.1234，小数位 4） |
| 5 | 编辑规则:<br>- 小数位上限: 4<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（小数位上限 4 下越界数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验身份证号格式规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），id_card 含 1 条不符合身份证号格式的值：

DROP TABLE IF EXISTS zszq_account_idcard;
CREATE TABLE zszq_account_idcard (
  order_id   BIGINT      COMMENT '交易订单ID',
  account_no VARCHAR(20) COMMENT '账户号',
  id_card    VARCHAR(18) COMMENT '开户身份证号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_idcard VALUES
(1001,'ACC001','330106199001011234'),
(1002,'ACC002','310101198505054321'),
(1003,'ACC003','12345');
-- id_card 不符合格式数 = 1（order_id=1003 的「12345」非 18 位身份证号）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_account_idcard<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 格式<br>- 字段: id_card<br>- 统计函数: 身份证号<br>- 校验方法: 固定值<br>- 期望值: 不符合格式数 = 0<br>- 强弱规则: 强规则<br>- 规则描述: 开户身份证号格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（不符合格式数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示格式异常记录 order_id=1003（id_card=12345） |
| 5 | 将 order_id=1003 的 id_card 更新为「330106199203034567」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（全部符合身份证号格式，不符合数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验手机号格式规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），mobile 含 1 条不符合手机号格式的值：

DROP TABLE IF EXISTS zszq_account_mobile;
CREATE TABLE zszq_account_mobile (
  order_id   BIGINT      COMMENT '交易订单ID',
  account_no VARCHAR(20) COMMENT '账户号',
  mobile     VARCHAR(20) COMMENT '预留手机号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_mobile VALUES
(1001,'ACC001','13800138000'),
(1002,'ACC002','13912345678'),
(1003,'ACC003','12345');
-- mobile 不符合格式数 = 1（order_id=1003 的「12345」非 11 位手机号）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_account_mobile<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 格式<br>- 字段: mobile<br>- 统计函数: 手机号<br>- 校验方法: 固定值<br>- 期望值: 不符合格式数 = 0<br>- 强弱规则: 强规则<br>- 规则描述: 预留手机号格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（不符合格式数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示格式异常记录 order_id=1003（mobile=12345） |
| 5 | 将 order_id=1003 的 mobile 更新为「13700137000」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（全部符合手机号格式，不符合数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验邮箱格式规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），email 含 1 条不符合邮箱格式的值：

DROP TABLE IF EXISTS zszq_account_email;
CREATE TABLE zszq_account_email (
  order_id   BIGINT      COMMENT '交易订单ID',
  account_no VARCHAR(20) COMMENT '账户号',
  email      VARCHAR(50) COMMENT '预留邮箱'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_email VALUES
(1001,'ACC001','zhangsan@zszq.com'),
(1002,'ACC002','lisi@zszq.com'),
(1003,'ACC003','invalid-email');
-- email 不符合格式数 = 1（order_id=1003 的「invalid-email」缺少 @ 与域名）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_account_email<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 格式<br>- 字段: email<br>- 统计函数: 邮箱<br>- 校验方法: 固定值<br>- 期望值: 不符合格式数 = 0<br>- 强弱规则: 强规则<br>- 规则描述: 预留邮箱格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（不符合格式数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示格式异常记录 order_id=1003（email=invalid-email） |
| 5 | 将 order_id=1003 的 email 更新为「wangwu@zszq.com」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（全部符合邮箱格式，不符合数 = 0） |

##### 【P2】验证 StarRocks 3.x 数据源规范性校验字段级空值数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 含 1 条空值：

DROP TABLE IF EXISTS zszq_norm_null;
CREATE TABLE zszq_norm_null (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_name VARCHAR(50) COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_norm_null VALUES
(1001,'招商银行'),
(1002,'平安银行'),
(1003,NULL);
-- security_name 空值数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_norm_null<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 规范性维度证券名称空值数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（空值数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示空值记录 order_id=1003 |
| 5 | 编辑规则:<br>- 期望值: <= 1<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（空值数 1 满足 <= 1） |

##### 【P2】验证 StarRocks 3.x 数据源规范性校验字段级重复数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 存在 1 组重复值：

DROP TABLE IF EXISTS zszq_norm_repeat;
CREATE TABLE zszq_norm_repeat (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_norm_repeat VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'600036');
-- security_code='600036' 出现 2 次：重复组数 = 1，涉及 order_id=1001、1003 两行（实际值随平台口径取 1 组或 2 行，期望 = 0 与口径无关）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_norm_repeat<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 规范性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 规范性维度证券代码重复数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（重复数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示重复记录 order_id=1001 与 1003（security_code 均为 600036） |
| 5 | 将 order_id=1003 的 security_code 更新为「601318」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（无重复值，重复数 = 0） |

##### 【P0】验证 StarRocks 3.x 数据源唯一性校验字段级重复数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 存在 1 组重复值：

DROP TABLE IF EXISTS zszq_trade_repeat;
CREATE TABLE zszq_trade_repeat (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_repeat VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'600036');
-- security_code='600036' 出现 2 次：重复组数 = 1，涉及 order_id=1001、1003 两行（实际值随平台口径取 1 组或 2 行，期望 = 0 与口径无关）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_repeat<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码重复数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（security_code 重复数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示重复记录 order_id=1001 与 1003（security_code 均为 600036） |
| 5 | 将 order_id=1003 的 security_code 更新为「601318」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（无重复值，重复数 = 0） |

##### 【P2】验证 StarRocks 3.x 数据源唯一性校验字段级重复数多字段联合唯一规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），(security_code, account_no) 联合存在 1 组重复：

DROP TABLE IF EXISTS zszq_trade_uniq_multi;
CREATE TABLE zszq_trade_uniq_multi (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码',
  account_no    VARCHAR(20) COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_uniq_multi VALUES
(1001,'600036','ACC001'),
(1002,'000001','ACC002'),
(1003,'600036','ACC001');
-- (security_code, account_no)=(600036, ACC001) 联合重复，重复数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_uniq_multi<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code、account_no<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码与账户号联合重复数校验<br>点击「保存」 | 1) 字段支持多选，两字段作为联合唯一键<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（联合重复数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示联合重复记录 order_id=1001 与 1003（均为 600036 / ACC001） |
| 5 | 将 order_id=1003 的 account_no 更新为「ACC003」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（联合键无重复，重复数 = 0） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验字段级重复率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 5 行中 1 个值出现 2 次，重复率 40%：

DROP TABLE IF EXISTS zszq_trade_repeat_rate;
CREATE TABLE zszq_trade_repeat_rate (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_repeat_rate VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'601318'),
(1004,'600036'),
(1005,'600519');
-- security_code='600036' 出现 2 次，重复记录 2 行，重复率 = 2/5 = 40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_repeat_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 重复率<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码重复率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（重复率 40% 不满足 <= 0%） |
| 4 | 查看实例详情，点击「查看明细」 | 1) 重复率实际值显示 40%<br>2) 明细展示重复记录 order_id=1001 与 1004（security_code 均为 600036） |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（重复率 40% 满足 <= 40%） |

##### 【P2】验证 StarRocks 3.x 数据源唯一性校验字段级重复率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），(security_code, account_no) 联合 5 行中 1 组出现 2 次，重复率 40%：

DROP TABLE IF EXISTS zszq_trade_repeat_rate_multi;
CREATE TABLE zszq_trade_repeat_rate_multi (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码',
  account_no    VARCHAR(20) COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_repeat_rate_multi VALUES
(1001,'600036','ACC001'),
(1002,'000001','ACC002'),
(1003,'601318','ACC003'),
(1004,'600036','ACC001'),
(1005,'600519','ACC005');
-- (security_code, account_no)=(600036, ACC001) 出现 2 次，重复记录 2 行，重复率 = 2/5 = 40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_repeat_rate_multi<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code、account_no<br>- 统计函数: 重复率<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码与账户号联合重复率校验<br>点击「保存」 | 1) 字段支持多选，两字段作为联合唯一键<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（联合重复率 40% 不满足 <= 0%） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示联合重复记录 order_id=1001 与 1004（均为 600036 / ACC001） |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（联合重复率 40% 满足 <= 40%） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验字段级非重复个数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 5 行去重后非重复个数为 4：

DROP TABLE IF EXISTS zszq_trade_distinct;
CREATE TABLE zszq_trade_distinct (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_distinct VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'601318'),
(1004,'600036'),
(1005,'600519');
-- security_code 非重复个数 = 4（600036/000001/601318/600519）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_distinct<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 非重复个数<br>- 校验方法: 固定值<br>- 期望值: = 5<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码非重复个数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（非重复个数实际 4 不满足 = 5） |
| 4 | 编辑规则:<br>- 期望值: = 4<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（非重复个数 4 满足 = 4） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验字段级非重复占比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 5 行非重复占比为 80%：

DROP TABLE IF EXISTS zszq_trade_distinct_rate;
CREATE TABLE zszq_trade_distinct_rate (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_distinct_rate VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'601318'),
(1004,'600036'),
(1005,'600519');
-- security_code 非重复占比 = 4/5 = 80%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_distinct_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 非重复占比<br>- 校验方法: 固定值<br>- 期望值: = 100%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码非重复占比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（非重复占比 80% 不满足 = 100%） |
| 4 | 编辑规则:<br>- 期望值: >= 80%<br>保存后重新「立即运行」 | 实例状态由「运行中」→「校验通过」（非重复占比 80% 满足 >= 80%） |

##### 【P0】验证 StarRocks 3.x 数据源自定义SQL单表规则校验通过、不通过与执行异常

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），trade_amount 含 1 条负值：

DROP TABLE IF EXISTS zszq_trade_custom;
CREATE TABLE zszq_trade_custom (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_custom VALUES
(1001,25000.00),
(1002,-800.00),
(1003,88000.00);
-- trade_amount < 0 的记录数 = 1（order_id=1002）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_custom<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 自定义SQL<br>- SQL: SELECT COUNT(1) AS neg_cnt FROM zszq_trade_custom WHERE trade_amount < 0<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 自定义SQL校验负金额记录数<br>点击「保存」 | SQL 语法校验通过，规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（neg_cnt 结果值 1 不满足 = 0） |
| 4 | 查看实例详情 | 结果值显示 1，SQL 执行成功，无异常 |
| 5 | 将 order_id=1002 的 trade_amount 更新为「800.00」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（neg_cnt = 0） |
| 6 | 执行 DROP TABLE zszq_trade_custom 后，重新「立即运行」 | 实例状态由「运行中」→「校验异常」；实例日志记录 SQL 执行失败（表不存在）错误信息 |

##### 【P0】验证 StarRocks 3.x 数据源自定义SQL多表JOIN规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），订单表含 1 条在账户维表中无匹配的孤儿记录：

DROP TABLE IF EXISTS zszq_orders_join;
CREATE TABLE zszq_orders_join (
  order_id   BIGINT      COMMENT '交易订单ID',
  account_no VARCHAR(20) COMMENT '账户号'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_join VALUES
(1001,'ACC001'),
(1002,'ACC002'),
(1003,'ACC999');

DROP TABLE IF EXISTS zszq_account_dim;
CREATE TABLE zszq_account_dim (
  account_no   VARCHAR(20) COMMENT '账户号',
  account_name VARCHAR(50) COMMENT '账户名称'
)
ENGINE=OLAP
DUPLICATE KEY(account_no)
DISTRIBUTED BY HASH(account_no) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_dim VALUES
('ACC001','张三'),
('ACC002','李四');
-- 订单表 account_no=ACC999 在账户维表中无匹配，孤儿记录数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_orders_join<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 自定义SQL<br>- SQL: SELECT COUNT(1) AS orphan_cnt FROM zszq_orders_join o LEFT JOIN zszq_account_dim d ON o.account_no = d.account_no WHERE d.account_no IS NULL<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 自定义SQL多表JOIN校验孤儿订单数<br>点击「保存」 | SQL 语法校验通过，规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（orphan_cnt 结果值 1 不满足 = 0） |
| 4 | 查看实例详情 | 结果值显示 1，JOIN 查询在 StarRocks 上执行成功 |
| 5 | 向 zszq_account_dim 插入记录 ('ACC999','王五')，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（orphan_cnt = 0） |

##### 【P2】验证 StarRocks 3.x 数据源规则任务列表查询与筛选

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已创建至少 3 个不同数据表的规则任务（含 zszq_trade_orders、zszq_trade_null、zszq_trade_repeat），其中其它数据源亦存在规则任务。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，查看规则任务列表 | 列表展示全部规则任务，含数据源、数据表、规则类型、最近实例状态等列 |
| 2 | 数据源筛选选择 sr_ds_zszq | 列表仅展示数据源为 sr_ds_zszq 的规则任务，其它数据源任务被过滤 |
| 3 | 在表名搜索框输入「zszq_trade_null」并查询 | 列表仅展示数据表为 zszq_trade_null 的规则任务 |
| 4 | 清空表名搜索，将每页条数调整后切换分页 | 分页正常，总条数与翻页结果一致 |

##### 【P2】验证 StarRocks 3.x 数据源规则任务编辑数据源置灰与期望值修改

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已存在 1 个完整性校验表行数规则任务（数据表 zszq_trade_orders，期望值 > 5，最近实例为校验通过）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，在该规则任务上点击「编辑」 | 进入规则任务编辑页，原配置回显 |
| 2 | 查看监控对象配置 | 数据源、数据库、数据表三项均置灰不可修改，值为 sr_ds_zszq / zszq 测试库 / zszq_trade_orders |
| 3 | 查看监控规则配置 | 规则类型「完整性校验」、生效范围「表级」、统计函数「表行数」、期望值「> 5」、强弱规则正确回显 |
| 4 | 将期望值修改为「> 10」，点击「保存」 | 规则任务保存成功，期望值更新为 > 10 |
| 5 | 对该任务点击「立即运行」 | 实例状态由「运行中」→「校验未通过」（表行数 6 不满足 > 10） |

##### 【P2】验证 StarRocks 3.x 数据源规则任务删除

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已存在 1 个待删除的规则任务（数据表 zszq_trade_repeat）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，在待删除规则任务上点击「删除」 | 弹出删除确认弹窗，提示删除后不可恢复 |
| 2 | 点击确认弹窗的「取消」 | 弹窗关闭，规则任务仍在列表中 |
| 3 | 再次点击「删除」并在确认弹窗点击「确定」 | 1) 提示「删除成功」<br>2) 规则任务从列表中移除 |
| 4 | 在数据源筛选 sr_ds_zszq 下刷新列表 | 已删除任务不再出现，其它任务不受影响 |

### 多表比对规则

##### 【P0】验证 StarRocks 3.x 数据源多表比对规则字段一致性校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），主表与镜像表 trade_amount 存在 1 处不一致：

DROP TABLE IF EXISTS zszq_orders_main;
CREATE TABLE zszq_orders_main (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_main VALUES
(1001,25000.00),
(1002,18000.00),
(1003,88000.00);

DROP TABLE IF EXISTS zszq_orders_mirror;
CREATE TABLE zszq_orders_mirror (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_mirror VALUES
(1001,25000.00),
(1002,18000.00),
(1003,99999.99);
-- order_id=1003 的 trade_amount 两表不一致（main 88000.00 / mirror 99999.99）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「多表比对规则」链接 | 进入「新建多表比对规则」页面 |
| 2 | 配置多表比对:<br>- 主表: sr_ds_zszq / zszq_orders_main<br>- 比对表: sr_ds_zszq / zszq_orders_mirror<br>- 关联字段: order_id<br>- 比对字段: trade_amount<br>- 强弱规则: 弱规则<br>点击「保存」 | 主表/比对表/关联字段/比对字段配置完成，保存成功 |
| 3 | 对该任务点击「立即运行」 | 实例状态由「运行中」→「校验未通过」（order_id=1003 两表 trade_amount 不一致） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示不一致记录 order_id=1003（main 88000.00 / mirror 99999.99） |
| 5 | 将 zszq_orders_mirror 中 order_id=1003 的 trade_amount 更新为 88000.00，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（两表完全一致） |

### 规则集

##### 【P0】验证 StarRocks 3.x 数据源规则集导入规则包批量校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_name 含 1 条空值、security_code 含 1 组重复：

DROP TABLE IF EXISTS zszq_trade_ruleset;
CREATE TABLE zszq_trade_ruleset (
  order_id      BIGINT      COMMENT '交易订单ID',
  security_code VARCHAR(10) COMMENT '证券代码',
  security_name VARCHAR(50) COMMENT '证券名称'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_ruleset VALUES
(1001,'600036','招商银行'),
(1002,'000001','平安银行'),
(1003,'601318',NULL),
(1004,'600036','贵州茅台');
-- security_name 空值数 = 1（order_id=1003）；security_code='600036' 重复数 = 1（order_id=1001 与 1004）

3) 待导入规则集内容：规则包「证券基础校验包」含 2 条规则——
-- 规则1：完整性校验 / 字段级 / 字段 security_name / 统计函数 空值数 / 期望值 = 0 / 强规则
-- 规则2：唯一性校验 / 字段级 / 字段 security_code / 统计函数 重复数 / 期望值 = 0 / 强规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则集】，点击「新建规则集」，配置:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_ruleset<br>- 规则集名称: 证券基础质量规则集<br>点击「下一步」 | 规则集基础信息保存成功 |
| 2 | 点击「新增规则包」:<br>- 规则包名称: 证券基础校验包<br>新增规则1:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券名称空值数校验<br>点击「保存」 | 规则包创建成功，规则1（空值数）保存成功 |
| 3 | 在证券基础校验包中新增规则2:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码重复数校验<br>点击「保存」，再保存规则集 | 规则2（重复数）保存成功；规则集详情展示证券基础校验包含 2 条规则 |
| 4 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据库: zszq 测试库<br>- 数据表: zszq_trade_ruleset<br>- 规则类型: 规则集<br>- 引用规则包: 证券基础校验包<br>点击「下一步」保持默认调度，「完成」后「立即运行」 | 规则任务创建成功，任务提交执行 |
| 5 | 查看任务实例详情 | 实例状态由「运行中」→「校验未通过」；规则包内 2 条规则分别给出结果：空值数规则未通过(实际 1)、重复数规则未通过(实际 1) |
| 6 | 点击「查看明细」 | 明细分别展示 security_name 空值记录(order_id=1003)、security_code 重复记录(order_id=1001 与 1004) |
| 7 | 按明细修正数据(将 order_id=1003 的 security_name 补为「中国平安」、order_id=1004 的 security_code 改为「300750」)，重新「立即运行」 | 实例状态由「运行中」→「校验通过」；规则包内 2 条规则均通过 |

### 任务实例查询

##### 【P0】验证 StarRocks 3.x 数据源任务实例查询与校验通过、未通过、异常三态详情

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已运行规则任务并产生 3 类实例：1 个「校验通过」实例、1 个「校验未通过」实例(产生脏数据明细)、1 个「校验异常」实例(规则引用的数据表已删除)。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【任务实例查询】 | 实例列表加载成功，展示实例名称、数据源、校验状态、运行时间等列 |
| 2 | 数据源筛选选择 sr_ds_zszq，点击查询 | 列表仅展示数据源为 sr_ds_zszq 的任务实例 |
| 3 | 打开「校验通过」实例详情 | 状态为校验通过，展示规则、统计函数、实际值与期望值 |
| 4 | 打开「校验未通过」实例详情，点击「查看明细」 | 状态为校验未通过，明细展示对应脏数据记录 |
| 5 | 打开「校验异常」实例详情 | 状态为校验异常，展示实例错误日志(SQL 执行失败/表不存在) |
| 6 | 调整每页条数并切换分页 | 分页正常，总条数与翻页结果一致 |

### 质量报告

##### 【P0】验证 StarRocks 3.x 数据源规则任务运行后质量报告自动生成与查看

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已存在 1 个含多条规则的规则任务(数据表 zszq_trade_orders)，其调度的「报告配置」已开启自动生成质量报告。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 对该规则任务点击「立即运行」，等待实例完成 | 实例运行完成，触发质量报告异步生成 |
| 2 | 进入【数据质量】-【质量报告】，刷新报告列表 | 列表新增该任务对应质量报告，状态为「已生成」 |
| 3 | 打开报告详情 | 展示综合质量评分、规则总数、校验通过/未通过规则数 |
| 4 | 查看报告中的规则级明细 | 各规则的统计函数、实际值、期望值、校验结果与任务实例一致；报告标注数据源 sr_ds_zszq、数据表 zszq_trade_orders |

##### 【P1】验证 StarRocks 3.x 数据源质量报告查询与筛选

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) sr_ds_zszq 下已生成至少 3 份质量报告(对应不同数据表与修改人)。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【质量报告】，查看报告列表 | 列表展示报告名称、数据表、修改人、生成时间等列 |
| 2 | 在报告名称搜索框输入关键字并查询 | 列表仅展示名称匹配的质量报告 |
| 3 | 切换为表名查询，输入 zszq_trade_orders | 列表仅展示数据表为 zszq_trade_orders 的质量报告 |
| 4 | 按修改人查询并切换分页 | 修改人过滤与分页结果正确 |

### 项目管理

##### 【P1】验证 StarRocks 3.x 数据源脏数据存储、查看、下载与时效清除

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 质量项目 quality_project_zszq 的脏数据存储开关已开启；sr_ds_zszq 下已运行产生脏数据的规则任务(空值数、重复数)，已产生脏数据明细。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【项目管理】，查看脏数据设置 | 展示脏数据存储开关与存储时效设置项 |
| 2 | 确认脏数据存储开关为开启，设置存储时效为 7 天，保存 | 设置保存成功 |
| 3 | 查看脏数据明细列表 | 展示各规则任务的脏数据异常明细，记录归属数据源 sr_ds_zszq |
| 4 | 对某条脏数据明细点击「下载」 | 脏数据明细文件下载成功 |
| 5 | 将存储时效调整为 0 天(立即过期)后触发清除 | 过期脏数据被清除，列表不再展示已过期明细 |
