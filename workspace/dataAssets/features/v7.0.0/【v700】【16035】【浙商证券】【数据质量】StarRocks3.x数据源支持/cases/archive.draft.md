---
suite_name: "【数据质量】支持starrocks 3.x数据源"
prd_id: 16035
prd_version: "7.0.0"
product_line: "数据资产"
tags:
  - "StarRocks"
  - "数据质量"
  - "浙商证券"
  - "集成测试"
  - "平台管理"
  - "规则任务配置"
  - "多表比对"
create_at: "2026-06-22"
status: "草稿"
case_count: 6
origin: "case-draft"
---

> 代表批次草稿（6 条），供风格/文案校对。覆盖：平台引入链路、表级、字段级单字段、字段级多字段、唯一性、多表比对。
> 数据源版本正文统一写「StarRocks 3.x」；每条前置自包含可重复，不设通用前置；表单填写按 `<br>` 逐字段换行。
> blocking pending：规范性「数据精度」是否为 DQ 统计函数，源码未证实，待 live 确认（不在本批次）。

## 平台管理

### 数据源管理

##### 【P0】验证 StarRocks 3.x 数据源经数据源中心引入并质量项目授权后数据质量可用

> 前置条件

```
1) 已部署浙商证券定制化分支数据资产环境，数据质量各服务正常运行。
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
| 2 | 配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据表: zszq_trade_null<br>点击「下一步」 | 三级联动正常 |
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
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据表: zszq_trade_multi_null<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 完整性校验<br>- 生效范围: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空值数校验<br>点击「保存」 | 1) 字段支持多选，security_name 与 account_no 均被选中<br>2) 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（两字段各 1 个空值，均不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细按字段展示 security_name（order_id=1002）、account_no（order_id=1003）的空值记录 |

##### 【P0】验证 StarRocks 3.x 数据源唯一性校验字段级重复数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），security_code 存在 1 组重复值：

DROP TABLE IF EXISTS zszq_trade_repeat;
CREATE TABLE zszq_trade_repeat (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码'
)
ENGINE=OLAP
DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_repeat VALUES
(1001,'600036'),
(1002,'000001'),
(1003,'600036');
-- security_code='600036' 重复，重复数 = 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「新建监控规则」，配置监控对象:<br>- 数据源: sr_ds_zszq<br>- 数据表: zszq_trade_repeat<br>点击「下一步」 | 三级联动正常 |
| 2 | 配置监控规则:<br>- 规则类型: 唯一性校验<br>- 生效范围: 字段级<br>- 字段: security_code<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码重复数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」保持默认调度，「完成」，对任务「立即运行」 | 实例状态由「运行中」→「校验未通过」（security_code 重复数 1 不满足 = 0） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示重复记录 order_id=1001 与 1003（security_code 均为 600036） |
| 5 | 将 order_id=1003 的 security_code 更新为「601318」，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（无重复值，重复数 = 0） |

### 多表比对规则

##### 【P0】验证 StarRocks 3.x 数据源多表比对规则字段一致性校验

> 前置条件

```sql
1) StarRocks 3.x 数据源 sr_ds_zszq 已完成质量项目授权。
2) 在 sr_ds_zszq 中执行以下建表 SQL（可重入），主表与镜像表 trade_amount 存在 1 处不一致：

DROP TABLE IF EXISTS zszq_orders_main;
CREATE TABLE zszq_orders_main (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_main VALUES (1001,25000.00),(1002,18000.00),(1003,88000.00);

DROP TABLE IF EXISTS zszq_orders_mirror;
CREATE TABLE zszq_orders_mirror (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_mirror VALUES (1001,25000.00),(1002,18000.00),(1003,99999.99);
-- order_id=1003 的 trade_amount 两表不一致
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则任务配置】，点击「多表比对规则」链接 | 进入「新建多表比对规则」页面 |
| 2 | 配置多表比对:<br>- 主表: sr_ds_zszq / zszq_orders_main<br>- 比对表: sr_ds_zszq / zszq_orders_mirror<br>- 关联字段: order_id<br>- 比对字段: trade_amount<br>- 强弱规则: 弱规则<br>点击「保存」 | 主表/比对表/关联字段/比对字段配置完成，保存成功 |
| 3 | 对该任务点击「立即运行」 | 实例状态由「运行中」→「校验未通过」（order_id=1003 两表 trade_amount 不一致） |
| 4 | 查看实例详情，点击「查看明细」 | 明细展示不一致记录 order_id=1003（main 88000.00 / mirror 99999.99） |
| 5 | 将 zszq_orders_mirror 中 order_id=1003 的 trade_amount 更新为 88000.00，重新「立即运行」 | 实例状态由「运行中」→「校验通过」（两表完全一致） |
