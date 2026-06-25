---
suite_name: "【数据质量】支持starrocks 3.x数据源"
prd_id: 16035
prd_version: "7.0.0"
product_line: "数据资产"
description: "数据质量模块适配 StarRocks 3.x 数据源集成验证用例，覆盖平台管理-数据源引入与数据质量全模块；迭代 v7.0.0"
tags:
  - "StarRocks"
  - "数据质量"
  - "浙商证券"
  - "规则配置"
  - "多表比对"
  - "规则集"
create_at: "2026-06-23"
status: "草稿"
case_count: 43
origin: "case-draft"
---

## 平台管理

### 数据源管理

##### 【P0】验证 StarRocks 3.x 数据源经引入与质量项目授权后数据质量可选用

> 前置条件

```
1) 控制台-公共管理-数据源中心已新建 StarRocks 3.x 数据源 ${DataSourceA}，连接测试通过。
2) 数据质量已存在质量项目 ${ProjectA}。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在控制台「公共管理-数据源中心」找到 ${DataSourceA}，对其做「应用授权」:<br>- 勾选应用: 数据资产<br>点击「确定」 | 应用授权成功，${DataSourceA} 在数据资产应用下可见 |
| 2 | 进入【数据资产】-【平台管理】-【数据源管理】，点击「引入数据源」:<br>- 勾选: ${DataSourceA}（STAR_ROCKS_3X）<br>点击「确定」 | 引入成功，数据源管理列表新增 ${DataSourceA}，数据源状态「正常」，支持模块含「数据质量」 |
| 3 | 在 ${DataSourceA} 记录的「操作」列点击「质量项目授权」:<br>- 选择质量项目: ${ProjectA}<br>点击「确定」 | 提示「操作成功」 |
| 4 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，展开「选择数据源」下拉 | 下拉出现 ${DataSourceA}（STAR_ROCKS_3X）；选择后可正确加载其 Schema 与数据表 |

## 数据质量

### 概览

##### 【P1】验证概览页正确统计 StarRocks 3.x 数据源规则任务数据

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) ${DataSourceA} 下已创建并执行 4 个规则任务：2 个单表完整性任务（1 校验通过、1 校验异常）、1 个单表唯一性任务（校验异常）、1 个多表比对任务（校验通过）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【概览】 | 概览页加载成功，展示规则统计卡片、运维指标、告警汇总 |
| 2 | 查看「单表规则总数」「多表规则总数」卡片 | 1)单表规则总数为 3<br>2)多表规则总数为 1 |
| 3 | 查看「运维指标」区 | 1)任务总数为 4<br>2)校验通过为 2、校验异常为 2，与实际任务结果一致 |
| 4 | 将概览右上时间范围筛选为近一周 | 运维指标与告警按所选时间范围刷新，仅统计该区间内运行的实例 |

### 规则配置

##### 【P0】验证规则集导入规则包后直接执行批量校验 StarRocks 3.x 数据表

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库中执行以下建表 SQL（可重入），security_name 含 1 条空值、security_code 含 1 组重复值：

DROP TABLE IF EXISTS zszq_ruleset;
CREATE TABLE zszq_ruleset (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_ruleset VALUES
(1001,'600036','招商银行'),
(1002,'000001','平安银行'),
(1003,'600036',NULL);
-- security_name 空值数=1；security_code='600036' 重复（1 组，2 行）
3) 已准备规则包导入文件「证券基础校验包.xlsx」，表头逐字为「* 规则名称、规则描述、* 表名、表中文名、字段名、字段中文名、* 校验SQL(请输入不符合规则要求的明细数据查询SQL)」，文件内容如下：
- 第 1 行：规则名称=完整性校验；规则描述=证券名称不能为空；表名=zszq_ruleset；表中文名=证券规则集校验表；字段名=security_name；字段中文名=证券名称；校验SQL=SELECT order_id, security_code, security_name FROM zszq_ruleset WHERE security_name IS NULL
- 第 2 行：规则名称=唯一性校验；规则描述=证券代码不可重复；表名=zszq_ruleset；表中文名=证券规则集校验表；字段名=security_code；字段中文名=证券代码；校验SQL=SELECT order_id, security_code, security_name FROM zszq_ruleset WHERE security_code IN (SELECT security_code FROM zszq_ruleset GROUP BY security_code HAVING COUNT(1) > 1)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建规则集」，填写「基础信息」:<br>- 规则集名称: 证券基础校验集<br>- 校验数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 规则集描述: 证券基础完整性与唯一性校验<br>点击「下一步」 | 进入「规则内容」步骤 |
| 2 | 在「规则内容」点击「导入规则」，上传规则包导入文件「证券基础校验包.xlsx」，导入文件填写项为:<br>- * 规则名称<br>- 规则描述<br>- * 表名<br>- 表中文名<br>- 字段名<br>- 字段中文名<br>- * 校验SQL(请输入不符合规则要求的明细数据查询SQL)<br>确认生成规则包「证券基础校验包」后点击「下一步」 | 1)文件解析成功，规则包「证券基础校验包」含 2 条规则<br>2)完整性校验、唯一性校验的表名、字段名、字段中文名、校验SQL 与导入文件内容一致 |
| 3 | 在「调度配置」将「调度周期」切换为「手动触发」，点击「保存」 | 规则集「证券基础校验集」保存成功，规则配置页左上「规则集」区展示该规则集卡片，卡片显示 1 表、1 规则包 |
| 4 | 在「规则集」区找到「证券基础校验集」卡片，点击右上角「更多」菜单中的「立即执行」；进入【任务查询】查看最新实例「查看明细」 | 1)实例状态为「校验异常」<br>2)完整性校验的导入 SQL 返回 security_name 为空的 order_id=1003 明细<br>3)唯一性校验的导入 SQL 返回 security_code=600036 的重复明细 |

##### 【P0】验证 StarRocks 3.x 数据源完整性校验表级表行数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入）：

DROP TABLE IF EXISTS zszq_trade_orders;
CREATE TABLE zszq_trade_orders (
  order_id      BIGINT        COMMENT '交易订单ID',
  security_code VARCHAR(10)   COMMENT '证券代码',
  trade_amount  DECIMAL(18,2) COMMENT '交易金额',
  trade_date    DATE          COMMENT '交易日期'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_orders VALUES
(1001,'600036',25000.00,'2025-01-01'),
(1002,'000001',18000.00,'2025-01-01'),
(1003,'601318',88000.00,'2025-01-02'),
(1004,'600519',150000.00,'2025-01-02'),
(1005,'000858',60000.00,'2025-01-02'),
(1006,'300750',36000.00,'2025-01-02');
-- 表行数=6
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: StarRocks表行数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_orders<br>点击「下一步」 | 数据源/Schema/数据表三级联动正常，加载到 StarRocks 表 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 表级<br>- 统计函数: 表行数<br>- 校验方法: 固定值<br>- 期望值: > 5<br>- 强弱规则: 弱规则<br>- 规则描述: 表行数大于5校验<br>点击「保存」 | 1)切换规则类型为表级后统计函数仅「表行数」<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，点击「完成」 | 规则任务创建成功，规则配置列表展示该任务 |
| 4 | 在列表点击 zszq_trade_orders 打开规则详情，点击「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（表行数 6 > 5） |
| 5 | 返回规则详情编辑规则:<br>- 期望值: > 10<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（表行数 6 不满足 > 10） |

##### 【P0】验证 StarRocks 3.x 数据源完整性校验字段级空值数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_name 含 1 条空值：

DROP TABLE IF EXISTS zszq_trade_null;
CREATE TABLE zszq_trade_null (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_null VALUES
(1001,'600036','招商银行'),
(1002,'000001','平安银行'),
(1003,'601318',NULL);
-- security_name 空值数=1（order_id=1003）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券名称空值数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_null<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券名称空值数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，在列表点表名打开详情，「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（security_name 空值数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示空值记录 order_id=1003 |
| 5 | 编辑规则:<br>- 期望值: <= 1<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（空值数 1 满足 <= 1） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空值数多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），仅 order_id=1004 一行 security_name 与 account_no 同时为 NULL：

DROP TABLE IF EXISTS zszq_trade_multi_null;
CREATE TABLE zszq_trade_multi_null (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_multi_null VALUES
(1001,'招商银行','ACC001'),
(1002,NULL,'ACC002'),
(1003,'中国平安',NULL),
(1004,NULL,NULL);
-- 仅 order_id=1004 security_name 与 account_no 同时为 NULL，空值数=1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段空值数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_multi_null<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空值数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空值数校验<br>点击「保存」 | 1)字段支持多选，security_name 与 account_no 均被选中<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（仅 order_id=1004 两字段同时为 NULL，空值数=1，不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示 order_id=1004 这条 security_name、account_no 同时为 NULL 的记录 |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空值率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中 security_name 含 1 条空值（空值率 20%）：

DROP TABLE IF EXISTS zszq_trade_null_rate;
CREATE TABLE zszq_trade_null_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_null_rate VALUES
(1001,'招商银行'),(1002,'平安银行'),(1003,'中国平安'),(1004,'贵州茅台'),(1005,NULL);
-- security_name 空值率=1/5=20%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券名称空值率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_null_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name<br>- 统计函数: 空值率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券名称空值率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（空值率 20% 不满足 <= 10%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示空值记录 order_id=1005 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（空值率 20% 满足 <= 20%） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空值率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中仅 order_id=1004 一行 security_name 与 account_no 同时为 NULL：

DROP TABLE IF EXISTS zszq_multi_null_rate;
CREATE TABLE zszq_multi_null_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_multi_null_rate VALUES
(1001,'招商银行','ACC001'),(1002,'平安银行',NULL),(1003,NULL,'ACC003'),(1004,NULL,NULL),(1005,'贵州茅台','ACC005');
-- 仅 order_id=1004 security_name 与 account_no 同时为 NULL，空值率=1/5=20%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段空值率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_multi_null_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空值率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空值率校验<br>点击「保存」 | 1)字段多选成功<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（仅 order_id=1004 两字段同时为 NULL，空值率=1/5=20%，不满足 <= 10%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示 order_id=1004 这条 security_name、account_no 同时为 NULL 的记录 |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空串数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_name 含 1 条空字符串：

DROP TABLE IF EXISTS zszq_trade_blank;
CREATE TABLE zszq_trade_blank (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_blank VALUES
(1001,'招商银行'),(1002,''),(1003,'平安银行');
-- security_name 空串数=1（order_id=1002 为空字符串，非 NULL）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券名称空串数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_blank<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name<br>- 统计函数: 空串数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券名称空串数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（空串数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示空串记录 order_id=1002 |
| 5 | 编辑规则:<br>- 期望值: <= 1<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（空串数 1 满足 <= 1） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空串数多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），仅 order_id=1004 一行 security_name 与 account_no 同时为空字符串：

DROP TABLE IF EXISTS zszq_multi_blank;
CREATE TABLE zszq_multi_blank (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_multi_blank VALUES
(1001,'招商银行','ACC001'),(1002,'','ACC002'),(1003,'中国平安',''),(1004,'','');
-- 仅 order_id=1004 security_name 与 account_no 同时为空字符串，空串数=1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段空串数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_multi_blank<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空串数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空串数校验<br>点击「保存」 | 1)字段多选成功<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（仅 order_id=1004 两字段同时为空串，空串数=1，不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示 order_id=1004 这条 security_name、account_no 同时为空串的记录 |

##### 【P1】验证 StarRocks 3.x 数据源完整性校验字段级空串率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中 security_name 含 1 条空字符串（空串率 20%）：

DROP TABLE IF EXISTS zszq_blank_rate;
CREATE TABLE zszq_blank_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_blank_rate VALUES
(1001,'招商银行'),(1002,'平安银行'),(1003,'中国平安'),(1004,'贵州茅台'),(1005,'');
-- security_name 空串率=1/5=20%（order_id=1005 为空字符串）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券名称空串率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_blank_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name<br>- 统计函数: 空串率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券名称空串率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（空串率 20% 不满足 <= 10%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示空串记录 order_id=1005 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（空串率 20% 满足 <= 20%） |

##### 【P2】验证 StarRocks 3.x 数据源完整性校验字段级空串率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中仅 order_id=1004 一行 security_name 与 account_no 同时为空字符串：

DROP TABLE IF EXISTS zszq_multi_blank_rate;
CREATE TABLE zszq_multi_blank_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_multi_blank_rate VALUES
(1001,'招商银行','ACC001'),(1002,'平安银行',''),(1003,'','ACC003'),(1004,'',''),(1005,'贵州茅台','ACC005');
-- 仅 order_id=1004 security_name 与 account_no 同时为空字符串，空串率=1/5=20%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段空串率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_multi_blank_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「完整性校验」，配置规则:<br>- 规则类型: 字段级<br>- 字段: security_name、account_no<br>- 统计函数: 空串率<br>- 校验方法: 固定值<br>- 期望值: <= 10%<br>- 强弱规则: 弱规则<br>- 规则描述: 多字段空串率校验<br>点击「保存」 | 1)字段多选成功<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（仅 order_id=1004 两字段同时为空串，空串率=1/5=20%，不满足 <= 10%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示 order_id=1004 这条 security_name、account_no 同时为空串的记录 |

##### 【P0】验证 StarRocks 3.x 数据源准确性校验求和规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_amount 合计为 131000.00：

DROP TABLE IF EXISTS zszq_trade_sum;
CREATE TABLE zszq_trade_sum (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_sum VALUES
(1001,25000.00),(1002,18000.00),(1003,88000.00);
-- sum(trade_amount)=131000.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易金额求和校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_sum<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「准确性校验」，配置规则:<br>- 字段: trade_amount<br>- 统计函数: 求和<br>- 校验方法: 固定值<br>- 期望值: = 131000<br>- 强弱规则: 强规则<br>- 规则描述: 交易金额求和校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（求和实际值 131000 满足 = 131000） |
| 4 | 编辑规则:<br>- 期望值: = 130000<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（求和 131000 不满足 = 130000） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验求平均规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_amount 平均值为 200.00：

DROP TABLE IF EXISTS zszq_trade_avg;
CREATE TABLE zszq_trade_avg (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_avg VALUES
(1001,100.00),(1002,200.00),(1003,300.00);
-- avg(trade_amount)=200.00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易金额求平均校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_avg<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「准确性校验」，配置规则:<br>- 字段: trade_amount<br>- 统计函数: 求平均<br>- 校验方法: 固定值<br>- 期望值: = 200<br>- 强弱规则: 弱规则<br>- 规则描述: 交易金额求平均校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（求平均实际值 200 满足 = 200） |
| 4 | 编辑规则:<br>- 期望值: = 250<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（求平均 200 不满足 = 250） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验负值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行 trade_pnl 中 2 行为负值（负值比 40%）：

DROP TABLE IF EXISTS zszq_trade_neg;
CREATE TABLE zszq_trade_neg (
  order_id  BIGINT        COMMENT '交易订单ID',
  trade_pnl DECIMAL(18,2) COMMENT '交易盈亏'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_neg VALUES
(1001,1200.00),(1002,-300.00),(1003,800.00),(1004,-150.00),(1005,500.00);
-- 负值比=2/5=40%（order_id=1002、1004）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易盈亏负值比校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_neg<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「准确性校验」，配置规则:<br>- 字段: trade_pnl<br>- 统计函数: 负值比<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 强规则<br>- 规则描述: 交易盈亏负值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（负值比 40% 不满足 <= 0%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示负值记录 order_id=1002、1004 |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（负值比 40% 满足 <= 40%） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验零值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行 trade_volume 中 1 行为零（零值比 20%）：

DROP TABLE IF EXISTS zszq_trade_zero;
CREATE TABLE zszq_trade_zero (
  order_id     BIGINT COMMENT '交易订单ID',
  trade_volume BIGINT COMMENT '成交量'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_zero VALUES
(1001,100),(1002,200),(1003,0),(1004,300),(1005,400);
-- 零值比=1/5=20%（order_id=1003）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 成交量零值比校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_zero<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「准确性校验」，配置规则:<br>- 字段: trade_volume<br>- 统计函数: 零值比<br>- 校验方法: 固定值<br>- 期望值: = 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 成交量零值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（零值比 20% 不满足 = 0%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示零值记录 order_id=1003 |
| 5 | 编辑规则:<br>- 期望值: <= 20%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（零值比 20% 满足 <= 20%） |

##### 【P1】验证 StarRocks 3.x 数据源准确性校验正值比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行 trade_pnl 中 3 行为正值（正值比 60%）：

DROP TABLE IF EXISTS zszq_trade_pos;
CREATE TABLE zszq_trade_pos (
  order_id  BIGINT        COMMENT '交易订单ID',
  trade_pnl DECIMAL(18,2) COMMENT '交易盈亏'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_pos VALUES
(1001,1200.00),(1002,-300.00),(1003,800.00),(1004,-150.00),(1005,500.00);
-- 正值比=3/5=60%（order_id=1001、1003、1005）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易盈亏正值比校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_pos<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「准确性校验」，配置规则:<br>- 字段: trade_pnl<br>- 统计函数: 正值比<br>- 校验方法: 固定值<br>- 期望值: >= 80%<br>- 强弱规则: 弱规则<br>- 规则描述: 交易盈亏正值比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（正值比 60% 不满足 >= 80%） |
| 4 | 编辑规则:<br>- 期望值: >= 60%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（正值比 60% 满足 >= 60%） |

##### 【P0】验证 StarRocks 3.x 数据源规范性校验数值-取值范围规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_price 含 1 行超出 [0,1000] 区间：

DROP TABLE IF EXISTS zszq_price_range;
CREATE TABLE zszq_price_range (
  order_id    BIGINT        COMMENT '交易订单ID',
  trade_price DECIMAL(18,2) COMMENT '成交价'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_price_range VALUES
(1001,120.00),(1002,300.50),(1003,1500.00),(1004,800.00);
-- 期望区间 [0,1000]：order_id=1003（1500）越界，越界行数=1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 成交价取值范围校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_price_range<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: trade_price<br>- 统计函数: 数值-取值范围<br>- 取值区间: [0, 1000]<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 成交价应在 0~1000 区间内<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（越界行数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示越界记录 order_id=1003（trade_price=1500） |
| 5 | 编辑规则:<br>- 取值区间: [0, 2000]<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（区间放宽后无越界，越界行数 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验数值-枚举范围规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_type 含 1 行不在枚举集合内：

DROP TABLE IF EXISTS zszq_trade_enum;
CREATE TABLE zszq_trade_enum (
  order_id   BIGINT   COMMENT '交易订单ID',
  trade_type TINYINT  COMMENT '交易类型 1=买入 2=卖出 3=申购'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_enum VALUES
(1001,1),(1002,2),(1003,3),(1004,1);
-- 期望枚举集合 {1,2}：order_id=1003（trade_type=3）不在集合，违规行数=1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易类型枚举范围校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_enum<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: trade_type<br>- 统计函数: 数值-枚举范围<br>- 枚举集合: 1, 2<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 交易类型应在枚举 1,2 内<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（违规行数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示违规记录 order_id=1003（trade_type=3） |
| 5 | 编辑规则:<br>- 枚举集合: 1, 2, 3<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（补充枚举 3 后无违规，违规行数 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验数值-枚举个数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_type 去重后枚举个数为 3：

DROP TABLE IF EXISTS zszq_enum_cnt;
CREATE TABLE zszq_enum_cnt (
  order_id   BIGINT   COMMENT '交易订单ID',
  trade_type TINYINT  COMMENT '交易类型 1=买入 2=卖出 3=申购'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_enum_cnt VALUES
(1001,1),(1002,2),(1003,3),(1004,1);
-- 枚举个数=3（1/2/3）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 交易类型枚举个数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_enum_cnt<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: trade_type<br>- 统计函数: 数值-枚举个数<br>- 校验方法: 固定值<br>- 期望值: = 2<br>- 强弱规则: 弱规则<br>- 规则描述: 交易类型枚举个数应为 2<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（枚举个数 3 不满足 = 2） |
| 4 | 编辑规则:<br>- 期望值: = 3<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（枚举个数 3 满足 = 3） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验字符串-最大长度规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_code 最大长度为 8：

DROP TABLE IF EXISTS zszq_str_maxlen;
CREATE TABLE zszq_str_maxlen (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(20)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_str_maxlen VALUES
(1001,'600036'),(1002,'00000123'),(1003,'601318');
-- security_code 最大长度=8（order_id=1002）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码最大长度校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_str_maxlen<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 字符串-最大长度<br>- 校验方法: 固定值<br>- 期望值: <= 6<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码最大长度不超过 6<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（最大长度 8 不满足 <= 6） |
| 4 | 编辑规则:<br>- 期望值: <= 8<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（最大长度 8 满足 <= 8） |

##### 【P2】验证 StarRocks 3.x 数据源规范性校验字符串-最小长度规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_code 最小长度为 4：

DROP TABLE IF EXISTS zszq_str_minlen;
CREATE TABLE zszq_str_minlen (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(20)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_str_minlen VALUES
(1001,'600036'),(1002,'0001'),(1003,'601318');
-- security_code 最小长度=4（order_id=1002）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码最小长度校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_str_minlen<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 字符串-最小长度<br>- 校验方法: 固定值<br>- 期望值: >= 6<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码最小长度不少于 6<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（最小长度 4 不满足 >= 6） |
| 4 | 编辑规则:<br>- 期望值: >= 4<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（最小长度 4 满足 >= 4） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验格式-身份证号规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），id_card 含 1 条非法身份证号：

DROP TABLE IF EXISTS zszq_account_idcard;
CREATE TABLE zszq_account_idcard (
  account_no VARCHAR(20)  COMMENT '账户号',
  id_card    VARCHAR(18)  COMMENT '身份证号'
)
ENGINE=OLAP DUPLICATE KEY(account_no)
DISTRIBUTED BY HASH(account_no) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_idcard VALUES
('ACC001','310115199001012345'),('ACC002','11010119900307889X'),('ACC003','12345');
-- 不符合身份证格式行数=1（ACC003 的 12345）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 身份证号格式校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_account_idcard<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: id_card<br>- 统计函数: 格式-身份证号<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 身份证号格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（不符合格式行数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示非法身份证记录 account_no=ACC003 |
| 5 | 将 ACC003 的 id_card 更新为合法身份证号 310115199203045678，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（无非法身份证，不符合格式行数 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验格式-手机号规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），mobile 含 1 条非法手机号：

DROP TABLE IF EXISTS zszq_account_mobile;
CREATE TABLE zszq_account_mobile (
  account_no VARCHAR(20)  COMMENT '账户号',
  mobile     VARCHAR(20)  COMMENT '手机号'
)
ENGINE=OLAP DUPLICATE KEY(account_no)
DISTRIBUTED BY HASH(account_no) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_mobile VALUES
('ACC001','13800138000'),('ACC002','13912345678'),('ACC003','123456');
-- 不符合手机号格式行数=1（ACC003 的 123456）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 手机号格式校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_account_mobile<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: mobile<br>- 统计函数: 格式-手机号<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 手机号格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（不符合格式行数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示非法手机号记录 account_no=ACC003 |
| 5 | 将 ACC003 的 mobile 更新为合法手机号 13700137000，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（无非法手机号，不符合格式行数 0） |

##### 【P1】验证 StarRocks 3.x 数据源规范性校验格式-邮箱规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），email 含 1 条非法邮箱：

DROP TABLE IF EXISTS zszq_account_email;
CREATE TABLE zszq_account_email (
  account_no VARCHAR(20)  COMMENT '账户号',
  email      VARCHAR(50)  COMMENT '邮箱'
)
ENGINE=OLAP DUPLICATE KEY(account_no)
DISTRIBUTED BY HASH(account_no) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_email VALUES
('ACC001','zhang@zszq.com'),('ACC002','li@zszq.com'),('ACC003','invalid-email');
-- 不符合邮箱格式行数=1（ACC003 的 invalid-email）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 邮箱格式校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_account_email<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「规范性校验」，配置规则:<br>- 字段: email<br>- 统计函数: 格式-邮箱<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 邮箱格式校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（不符合格式行数 1 不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示非法邮箱记录 account_no=ACC003 |
| 5 | 将 ACC003 的 email 更新为合法邮箱 wang@zszq.com，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（无非法邮箱，不符合格式行数 0） |

##### 【P0】验证 StarRocks 3.x 数据源唯一性校验重复数单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_code 存在 1 组重复值：

DROP TABLE IF EXISTS zszq_trade_repeat;
CREATE TABLE zszq_trade_repeat (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_repeat VALUES
(1001,'600036'),(1002,'000001'),(1003,'600036');
-- security_code='600036' 出现 2 次：重复组数=1，涉及 order_id=1001、1003 两行（期望 = 0 表示无任何重复，与口径无关）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码重复数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_repeat<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码重复数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（security_code 存在重复值 600036，不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示重复记录 order_id=1001 与 1003（security_code 均为 600036） |
| 5 | 将 order_id=1003 的 security_code 更新为 601318，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（无重复值，重复数 0） |

##### 【P2】验证 StarRocks 3.x 数据源唯一性校验重复数多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），(security_code, account_no) 联合存在 1 组重复：

DROP TABLE IF EXISTS zszq_repeat_multi;
CREATE TABLE zszq_repeat_multi (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_repeat_multi VALUES
(1001,'600036','ACC001'),(1002,'000001','ACC002'),(1003,'600036','ACC001');
-- (security_code,account_no)=(600036,ACC001) 联合重复：重复组数=1，涉及 order_id=1001、1003
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段联合重复数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_repeat_multi<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code、account_no<br>- 统计函数: 重复数<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 证券代码与账户号联合重复数校验<br>点击「保存」 | 1)字段多选成功<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（联合字段存在重复，不满足 = 0） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示联合重复记录 order_id=1001 与 1003（600036 / ACC001） |
| 5 | 将 order_id=1003 的 account_no 更新为 ACC003，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（联合无重复，重复数 0） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验重复率单字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中 2 行 security_code 重复（重复率 40%）：

DROP TABLE IF EXISTS zszq_repeat_rate;
CREATE TABLE zszq_repeat_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_repeat_rate VALUES
(1001,'600036'),(1002,'000001'),(1003,'601318'),(1004,'600519'),(1005,'600036');
-- security_code='600036' 出现 2 次，重复记录 2 行，重复率=2/5=40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码重复率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_repeat_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 重复率<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码重复率校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（重复率 40% 不满足 <= 0%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示重复记录 order_id=1001 与 1005（security_code 均为 600036） |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（重复率 40% 满足 <= 40%） |

##### 【P2】验证 StarRocks 3.x 数据源唯一性校验重复率多字段规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中 (security_code, account_no) 联合 2 行重复（重复率 40%）：

DROP TABLE IF EXISTS zszq_repeat_rate_multi;
CREATE TABLE zszq_repeat_rate_multi (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码',
  account_no    VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_repeat_rate_multi VALUES
(1001,'600036','ACC001'),(1002,'000001','ACC002'),(1003,'601318','ACC003'),(1004,'600519','ACC004'),(1005,'600036','ACC001');
-- (600036,ACC001) 联合重复 2 行，重复率=2/5=40%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 多字段联合重复率校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_repeat_rate_multi<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code、account_no<br>- 统计函数: 重复率<br>- 校验方法: 固定值<br>- 期望值: <= 0%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码与账户号联合重复率校验<br>点击「保存」 | 1)字段多选成功<br>2)规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（联合重复率 40% 不满足 <= 0%） |
| 4 | 对「校验异常」实例「查看明细」 | 明细展示联合重复记录 order_id=1001 与 1005（600036 / ACC001） |
| 5 | 编辑规则:<br>- 期望值: <= 40%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（联合重复率 40% 满足 <= 40%） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验非重复个数规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），security_code 去重后非重复个数为 4：

DROP TABLE IF EXISTS zszq_distinct_cnt;
CREATE TABLE zszq_distinct_cnt (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_distinct_cnt VALUES
(1001,'600036'),(1002,'000001'),(1003,'601318'),(1004,'600519'),(1005,'600036');
-- 非重复个数=4（600036/000001/601318/600519）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码非重复个数校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_distinct_cnt<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 非重复个数<br>- 校验方法: 固定值<br>- 期望值: = 5<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码非重复个数校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（非重复个数 4 不满足 = 5） |
| 4 | 编辑规则:<br>- 期望值: = 4<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（非重复个数 4 满足 = 4） |

##### 【P1】验证 StarRocks 3.x 数据源唯一性校验非重复占比规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），5 行中非重复个数 4（非重复占比 80%）：

DROP TABLE IF EXISTS zszq_distinct_rate;
CREATE TABLE zszq_distinct_rate (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(10)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_distinct_rate VALUES
(1001,'600036'),(1002,'000001'),(1003,'601318'),(1004,'600519'),(1005,'600036');
-- 非重复占比=4/5=80%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 证券代码非重复占比校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_distinct_rate<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「唯一性校验」，配置规则:<br>- 字段: security_code<br>- 统计函数: 非重复占比<br>- 校验方法: 固定值<br>- 期望值: = 100%<br>- 强弱规则: 弱规则<br>- 规则描述: 证券代码非重复占比校验<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（非重复占比 80% 不满足 = 100%） |
| 4 | 编辑规则:<br>- 期望值: >= 80%<br>保存后再次「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（非重复占比 80% 满足 >= 80%） |

##### 【P0】验证 StarRocks 3.x 数据源自定义SQL单表规则校验与表删除异常

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），trade_amount 含 1 行负值：

DROP TABLE IF EXISTS zszq_trade_custom;
CREATE TABLE zszq_trade_custom (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_trade_custom VALUES
(1001,25000.00),(1002,-100.00),(1003,88000.00);
-- 负值行数=1（order_id=1002）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 自定义SQL负值校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_trade_custom<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「自定义SQL」，配置规则:<br>- SQL: SELECT order_id, trade_amount FROM zszq_trade_custom WHERE trade_amount < 0<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 自定义SQL查询交易金额负值明细<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（SQL 返回负值明细 1 行，不满足 = 0） |
| 4 | 将 order_id=1002 的 trade_amount 更新为 100.00，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（SQL 返回 0 行，满足 = 0） |
| 5 | 执行 DROP TABLE zszq_trade_custom 后再次「立即执行」，在【任务查询】查看最新实例详情 | 1)实例状态为「校验异常」<br>2)实例日志含表不存在/SQL 执行失败错误信息 |

##### 【P0】验证 StarRocks 3.x 数据源自定义SQL子查询跨表缺失规则校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），订单表含 1 条账户在维表中不存在的孤儿记录：

DROP TABLE IF EXISTS zszq_order_join;
CREATE TABLE zszq_order_join (
  order_id   BIGINT       COMMENT '交易订单ID',
  account_no VARCHAR(20)  COMMENT '账户号'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_order_join VALUES (1001,'ACC001'),(1002,'ACC002'),(1003,'ACC999');

DROP TABLE IF EXISTS zszq_account_dim;
CREATE TABLE zszq_account_dim (
  account_no   VARCHAR(20)  COMMENT '账户号',
  account_name VARCHAR(50)  COMMENT '账户名'
)
ENGINE=OLAP DUPLICATE KEY(account_no)
DISTRIBUTED BY HASH(account_no) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_account_dim VALUES ('ACC001','张三'),('ACC002','李四');
-- order_id=1003 的 ACC999 在维表不存在，孤儿记录=1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「单表校验规则」，配置监控对象:<br>- 规则名称: 自定义SQL子查询跨表缺失校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择数据表: zszq_order_join<br>点击「下一步」 | 三级联动正常 |
| 2 | 点击「添加规则」-「自定义SQL」，配置规则:<br>- SQL: SELECT order_id, account_no FROM zszq_order_join WHERE account_no NOT IN (SELECT account_no FROM zszq_account_dim)<br>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 自定义SQL查询维表中缺失的订单账户明细<br>点击「保存」 | 规则保存成功 |
| 3 | 点击「下一步」将「调度周期」切换为「手动触发」，「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例 | 实例状态由「运行中」→「校验异常」（SQL 返回孤儿明细 1 行，不满足 = 0） |
| 4 | 向 zszq_account_dim 插入 ('ACC999','王五')，重新「立即执行」，在【任务查询】查看最新实例 | 实例状态由「运行中」→「校验通过」（SQL 返回 0 行，满足 = 0） |

##### 【P0】验证 StarRocks 3.x 数据源多表比对规则字段一致性校验

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），左右两表 trade_amount 存在 1 处不一致：

DROP TABLE IF EXISTS zszq_orders_left;
CREATE TABLE zszq_orders_left (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_left VALUES (1001,25000.00),(1002,18000.00),(1003,88000.00);

DROP TABLE IF EXISTS zszq_orders_right;
CREATE TABLE zszq_orders_right (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_orders_right VALUES (1001,25000.00),(1002,18000.00),(1003,99999.99);
-- order_id=1003 的 trade_amount 两表不一致（88000.00 / 99999.99）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「多表比对规则」，进入「选择左侧表」:<br>- 规则名称: 多表比对金额一致性校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择左侧表: zszq_orders_left<br>点击「下一步」 | 进入「选择右侧表」步骤 |
| 2 | 在「选择右侧表」:<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择右侧表: zszq_orders_right<br>点击「下一步」 | 进入「选择字段」步骤 |
| 3 | 在「选择字段」配置字段映射:<br>- 字段映射（同名映射）: order_id ↔ order_id、trade_amount ↔ trade_amount<br>- 加主键: order_id<br>- 勾选匹配条件: 记录数差异（差距小于等于 0%）、数值差异绝对值（差距绝对值小于等于 12000）<br>点击「下一步」 | 字段映射与匹配条件配置成功，进入「执行配置」 |
| 4 | 在「执行配置」将「调度周期」切换为「手动触发」并「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例「查看明细」 | 实例状态为「校验通过」（order_id=1003 两表 trade_amount 差值 11999.99 在数值差异绝对值容差 12000 内，记录数 3=3，差异总数=0） |
| 5 | 编辑该多表比对规则，将「数值差异绝对值」容差由 12000 改为 10000，保存后重新「立即执行」，在【任务查询】查看最新实例「查看明细」 | 1)实例状态为「校验异常」（order_id=1003 差值 11999.99 超出容差 10000，差异总数=1）<br>2)「逻辑主键匹配，但数据不匹配」展示 order_id=1003（左 88000.00 / 右 99999.99） |

##### 【P1】验证 StarRocks 3.x 数据源多表比对数值差异百分比匹配条件

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），左右两表仅 order_id=1003 的 trade_amount 存在 5% 差值：

DROP TABLE IF EXISTS zszq_cmp_pct_left;
CREATE TABLE zszq_cmp_pct_left (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_pct_left VALUES (1001,100.00),(1002,200.00),(1003,1000.00);

DROP TABLE IF EXISTS zszq_cmp_pct_right;
CREATE TABLE zszq_cmp_pct_right (
  order_id     BIGINT        COMMENT '交易订单ID',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_pct_right VALUES (1001,100.00),(1002,200.00),(1003,1050.00);
-- order_id=1003 两表差值 50，占较小值 1000 的 5%
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「多表比对规则」，进入「选择左侧表」:<br>- 规则名称: 多表比对数值差异百分比校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择左侧表: zszq_cmp_pct_left<br>点击「下一步」 | 进入「选择右侧表」步骤 |
| 2 | 在「选择右侧表」:<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择右侧表: zszq_cmp_pct_right<br>点击「下一步」 | 进入「选择字段」步骤 |
| 3 | 在「选择字段」配置:<br>- 字段映射（同名映射）: order_id ↔ order_id、trade_amount ↔ trade_amount<br>- 加主键: order_id<br>- 勾选匹配条件: 记录数差异（差距小于等于 0%）<br>点击「下一步」 | 字段映射与匹配条件配置成功，进入「执行配置」 |
| 4 | 在「执行配置」将「调度周期」切换为「手动触发」并「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例「查看明细」 | 实例状态为「校验异常」（order_id=1003 两表 trade_amount 不一致，差异总数=1） |
| 5 | 编辑该多表比对规则，匹配条件增勾「数值差异百分比」并填写「差距百分比小于等于 10%」，保存后重新「立即执行」，在【任务查询】查看最新实例 | 实例状态为「校验通过」（order_id=1003 差值占比 5% 在数值差异百分比容差 10% 内，差异总数=0） |

##### 【P1】验证 StarRocks 3.x 数据源多表比对字符不区分大小写匹配条件

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），左右两表仅 order_id=1003 的 security_code 大小写不同：

DROP TABLE IF EXISTS zszq_cmp_case_left;
CREATE TABLE zszq_cmp_case_left (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(20)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_case_left VALUES (1001,'sh600036'),(1002,'sz000001'),(1003,'SH600519');

DROP TABLE IF EXISTS zszq_cmp_case_right;
CREATE TABLE zszq_cmp_case_right (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_code VARCHAR(20)  COMMENT '证券代码'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_case_right VALUES (1001,'sh600036'),(1002,'sz000001'),(1003,'sh600519');
-- order_id=1003 左 'SH600519' 右 'sh600519'，仅大小写不同
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「多表比对规则」，进入「选择左侧表」:<br>- 规则名称: 多表比对字符不区分大小写校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择左侧表: zszq_cmp_case_left<br>点击「下一步」 | 进入「选择右侧表」步骤 |
| 2 | 在「选择右侧表」:<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择右侧表: zszq_cmp_case_right<br>点击「下一步」 | 进入「选择字段」步骤 |
| 3 | 在「选择字段」配置:<br>- 字段映射（同名映射）: order_id ↔ order_id、security_code ↔ security_code<br>- 加主键: order_id<br>- 勾选匹配条件: 记录数差异（差距小于等于 0%）<br>点击「下一步」 | 字段映射与匹配条件配置成功，进入「执行配置」 |
| 4 | 在「执行配置」将「调度周期」切换为「手动触发」并「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例「查看明细」 | 实例状态为「校验异常」（order_id=1003 两表 security_code 大小写不一致，差异总数=1） |
| 5 | 编辑该多表比对规则，匹配条件增勾「字符不区分大小写」，保存后重新「立即执行」，在【任务查询】查看最新实例 | 实例状态为「校验通过」（order_id=1003 忽略大小写后 security_code 一致，差异总数=0） |

##### 【P1】验证 StarRocks 3.x 数据源多表比对空值与NULL等价匹配条件

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），左右两表仅 order_id=1003 的 security_name 为空串与 NULL 之别：

DROP TABLE IF EXISTS zszq_cmp_null_left;
CREATE TABLE zszq_cmp_null_left (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_null_left VALUES (1001,'招商银行'),(1002,'平安银行'),(1003,'');

DROP TABLE IF EXISTS zszq_cmp_null_right;
CREATE TABLE zszq_cmp_null_right (
  order_id      BIGINT       COMMENT '交易订单ID',
  security_name VARCHAR(50)  COMMENT '证券名称'
)
ENGINE=OLAP DUPLICATE KEY(order_id)
DISTRIBUTED BY HASH(order_id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_null_right VALUES (1001,'招商银行'),(1002,'平安银行'),(1003,NULL);
-- order_id=1003 左为空串 '' 右为 NULL
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「多表比对规则」，进入「选择左侧表」:<br>- 规则名称: 多表比对空值与NULL等价校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择左侧表: zszq_cmp_null_left<br>点击「下一步」 | 进入「选择右侧表」步骤 |
| 2 | 在「选择右侧表」:<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择右侧表: zszq_cmp_null_right<br>点击「下一步」 | 进入「选择字段」步骤 |
| 3 | 在「选择字段」配置:<br>- 字段映射（同名映射）: order_id ↔ order_id、security_name ↔ security_name<br>- 加主键: order_id<br>- 勾选匹配条件: 记录数差异（差距小于等于 0%）<br>点击「下一步」 | 字段映射与匹配条件配置成功，进入「执行配置」 |
| 4 | 在「执行配置」将「调度周期」切换为「手动触发」并「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例「查看明细」 | 实例状态为「校验异常」（order_id=1003 左空串与右 NULL 不一致，差异总数=1） |
| 5 | 编辑该多表比对规则，匹配条件增勾「空值与 NULL 等价」，保存后重新「立即执行」，在【任务查询】查看最新实例 | 实例状态为「校验通过」（order_id=1003 空串与 NULL 视为相等，差异总数=0） |

##### 【P0】验证 StarRocks 3.x 数据源多表比对异常数据五类分类统计

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 在 ${DataSourceA} 的 ${SchemaA} 库执行以下建表 SQL（可重入），id 为存储主键、order_id 为比对逻辑主键（可空），数据覆盖五类异常各 1 行：

DROP TABLE IF EXISTS zszq_cmp_cat_left;
CREATE TABLE zszq_cmp_cat_left (
  id           BIGINT        COMMENT '存储主键',
  order_id     BIGINT        COMMENT '交易订单ID（比对逻辑主键，可空）',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_cat_left VALUES (1,1001,100.00),(2,1002,200.00),(3,1003,300.00),(4,NULL,500.00);

DROP TABLE IF EXISTS zszq_cmp_cat_right;
CREATE TABLE zszq_cmp_cat_right (
  id           BIGINT        COMMENT '存储主键',
  order_id     BIGINT        COMMENT '交易订单ID（比对逻辑主键，可空）',
  trade_amount DECIMAL(18,2) COMMENT '交易金额'
)
ENGINE=OLAP DUPLICATE KEY(id)
DISTRIBUTED BY HASH(id) BUCKETS 10 PROPERTIES ("replication_num" = "1");
INSERT INTO zszq_cmp_cat_right VALUES (1,1001,100.00),(2,1002,999.00),(3,1004,400.00),(4,NULL,600.00);
-- 1001 两表一致；1002 主键匹配但金额不一致；1003 仅左表有；1004 仅右表有；左右各 1 行 order_id 为空
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击「新建监控规则」-「多表比对规则」，进入「选择左侧表」:<br>- 规则名称: 多表比对异常数据分类统计校验<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择左侧表: zszq_cmp_cat_left<br>点击「下一步」 | 进入「选择右侧表」步骤 |
| 2 | 在「选择右侧表」:<br>- 选择数据源: ${DataSourceA}（STAR_ROCKS_3X）<br>- 选择右侧表: zszq_cmp_cat_right<br>点击「下一步」 | 进入「选择字段」步骤 |
| 3 | 在「选择字段」配置:<br>- 字段映射（同名映射）: order_id ↔ order_id、trade_amount ↔ trade_amount（id 不参与映射）<br>- 加主键: order_id<br>- 勾选匹配条件: 记录数差异（差距小于等于 0%）<br>点击「下一步」 | 字段映射与匹配条件配置成功，进入「执行配置」 |
| 4 | 在「执行配置」将「调度周期」切换为「手动触发」并「完成」，点表名打开详情「立即执行」，进入【任务查询】查看最新实例「查看明细」 | 实例状态为「校验异常」，「异常数据」五个分类各 1 行:<br>1)「逻辑主键匹配，但数据不匹配」1 行（order_id=1002，左 200.00 / 右 999.00）<br>2)「左表数据在右表未找到」1 行（order_id=1003）<br>3)「右表数据在左表未找到」1 行（order_id=1004）<br>4)「左表逻辑主键为空」1 行<br>5)「右表逻辑主键为空」1 行 |

##### 【P2】验证 StarRocks 3.x 数据源规则配置列表查询与筛选

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 规则配置列表已存在多条 StarRocks 3.x 规则任务，分属不同数据表与最近修改人。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，在「规则」区「输入表名搜索」框输入 zszq_trade_repeat | 列表仅展示表名匹配 zszq_trade_repeat 的规则 |
| 2 | 清空表名搜索，在「最近修改人」下拉选择当前修改人 | 列表仅展示该修改人创建/修改的规则 |
| 3 | 勾选「我收藏的表」 | 列表仅展示已收藏表的规则 |
| 4 | 取消「我收藏的表」勾选，查看列表底部分页 | 列表恢复全部数据，分页控件展示总条数并可翻页 |

##### 【P2】验证 StarRocks 3.x 数据源规则任务编辑与重跑

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 规则配置列表已存在 1 条针对 zszq_trade_orders 的完整性表行数规则任务，期望值 > 5，最近实例为「校验通过」。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，点击 zszq_trade_orders 打开规则详情，查看监控对象与监控规则 | 规则详情正确回显数据源/Schema/数据表与已配规则（规则类型/字段/统计函数/期望值等） |
| 2 | 查看监控对象的数据源/Schema/数据表 | 数据源/Schema/数据表为不可编辑（置灰）状态，不允许修改监控对象 |
| 3 | 编辑监控规则:<br>- 期望值: > 5 改为 > 10<br>点击「保存」 | 规则期望值修改保存成功 |
| 4 | 点击「立即执行」，进入【任务查询】查看最新实例 | 实例按新期望值（> 10）校验，表行数 6 不满足 → 实例状态「校验异常」 |

##### 【P2】验证 StarRocks 3.x 数据源规则任务删除

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) 规则配置列表已存在 1 条针对 zszq_trade_null 的待删除规则任务。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【规则配置】，在 zszq_trade_null 规则行「操作」列点击「删除」 | 弹出删除确认弹窗 |
| 2 | 在确认弹窗点击「确定」 | 1)提示删除成功<br>2)该规则从规则配置列表移除，列表总条数减 1 |

### 任务查询

##### 【P0】验证任务查询页查询 StarRocks 3.x 规则任务实例与校验通过、异常状态详情

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) ${DataSourceA} 下已执行产生 2 类实例：1 个「校验通过」实例（完整性表行数任务）、1 个「校验异常」实例（完整性空值数任务，含脏数据明细）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【任务查询】 | 任务查询列表加载成功，展示 表/任务名称/状态/类型/数据源/执行周期/是否关联任务/计划时间 等列 |
| 2 | 在「请输入表名/任务名称搜索」输入校验通过的任务名称并查询 | 列表仅展示匹配的规则任务，数据源列显示 StarRocks3.x / ${DataSourceA} |
| 3 | 点击该「校验通过」实例所在行查看实例详情 | 1)实例状态为「校验通过」<br>2)规则卡片展示统计函数实际值与期望值，实际值满足期望 |
| 4 | 清空搜索，查询「校验异常」的空值数任务，查看实例详情并点击「查看明细」 | 1)实例状态为「校验异常」<br>2)规则卡片展示实际值不满足期望<br>3)明细展示不满足规则的脏数据记录 |
| 5 | 将「计划时间」筛选为近一周并查看列表底部分页 | 1)列表按计划时间区间过滤<br>2)分页控件展示总条数并可翻页 |

### 项目管理

##### 【P1】验证脏数据管理配置 StarRocks 3.x 数据源脏数据存储与时效

> 前置条件

```
1) StarRocks 3.x 数据源 ${DataSourceA} 已完成质量项目授权。
2) ${DataSourceA} 下已执行产生脏数据的规则任务（如完整性空值数「校验异常」实例）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量】-【项目管理】-【脏数据管理】 | 页面加载成功，顶部说明脏数据默认回写校验数据源源库、默认存储时效 90 天；列表展示 数据源/数据源类型/脏数据存储库/数据存储时效/更新人/脏数据存储/操作 列 |
| 2 | 在「请输入数据源名称」搜索 ${DataSourceA} | 列表仅展示 ${DataSourceA}（STAR_ROCKS_3X）的脏数据存储配置行 |
| 3 | 开启「独立存储」开关，在 ${DataSourceA} 行的「操作」中配置:<br>- 脏数据存储库: ${SchemaA}<br>- 数据存储时效: 30 天<br>保存配置 | 配置保存成功，${DataSourceA} 行脏数据存储库显示 ${SchemaA}、数据存储时效显示 30 天 |
| 4 | 进入【任务查询】，对 ${DataSourceA} 的「校验异常」实例「查看明细」 | 脏数据明细可查看，明细数据已按配置写入 ${SchemaA} 库的脏数据临时表 |
