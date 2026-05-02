---
suite_name: "岚图已上线需求一级用例（P1 全量候选）"
description: "岚图已上线需求一级用例（P1 全量候选）用例归档"
tags:
  - "dataAssets"
prd_version: ""
dev_version:
  - "岚图汽车"
create_at: "2026-05-18"
status: "草稿"
origin: "csv"
case_count: 493
---

# 岚图已上线需求一级用例（P1 全量候选）

## v6.4.3

### 元数据、数据质量支持doris3.x(#9346)

##### 【P1】验证「质量报告」中 Doris 3.x 数据源质量报告的查询功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 输入报告名称 ${name}, 进行查询 | 查询出报告名称中所有包含${name}的记录 |
| 3 | 置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询 | 查询出表名包含${name3}且最近修改人为${person3}的规则记录 |
| 4 | 置空所有查询条件, 切换分页组件为「10条/页」 | 当前页面规则数量变更为10条 |
| 5 | 点击页码 | 跳转至对应的页码页面 |
| 6 | 点击“<” | 向前翻页 |
| 7 | 点击“>” | 向后翻页 |
| 8 | 切换每页展示数量 | 每页展示记录数为切换后的数量 |

##### 【P1】验证「任务实例查询」中 Doris 3.x 数据源任务实例的查询功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【任务实例查询】页面 | 进入成功 |
| 2 | 输入表名/任务名称 ${name}, 进行查询 | 查询出「表」的表名中所有包含${name}的规则记录 |
| 3 | 置空所有查询条件, 输入不存在表名${name2}, 进行查询 | 显示「暂无数据」 |
| 4 | 置空所有查询条件, 输入表名${name3}, 修改人${person3}, 进行查询 | 查询出表名包含${name3}且最近修改人为${person3}的规则记录 |
| 5 | 置空所有查询条件, 勾选「我收藏的表」 | 查询出操作中仅为「取消收藏」的表 |
| 6 | 置空所有查询条件, 切换分页组件为「10条/页」 | 当前页面规则数量变更为10条 |
| 7 | 点击页码 | 跳转至对应的页码页面 |
| 8 | 点击“<” | 向前翻页 |
| 9 | 点击“>” | 向后翻页 |
| 10 | 切换每页展示数量 | 每页展示记录数为切换后的数量 |

##### 【P1】验证 「元数据」中 Doris 3.x 数据源删除库操作

> 前置条件

```
「元数据管理」页面中已存在从离线平台中同步过来的Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 进入成功 |
| 3 | 点击数据库, 选择一条记录, 点击「删除」按钮 | 1) 弹出二次确认弹窗2) 删除库表操作仅针对资产平台内生效，不会影响底层数据库表信息 |
| 4 | 输入「数据库名」后, 点击删除按钮 | 1) 弹窗关闭, 该表信息从资产平台中删除完成2) 可以通过元数据同步中, 重新将该库表同步至资产平台 |

##### 【P1】验证 「元数据」中 Doris 3.x 数据源删除表操作

> 前置条件

```
「元数据管理」页面中已存在从离线平台中同步过来的Doris 3.x数据源
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【元数据】-【元数据管理】页面 | 进入成功 |
| 2 | 选择数据源类型为「Doris 3.x」的数据源, 点击进入 | 进入成功 |
| 3 | 点击数据库, 进入数据表页面, 选择一条记录, 点击「删除」按钮 | 1) 弹出二次确认弹窗: 「确定删除表“${table}“吗?」2) 删除方式支持删除元数据表和删除源表3) 输入的表名一致后可删除表 |
| 4 | 「删除方式」选择「删除元数据表」, 输入${表名}后, 点击「确定」 | 1) 弹窗关闭, 该表信息从资产平台及其他子产品中删除完成2) 可以通过元数据同步中, 重新将该表同步至资产平台 |

### 完整性校验，支持单表字段值对比(#9337)

##### 【P1】验证「查看明细」弹窗标题修改

> 前置条件

```
1. 已存在历史校验失败的任务
A(完整性校验-空值数/空值率/空串数/空串率/字段值校验)
B (有效性校验-字符长度/日期格式/自定义正则/取值范围)
C(唯一性校验-重复数/重复率/非重复个数/非重复占比)
D(统计性校验-异常值检测)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-任务实例查询页面 | 进入成功 |
| 2 | 选择实例A，查看明细数据 | 明细数据弹窗标题改为“完整性校验+校验方法“ |
| 3 | 选择实例B，查看明细数据 | 明细数据弹窗标题改为“有效性校验+校验方法“ |
| 4 | 选择实例C，查看明细数据 | 明细数据弹窗标题改为“唯一性校验+校验方法“ |
| 5 | 选择实例D，查看明细数据 | 明细数据弹窗标题改为“统计性校验+校验方法“ |


##### 【P1】验证校验失败时「实例详情-监控报告」展示正确

> 前置条件

```
已存在校验失败的实例A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-任务实例查询页面 | 进入成功 |
| 2 | 选择实例A，查看监控报告 | 进入成功 |
| 3 | 查看明细数据 | 校验失败的实例不展示「明细数据」 |
| 4 | 点击「查看日志」按钮 | 展示任务失败日志详细信息 |

##### 【P1】验证校验通过时「实例详情-监控报告」展示正确

> 前置条件

```
已存在校验通过的实例A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-任务实例查询页面 | 进入成功 |
| 2 | 选择实例A，查看监控报告 | 进入成功 |
| 3 | 查看明细数据 | 校验成功的实例不展示「明细数据」 |


##### 【P1】「完整性校验」-「字段级」-「统计函数」新增「字段值校验」选项验证

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「规则类型」选择「字段级」 「字段」选择「XX 字段」 「字段间规则逻辑」选择「and」 点击「统计函数」 | 「统计函数」新增「字段值校验」选项 |

### 完整性校验，支持多表数据内容对比(#9339)

##### 【P1】验证包含与不包含字符串条件

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
name VARCHAR(50)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
name VARCHAR(50)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 'Alice'),
(2, 'Bob'),
(3, 'Charlie');  -- 包含 'lie'
INSERT INTO doris_compare_table_1 VALUES
(101, 'David'),
(102, 'Eve');  -- 均不包含 'son'
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table字段：name期望值：包含 lie主键：不选 | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1字段：name期望值：不包含 son主键：不选 | 添加成功 |
| 6 | 选择判断关系为「或」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |
| 8 | 编辑规则任务, 选择判断关系修改为「且」 | 编辑成功 |
| 9 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P1】验证 in 和 not in 条件校验

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
category VARCHAR(10)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
category VARCHAR(10)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 'A'),
(2, 'B'),
(3, 'C');  -- C 不在 (A,B) 中
INSERT INTO doris_compare_table_1 VALUES
(101, 'X'),
(102, 'Y');  -- 均不在 (A,B,C) 中
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 校验表：表：doris_check_table字段：category期望值：in A,B主键：不选 | 配置成功 |
| 5 | 对比表：表：doris_compare_table_1字段：category期望值：not in A,B,C主键：不选 | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P1】验证无主键时或关系下仅一个表通过

> 前置条件

```
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
CREATE TABLE doris_check_table (
id INT,
score INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
CREATE TABLE doris_compare_table_1 (
user_id INT,
score INT
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
INSERT INTO doris_check_table VALUES
(1, 85),
(2, 90),
(3, 78);  -- 有小于90的值
INSERT INTO doris_compare_table_1 VALUES
(101, 95),
(102, 92),
(103, 98);  -- 全部 >=90
SELECT * FROM doris_check_table;
SELECT * FROM doris_compare_table_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 配置校验表：表：doris_check_table字段：score期望值：>= 90主键：不选 | 配置成功 |
| 5 | 添加对比表：表：doris_compare_table_1字段：score期望值：>= 90主键：不选 | 添加成功 |
| 6 | 选择判断关系为「或」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |
| 8 | 编辑规则任务, 选择判断关系修改为「且」 | 编辑成功 |
| 9 | 保存并运行规则任务 | 运行成功, 状态为「校验失败」 |

##### 【P1】验证无主键时且关系下字段值全满足期望条件

> 前置条件

```
-- 删除表（如果存在）
DROP TABLE IF EXISTS doris_check_table;
DROP TABLE IF EXISTS doris_compare_table_1;
-- 创建校验表
CREATE TABLE doris_check_table (
id INT,
status VARCHAR(20)
) ENGINE=OLAP
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
-- 创建对比表1
CREATE TABLE doris_compare_table_1 (
user_id INT,
status VARCHAR(20)
) ENGINE=OLAP
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);
-- 插入数据
INSERT INTO doris_check_table VALUES
(1, 'active'),
(2, 'active'),
(3, 'active');
INSERT INTO doris_compare_table_1 VALUES
(101, 'active'),
(102, 'active');
-- 查询验证
SELECT * FROM doris_check_table;
SELECT * FROM doris_compare_table_1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「监控对象」后, 选择规则类型为「多表数据内容对比」 | 选择成功 |
| 4 | 配置校验表：选择表：doris_check_table字段：status期望值：= “active“主键：不选择 | 配置成功 |
| 5 | 添加对比表：选择对比表：doris_compare_table_1分区：无分区，跳过对比字段：status期望值：= “active“主键：不选择 | 添加成功 |
| 6 | 选择判断关系为「且」 | 选择成功 |
| 7 | 保存并运行规则任务 | 运行成功, 状态为「校验通过」 |

### 完整性校验，支持多表行数比对(#9338)

##### 【P1】验证「多表数据行数对比」规则校验(记录数数量差异)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择「记录数数量差异」「10」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」1) 任务实例详情弹窗中存在「校验通过」的标识2) 不记录明细数据；3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 7 | 重新编辑规则任务,  记录数数量差异改为1并确定后, 保存并重新运行规则任务 | 规则编辑成功 |
| 8 | 保存并重新运行规则任务 | 任务实例状态由「运行中」 > 「校验异常」1) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值2) 完整性检验表格中新增键值对: 规则类型-多表数据内容对比 |
| 9 | 点击「查看明细」 | 展示校验表和所有对比表的表名/分区/所属库/表行数 |

##### 【P1】验证「多表数据行数对比」规则校验(记录数百分比差异)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择「记录数百分比差异」「20」 | 配置完成 |
| 5 | 点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮 | 规则保存成功 |
| 6 | 立即运行、周期运行 | 任务实例状态由「运行中」 > 「校验通过」 1) 任务实例详情弹窗中存在「校验通过」的标识 2) 不记录明细数据； 3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比 |
| 7 | 重新编辑规则任务, 记录数百分比差异改为0.1并确定后 | 规则编辑成功 |
| 8 | 保存并重新运行规则任务 | 任务实例状态由「运行中」 > 「校验异常」1) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值2) 完整性检验表格中新增键值对: 规则类型-多表数据内容对比 |
| 9 | 点击「查看明细」 | 展示校验表和所有对比表的表名/分区/所属库/表行数 |

##### 【P1】验证对比库表添加/删除功能正常

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 2 | 点击「新建监控规则」后, 填写完「监控对象」表单, 点击「下一步」, 在「监控规则」表单中点击「添加规则-完整性校验」, 校验类型选择「多表数据行数对比」 | 显示「完整性校验-多表数据行数对比」表单配置项 |
| 3 | 选择第一个库/表/分区选项后, 点击「+」按钮 | 1) 新增一行库/表/分区配置项2) 第二行的数据库默认选择上一步骤选择的数据库，可修改为当前源下的其他库3) 出现「-」按钮, 可以删除配置项 |
| 4 | 依次添加至10行配置后, 再次点击「+」 | 提示: 「最多添加10个对比表」 |
| 5 | 点击“-”删除按钮 | 成功删除该行对比表 |
| 6 | 删除所有对比表 | 提示: 请选择对比表 |

### 规则校验详细结果表(#9334)

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复率为xx，符合规则“固定值xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段重复数为xx，不符合规则“固定值xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【唯一性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「规则类型」选择「字段级」 「统计函数」 选择「重复数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「重复值检测未通过」 |




##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段符合格式数量为xx，符合规则“符合格式个数【>/>=/</<=/=/!=XX】””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「字段」选择「id」 「统计规则」 选择「格式校验-身份证号」 「校验格式」选择「固定值」 「期望值」 <10 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，不符合规则“表行数<=0”，偏差率为100%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【有效性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「字段」选择「id」 「统计规则」 选择「数值-取值范围检测」 「期望值」配置「>0 且> 100」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行失败 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「数值取值范围检测未通过」 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);

INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx字段xx，表xx字段xx取值内容存在异常，不符合规则“表xx字段xx（主键为xx）=1”且（/或）“表xx字段xx（主键为xx）=1””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表数据内容比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「多表数据内容比对未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);

INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「符合规则“表xx字段xx（主键为xx）=1”且（/或）“表xx字段xx（主键为xx）=1””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表数据内容比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx行数为xx，表xx行数为xx，不符合规则中约定的行数差值不超过xx（/行数差值百分比不超过xx%/行数相等）」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表行数比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「多表行数比对检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表xx行数为xx，表xx行数为xx，符合规则中约定的行数差值不超过xx（/行数差值百分比不超过xx%/行数相等）”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「多表」 「规则类型」选择「表级」 「统计函数」 选择「多表行数比对」 「过滤条件」 输入「id < 100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「存在字段值不符合取值范围区间，不符合规则“取值范围xxx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「字段取值校验」 「过滤条件」 输入「id < 100」 id >0 and age >100 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「数据取值范围校验未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段值符合取值范围区间，符合规则“取值范围xxx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「字段取值校验」 「过滤条件」 输入「id < 100」 id >0 and age <100 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天至昨日的平均空串数为xx，空串数月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天至昨日的平均空串数为xx，空串数月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，近7日平均空串数为xx，空串数7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，近7日平均空串数为xx，空串数7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天空串数为xx，空串数月度波动率为xx，不符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，上月同天空串数为xx，空串数月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，7日前空串数为xx，空串数7天波动率为xx，不符合规则“7天波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，昨日空串数为xx，空串数1天波动率为xx，不符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，符合规则“表行数>0”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，昨日空串数为xx，空串数1天波动率为xx，符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，不符合规则“空串数【>/>=/</<=/=/!=XX】”，偏差率+-XX%」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串数为xx，符合规则“空串数<1%””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天至昨日的平均空串率为xx，空串率月度平均值波动率为xx，不符合规则“月度平均值波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天至昨日的平均空串率为xx，空串率月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，近7日平均空串率为xx，空串率7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，近7日平均空串率为xx，空串率7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天空串率为xx，空串率月度波动率为xx，不符合规则“月度波动率xx”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，上月同天空串率为xx，空串率月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，7日前空串率为xx，空串率7天波动率为xx，不符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，7日前空串率为xx，空串率7天波动率为xx，符合规则“7天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，昨日空串率为xx，空串率1天波动率为xx，不符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「空值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，昨日空串率为xx，空串率1天波动率为xx，符合规则“1天波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，不符合规则“空串率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空串率为xx，符合规则“空值率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空串数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天至昨日的平均空值率为xx，空值率月度平均值波动率为xx，不符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天至昨日的平均空值率为xx，空值率月度平均值波动率为xx，符合规则“月度平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，近7日平均空值率为xx，空值率7天平均值波动率为xx，不符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，近7日平均空值率为xx，空值率7天平均值波动率为xx，符合规则“7天平均值波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天空值率为xx，空值率月度波动率为xx，不符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，上月同天空值率为xx，空值率月度波动率为xx，符合规则“月度波动率xx””」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，7日前空值率为xx，空值率7天波动率为xx，不符合规则“7天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，7日前空值率为xx，空值率7天波动率为xx，符合规则“7天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，昨日空值率为xx，空值率1天波动率为xx，不符合规则“1天波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，昨日空值率为xx，空值率1天波动率为xx，符合规则“1天波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「1天波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，不符合规则“空值率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」展示「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值率为xx，符合规则“空值率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值率」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |



##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天至昨日的平均空值数为10，空值数月度平均值波动率为xx，不符合规则“月度平均值波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，上月同天至昨日的平均空值数为10，空值数月度平均值波动率为xx，符合规则“月度平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「月度平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，近7日平均空值数为10，空值数7天平均值波动率为xx，不符合规则“7天平均值波动率<1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「<1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1.「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |

##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，近7日平均空值数为10，空值数7天平均值波动率为xx，符合规则“7天平均值波动率>1%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「7天平均值波动检测」 「期望值」选择「>1%」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |


##### 【P1】验证「校验异常」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「字段空值数为1，不符合规则“空值数<=0”，偏差率+-XX%”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」展示「查看详情」按钮，点击展示「明细数据」 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「字段级」 「统计函数」 选择「空值数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验未通过」，「未通过原因」展示为「NULL值检测未通过」 |



##### 【P1】验证「校验通过」逻辑正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
student_id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(student_id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(student_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (student_id, course_name, score, exam_date)
VALUES
(1001, '数学', 85.5, '2024-03-15'),
(1002, '英语', 92.0, '2024-03-15'),
(1001, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 「详情说明」 为「表行数为1，符合规则“表行数>0”」 |
| 3 | 配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“，选择【完整性校验】规则 | 「操作栏」不展示按钮 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「>0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 | 周期调度配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行、周期运行 | 实例运行成功 |
| 9 | 进入「质量报告」页面，选择表tableA，查看「规则校验明细」 | 1. 「质检结果」为「校验通过」，「未通过原因」不展示 |

### 规则集报告生成设置(#9335)

##### 【P1】「质量报告」-「报告内容逻辑」功能校验

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 校验结果数据选择当天前一天到前三天-规则任务-实例运行(临时运行+周期运行)的全部结果 |
| 3 | 配置「数据源」「数据库」「数据表」 | 选择成功 |
| 4 | 规则全选(完整性校验，有效性校验，唯一性校验，统计性校验) | 各规则模块均勾选成功，配置项展示正确 |
| 5 | 规则均配置 | 配置完成 |
| 6 | 点击「下一步」 | 进入【调度配置】页面 |
| 7 | 【报告配置】如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「月」-「每月25号」 「数据周期」选择「每月1号～每月30号」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置成功 |
| 8 | 保存并立即运行当前规则 | 规则运行完成 |
| 9 | 进入【质量报告】页面，查看报告结果 | 1. 每月25号成功生成当前规则报告 |
| 10 | 【报告配置】编辑如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「周」-「每周五」 「数据周期」选择「每周一～每周五」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置修改成功 |
| 11 | 保存并立即运行当前规则 | 规则运行完成 |
| 12 | 进入【质量报告】页面，查看报告结果 | 1. 每周五成功生成当前规则报告 |
| 13 | 【报告配置】编辑如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「天」-「每天18点」 「数据周期」选择「前1天～前3天」 「结果展示」 选择「展示全部结果」 「是否需要车辆信息」选择「是」 | 报告配置修改成功 |
| 14 | 保存并立即运行当前规则 | 规则运行完成 |
| 15 | 进入【质量报告】页面，查看报告结果 | 1. 每天18点成功生成当前规则报告 |
| 16 | 【报告配置】编辑如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「自定义」 「数据周期」选择「前1天～前3天」 「结果展示」 选择「展示全部结果」 「是否需要车辆信息」选择「是」 | 报告配置修改成功 |
| 17 | 保存并立即运行当前规则 | 规则运行完成 |
| 18 | 进入【质量报告】页面，查看报告结果 | 1. 按照自定义日期成功生成当前规则报告 |

##### 【P1】「质量报告」-「报告统计规则范围」功能校验

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 车辆信息模块不展示 |
| 3 | 配置「数据源」「数据库」「数据表」 | 报告名称展示正确 |
| 4 | 规则全选(完整性校验，有效性校验，唯一性校验，统计性校验) | 各规则模块均勾选成功，配置项展示正确 |
| 5 | 规则均配置 | 配置完成 |
| 6 | 点击「下一步」 | 进入【调度配置】页面 |
| 7 | 【报告配置】如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「月」-「每月25号」 「数据周期」选择「每月1号～每月30号」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置成功 |
| 8 | 保存并立即运行当前规则 | 规则运行完成 |
| 9 | 进入【质量报告】页面，查看报告结果 | 1. 报告内容包含当前规则的所有校验规则1号～30号最新结果 |
| 10 | 编辑当前规则的「报告配置」如下： 「报告名称」修改为 “test“ 「报告类型」保持默认「质检式」 「报告统计规则范围」仅选择「完整性校验」 「报告周期」选择「天」 「数据周期」选择「1天前~3天前」 「结果展示」 选择「展示所有结果」 「是否需要车辆信息」选择「否」 | 报告配置修改成功 |
| 11 | 保存并立即运行当前规则 | 规则运行完成 |
| 12 | 进入【质量报告】页面，查看报告结果 | 1. 报告内容仅展示「完整性校验规则」1-3天前的所有结果 |

##### 【P1】「报告配置」-配置全流程功能校验

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 质量报告配置新增一条「单表报告」记录 |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 【完整性校验】规则均配置 | 配置完成 |
| 5 | 【报告配置】如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「月」-「每月25号」 「数据周期」选择「每月1号～每月30号」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置成功 |
| 6 | 保存规则，查看规则详情 | 1. 规则详情信息字段均展示正确 |

##### 【P1】验证「调度属性」页面新增「报告配置」模块

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 【完整性校验】规则均配置 | 配置完成 |
| 5 | 点击「下一步」 | 进入【调度配置】页面 |
| 6 | 【调度配置】页面UI CHECK | 页面新增【报告配置】模块 |
| 7 | 【报告配置】模块UI CHECK | 展示 「报告名称」输入框 「报告类型」选择框 「报告统计规则范围」选择框 「报告周期」选择框 「数据周期」选择框 「展示最新结果、展示全部结果」单选框 「是否需要车辆信息」 单选框 |

##### 【P1】「数据治理」告警接收人-同步生效功能回归

> 前置条件

```
1. 治理工作台-治理任务管理已存在待治理任务
2. 已存在告警通道「短信」「邮箱」「钉钉」「自定义」
3. 已存在用户A、B、C
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-数据治理-治理工作台-治理任务管理页面 | 进入成功 |
| 2 | 选择待治理的任务，点击「治理项处理」 | 弹「治理项处理」弹窗 |
| 3 | 选择「指派处理人」 | 弹「指派处理人」弹窗 |
| 4 | 查看「指派处理人」 勾选「短信」「邮箱」「钉钉」「自定义」告警通道 所有通道均选择用户A、B、C | 配置成功 |
| 5 | 点击「确定」通知处理人 | A、B、C处理人均接收到信息 |

##### 【P1】验证规则校验失败时，告警通知逻辑正确

> 前置条件

```
1. 资产已存在用户A,B,C
2. 已配置告警通道短信、邮箱、钉钉、自定义
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 「校验类型」选择「单表」 「规则类型」选择「表级」 「统计函数」 选择「表行数」 「过滤条件」 输入「id < 100」 「校验方法」选择「固定值」 「期望值」选择「<0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「周期任务」 「告警配置」配置如下： 勾选「短信」「邮箱」「钉钉」告警通道 所有通道均选择用户A、B、C | 周期调度、告警配置完成 |
| 7 | 点击「完成」按钮 | 规则保存成功 |
| 8 | 立即运行前，将所选表物理删除，然后再运行校验规则 | 实例运行失败，用户A、B、C均接收到四个通道的告警信息 |

##### 【P1】验证不同告警通道-接收人均支持多选

> 前置条件

```
1. 资产已存在用户A,B,C
2. 已配置告警通道短信、邮箱、钉钉、自定义
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 【完整性校验】规则均配置 | 配置完成 |
| 5 | 点击「保存」按钮 | 规则配置保存正确 |
| 6 | 点击「下一步」，配置「调度属性」-「告警配置」 选择「短信」通道，选择用户A、B、C | 短信通道选择用户A、B、C成功，支持多选 |
| 7 | 点击「下一步」，配置「调度属性」-「告警配置」 选择「邮箱」通道，选择用户A、B、C | 邮箱通道选择用户A、B、C成功，支持多选 |
| 8 | 点击「下一步」，配置「调度属性」-「告警配置」 选择「钉钉」通道，选择用户A、B、C | 钉钉通道选择用户A、B、C成功，支持多选 |
| 9 | 点击「下一步」，配置「调度属性」-「告警配置」 选择「自定义」通道，选择用户A、B、C | 自定义通道选择用户A、B、C成功，支持多选 |
| 10 | 不同通道均选择10个用户 | 最大可选用户数校验正确 |
| 11 | 点击「完成」按钮 | 规则保存成功 |

### 质检式质量报告查看、下载(#9342)

##### 【P1】验证查看详情功能正常

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行DorisSQL语句:
DROP TABLE IF EXISTS car_compare01;
CREATE TABLE car_compare01 (
vin VARCHAR(64) COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证',
delivery_time DATE COMMENT '交付日期'
)
ENGINE=OLAP
DUPLICATE KEY(vin)
COMMENT '车辆校验表01'
PARTITION BY RANGE(`delivery_time`) (
PARTITION p20250919 VALUES LESS THAN (“2025-09-19“),
PARTITION p20250920 VALUES LESS THAN (“2025-09-20“),
PARTITION p20250921 VALUES LESS THAN (“2025-09-21“),
PARTITION p20250922 VALUES LESS THAN (“2025-09-22“),
PARTITION p20250923 VALUES LESS THAN (“2025-09-23“),
PARTITION p20250924 VALUES LESS THAN (“2025-09-24“),
PARTITION p20250925 VALUES LESS THAN (“2025-09-25“),
PARTITION p20250926 VALUES LESS THAN (“2025-09-26“),
PARTITION p20250927 VALUES LESS THAN (“2025-09-27“),
PARTITION p20250928 VALUES LESS THAN (“2025-09-28“),
PARTITION p20250929 VALUES LESS THAN (“2025-09-29“),
PARTITION p20250930 VALUES LESS THAN (“2025-09-30“),
PARTITION p20251001 VALUES LESS THAN (“2025-10-01“),
PARTITION p20251002 VALUES LESS THAN (“2025-10-02“),
PARTITION p20251003 VALUES LESS THAN (“2025-10-03“),
PARTITION p20251004 VALUES LESS THAN (“2025-10-04“),
PARTITION p20251005 VALUES LESS THAN (“2025-10-05“),
PARTITION p20251006 VALUES LESS THAN (“2025-10-06“),
PARTITION p20251007 VALUES LESS THAN (“2025-10-07“)
)
DISTRIBUTED BY HASH(vin) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- p20250919 分区
INSERT INTO car_compare01 VALUES
('LDP91C60PE200001','知音','EV','H60a','常规','两驱','N3',0,'2025-09-19'),
('LDP91C60PE200002','知音','EV','H60a','常规','两驱','N3',1,'2025-09-19'),
('LDP91C60PE200003','知音','EV','H60a','长续航','四驱','N5',1,'2025-09-19'),
('LDP91C60PE200004','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-09-19'),
('LDP91C60PE200005','知音','EREV','H60','常规','四驱','N3',1,'2025-09-19'),
('LDP91C60PE200006','知音','EV','H60a','常规','两驱','N3',0,'2025-09-20'),
('LDP91C60PE200007','知音','EV','H60a','常规','两驱','N3',1,'2025-09-20'),
('LDP91C60PE200008','知音','EREV','H60','长续航','四驱','N5',1,'2025-09-20'),
('LDP91C60PE200009','知音','EREV','H60','长续航','四驱','N5',NULL,'2025-09-20'),
('LDP91C60PE200010','知音','EREV','H60','常规','四驱','N3',1,'2025-09-20');

select * from car_compare01;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（doris）中通过catalog将car_base_table表设置为doris的外部维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare01表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面, 「规则校验明细-多表规则-质检结果」中存在「校验未通过」的记录 |
| 3 | 点击操作中的「查看详情」 | 支持查看明细数据，展示内容和任务实例模块的查看明细弹窗/抽屉保持一致 |

##### 【P1】验证查看日志功能正常

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入离线开发-周期任务, 创建并执行Hive SQL任务: DROP TABLE car_compare02; | 源表删除成功, 但是元数据表仍存在于资产平台 |
| 2 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 3 | 在「已配置报告」中新建报告, 规则范围默认「全部」,报告周期为「一次性」, 并配置car_compare02表, 点击「确定」 | 1) 表单提交成功 2) 质量报告校验失败 |
| 4 | 点击「已生成报告」页签, 进入报告详情, 点击操作中的「查看日志」 | 支持查看日志数据，和任务实例模块的查看日志内容保持一致 |

##### 【P1】验证页面&功能正常(SparkThrift 2.x)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

  

  
DROP TABLE IF EXISTS car_compare02;

  
CREATE TABLE car_compare02 (

  
vin STRING COMMENT '车辆唯一识别码',

  
car_series STRING COMMENT '车系',

  
car_power STRING COMMENT '动力类型',

  
car_config STRING COMMENT '车型配置',

  
car_endurance STRING COMMENT '续航类型',

  
drive_type STRING COMMENT '驱动形式',

  
car_equipment STRING COMMENT '车辆配置版本',

  
is_certific INT COMMENT '是否认证'

  
)

  
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')

  
COMMENT '车辆信息表'

  
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES

  
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),

  
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),

  
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),

  
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),

  
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),

  
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),

  
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),

  
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),

  
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),

  
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES

  
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),

  
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 点击「车型」筛选图标 | 1) 支持选择car_config字段的所有枚举2) 按钮: 重置/确定, 重置默认置灰 |
| 4 | 勾选「H53a」 , 点击「确定」 | 显示「车型」为「H53a」的记录 |
| 5 | 重置后, 再次点击「车型」筛选图标，勾选「H53a」和「H53b」 , 点击「确定」 | 显示「车型」为「H53a」或「H53b」的记录 |

##### 【P1】验证未配置关联维表

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签, 选择校验成功的报告记录, 点击「报告详情」按钮 | 跳转到「质量报告」详情页面 |
| 3 | 检查报告详情页面显示 | 质量评估汇总(car_compare02--delivery_time=2025-10-01) 1) 不显示车辆数 2) 不显示「车辆信息汇总」表格 |

### 质量报告管理(#9341)

##### 【P1】验证「已生成报告」-单个删除功能正常

> 前置条件

```
已存在至少一条报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签 | 成功切换到「已生成报告」 |
| 3 | 选择一条报告记录, 点击删除按钮 | 打开二次确认弹窗 1）title：请确认是否删除报告。 2）“取消、确定”按钮 |
| 4 | 点击「取消」按钮 | 确认框关闭，报告记录未被删除 |
| 5 | 再次点击删除按钮, 点击「确定」 | 1）该记录从「已生成报告」列表区域移除 2）列表分页控件记录总数减1 3）toast提示: “删除成功” |

##### 【P1】验证「已生成报告」-报告名称筛选

> 前置条件

```
已存在≥3条不同名称的配置
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 点击「已生成报告」页签 | 成功切换到「已生成报告」 |
| 3 | 在「报告名称」输入关键字${name}, 点击「查询」 | 1) 输入前: 输入框置灰提示「请输入报告名称搜索」2)输入后: 显示「报告名称」包含${name}的记录 |
| 4 | 点击「重置」 | 显示全部记录 |


##### 【P1】验证「已配置报告」-同一张表同时配置自定义报告+单表报告

> 前置条件

```
已在离线平台中创建Hive表: vehicle_sales_df

1、进入离线平台-数据开发-周期任务界面

2、 右键任务开发目录, 新建HiveSQL任务, 并临时运行以下SQL语句后, 保存并提交.

DROP TABLE IF EXISTS vehicle_sales_df;
CREATE TABLE vehicle_sales_df (
  sale_id        STRING  COMMENT '零售单号，业务唯一',
  vin            STRING  COMMENT '17位VIN',
  model          STRING  COMMENT '车型：FREE/梦想家/追光',
  trim           STRING  COMMENT '配置：标准/长续航/四驱旗舰等',
  energy_type    STRING  COMMENT '能源：增程/纯电',
  province       STRING  COMMENT '省份',
  city           STRING  COMMENT '城市',
  dealer_code    STRING  COMMENT '经销商编码',
  channel        STRING  COMMENT '渠道：门店/电商/大客户',
  order_date     DATE    COMMENT '下单日期',
  deliver_date   DATE    COMMENT '交付日期',
  invoice_amount DECIMAL(12,2) COMMENT '开票金额(含税)',
  subsidy_amount DECIMAL(12,2) COMMENT '补贴金额(可为空)',
  warranty_years INT     COMMENT '质保年限',
  owner_hash     STRING  COMMENT '脱敏用户ID(哈希)',
  retail_status  STRING  COMMENT '已交付/已退车/已取消',
  mileage_km     INT     COMMENT '交付里程(km)',
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
)
PARTITIONED BY (part_month STRING COMMENT 'yyyy-MM')
STORED AS ORC;

INSERT INTO vehicle_sales_df PARTITION (part_month='2025-08') VALUES
('RT202508010001','LVT0000000000001','FREE','四驱旗舰','增程','湖北','武汉','WH001','门店',DATE'2025-08-01',DATE'2025-08-05',339800.00,10000.00,5,'u_7a9f1','已交付',12,TIMESTAMP'2025-08-05 10:20:00',TIMESTAMP'2025-08-05 10:20:00'),
('RT202508010002','LVT0000000000002','梦想家','长续航','纯电','广东','深圳','SZ011','电商',DATE'2025-08-02',DATE'2025-08-06',369800.00,8000.00,6,'u_51b2c','已交付',10,TIMESTAMP'2025-08-06 12:01:00',TIMESTAMP'2025-08-06 12:01:00'),
('RT202508010003','LVT0000000000003','追光','标准','纯电','上海','上海','SH008','门店',DATE'2025-08-03',DATE'2025-08-08',289800.00,NULL,5,'u_c103f','已交付',9,TIMESTAMP'2025-08-08 09:00:00',TIMESTAMP'2025-08-08 09:00:00'),
('RT202508010004','LVT0000000000004','FREE','标准','增程','四川','成都','CD006','门店',DATE'2025-08-03',DATE'2025-08-09',319800.00,5000.00,5,'u_8ab33','已退车',15,TIMESTAMP'2025-08-09 14:30:00',TIMESTAMP'2025-08-20 10:00:00'),
('RT202508010005','LVT0000000000005','梦想家','旗舰','纯电','浙江','杭州','HZ003','大客户',DATE'2025-08-04',DATE'2025-08-10',399800.00,12000.00,6,'u_77dd2','已交付',8,TIMESTAMP'2025-08-10 16:10:00',TIMESTAMP'2025-08-10 16:10:00'),
('RT202508010006','LVT0000000000006','追光','长续航','纯电','广东','广州','GZ002','门店',DATE'2025-08-05',DATE'2025-08-12',309800.00,6000.00,5,'u_19aa1','已交付',7,TIMESTAMP'2025-08-12 11:11:11',TIMESTAMP'2025-08-12 11:11:11'),
('RT202508010007','LVT0000000000007','FREE','四驱旗舰','增程','北京','北京','BJ001','门店',DATE'2025-08-06',DATE'2025-08-13',349800.00,9000.00,5,'u_abc91','已交付',6,TIMESTAMP'2025-08-13 10:00:00',TIMESTAMP'2025-08-13 10:00:00'),
('RT202508010008','LVT0000000000008','梦想家','标准','纯电','重庆','重庆','CQ005','电商',DATE'2025-08-07',NULL,359800.00,7000.00,6,'u_0fedc','已取消',0,TIMESTAMP'2025-08-07 09:30:00',TIMESTAMP'2025-08-07 09:30:00'),
('RT202508010009','LVT0000000000009','追光','标准','纯电','陕西','西安','XA004','门店',DATE'2025-08-08',DATE'2025-08-15',289800.00,3000.00,5,'u_6e6e6','已交付',5,TIMESTAMP'2025-08-15 13:50:00',TIMESTAMP'2025-08-15 13:50:00'),
('RT202508010010','LVT0000000000010','FREE','标准','增程','江苏','南京','NJ007','大客户',DATE'2025-08-09',DATE'2025-08-16',319800.00,4000.00,5,'u_9912a','已交付',6,TIMESTAMP'2025-08-16 08:45:00',TIMESTAMP'2025-08-16 08:45:00'),
('RT202508010011','LVT0000000000011','梦想家','旗舰','纯电','湖北','武汉','WH001','门店',DATE'2025-08-10',DATE'2025-08-18',409800.00,15000.00,6,'u_13fa0','已交付',4,TIMESTAMP'2025-08-18 17:20:00',TIMESTAMP'2025-08-18 17:20:00'),
('RT202508010012','LVT0000000000012','追光','长续航','纯电','浙江','杭州','HZ003','电商',DATE'2025-08-11',DATE'2025-08-19',319800.00,5000.00,5,'u_7bd31','已交付',4,TIMESTAMP'2025-08-19 10:10:10',TIMESTAMP'2025-08-19 10:10:10');

SELECT * FROM vehicle_sales_df;

3、进入「数据资产-数据质量-规则任务配置」中, 为该表配置监控规则, 监控规则为「完整性校验-单表」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 点击「新建报告」按钮 | 弹出「新建报告」弹窗 |
| 3 | 「报告名称」输入非空不重名字符${name}「生成样式」选择质检式「规则范围」选择“完整性”「数据源」「数据库」「数据表」依次选择到Hive表vehicle_sales_df「报告周期」选择「一次性」「数据周期」选择${当天日期}~${当天日期}展示结果保持默认选项「展示最新结果」「是否需要车辆信息」保持默认“是” | 配置成功 |
| 4 | 点击「确定」 | 1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录 |
| 5 | 点击「已生成报告」 | 1) 「已生成报告」列表中新增一条「数据周期」在T~T, 且「报告状态」为待生成的报告记录2) 等待一段时间后, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期 时间}3) 操作中的按钮由置灰状态变更为可点击状态 |
| 6 | 点击「报告详情」 | 跳转到质量报告详情页面:1) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录2) 报告详情中统计的是${当天日期}内运行完成的所有任务实例的结果信息 |
| 7 | 进入【数据资产】-【数据质量】-【规则任务配置】页面 | 进入成功 |
| 8 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 进入成功 |
| 9 | 配置「数据源」「数据库」「数据表」等信息，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 10 | 「校验类型」选择「字段级」「字段」选择「retail_status」「统计函数」 选择「字段值校验」「期望值」选择「包含」「已交付」「过滤条件」 输入「mileage_km<=5」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 11 | 点击「保存」按钮 | 规则配置保存正确 |
| 12 | 点击「下一步」，配置「调度属性」:「报告名称」保持默认名称「报告类型」保持默认「质检式」「报告统计规则范围」默认选择「全部」「报告周期」选择「一次性」「数据周期」选择「${当天日期}~${当天日期}」「结果展示」 选择「展示最新结果」「是否需要车辆信息」选择「是」 | 调度属性配置完成 |
| 13 | 点击「完成」按钮 | 规则保存成功 |
| 14 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 1) 进入成功 2) 「已配置报告」中新增一条报告类型为「单表报告」的记录 3) 「已生成报告」列表中新增一条「数据周期」在T~T, 且「报告状态」为待生成的报告记录 4) 等待一段时间后, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期 时间}5) 操作中的按钮由置灰状态变更为可点击状态 |
| 15 | 点击「报告详情」 | 跳转到质量报告详情页面: 1) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录 2) 报告详情中统计的是${当天日期}内运行完成的所有任务实例的结果信息 |

##### 【P1】验证「已配置报告」-质量报告编辑功能正常

> 前置条件

```
已在离线平台中创建Hive表: vehicle_sales_df

1、进入离线平台-数据开发-周期任务界面
2、右键任务开发目录, 新建HiveSQL任务, 并临时运行以下SQL语句后, 保存并提交.

DROP TABLE IF EXISTS vehicle_sales_df;
CREATE TABLE vehicle_sales_df (
  sale_id        STRING  COMMENT '零售单号，业务唯一',
  vin            STRING  COMMENT '17位VIN',
  model          STRING  COMMENT '车型：FREE/梦想家/追光',
  trim           STRING  COMMENT '配置：标准/长续航/四驱旗舰等',
  energy_type    STRING  COMMENT '能源：增程/纯电',
  province       STRING  COMMENT '省份',
  city           STRING  COMMENT '城市',
  dealer_code    STRING  COMMENT '经销商编码',
  channel        STRING  COMMENT '渠道：门店/电商/大客户',
  order_date     DATE    COMMENT '下单日期',
  deliver_date   DATE    COMMENT '交付日期',
  invoice_amount DECIMAL(12,2) COMMENT '开票金额(含税)',
  subsidy_amount DECIMAL(12,2) COMMENT '补贴金额(可为空)',
  warranty_years INT     COMMENT '质保年限',
  owner_hash     STRING  COMMENT '脱敏用户ID(哈希)',
  retail_status  STRING  COMMENT '已交付/已退车/已取消',
  mileage_km     INT     COMMENT '交付里程(km)',
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
)
PARTITIONED BY (part_month STRING COMMENT 'yyyy-MM')
STORED AS ORC;

INSERT INTO vehicle_sales_df PARTITION (part_month='2025-08') VALUES
('RT202508010001','LVT0000000000001','FREE','四驱旗舰','增程','湖北','武汉','WH001','门店',DATE'2025-08-01',DATE'2025-08-05',339800.00,10000.00,5,'u_7a9f1','已交付',12,TIMESTAMP'2025-08-05 10:20:00',TIMESTAMP'2025-08-05 10:20:00'),
('RT202508010002','LVT0000000000002','梦想家','长续航','纯电','广东','深圳','SZ011','电商',DATE'2025-08-02',DATE'2025-08-06',369800.00,8000.00,6,'u_51b2c','已交付',10,TIMESTAMP'2025-08-06 12:01:00',TIMESTAMP'2025-08-06 12:01:00'),
('RT202508010003','LVT0000000000003','追光','标准','纯电','上海','上海','SH008','门店',DATE'2025-08-03',DATE'2025-08-08',289800.00,NULL,5,'u_c103f','已交付',9,TIMESTAMP'2025-08-08 09:00:00',TIMESTAMP'2025-08-08 09:00:00'),
('RT202508010004','LVT0000000000004','FREE','标准','增程','四川','成都','CD006','门店',DATE'2025-08-03',DATE'2025-08-09',319800.00,5000.00,5,'u_8ab33','已退车',15,TIMESTAMP'2025-08-09 14:30:00',TIMESTAMP'2025-08-20 10:00:00'),
('RT202508010005','LVT0000000000005','梦想家','旗舰','纯电','浙江','杭州','HZ003','大客户',DATE'2025-08-04',DATE'2025-08-10',399800.00,12000.00,6,'u_77dd2','已交付',8,TIMESTAMP'2025-08-10 16:10:00',TIMESTAMP'2025-08-10 16:10:00'),
('RT202508010006','LVT0000000000006','追光','长续航','纯电','广东','广州','GZ002','门店',DATE'2025-08-05',DATE'2025-08-12',309800.00,6000.00,5,'u_19aa1','已交付',7,TIMESTAMP'2025-08-12 11:11:11',TIMESTAMP'2025-08-12 11:11:11'),
('RT202508010007','LVT0000000000007','FREE','四驱旗舰','增程','北京','北京','BJ001','门店',DATE'2025-08-06',DATE'2025-08-13',349800.00,9000.00,5,'u_abc91','已交付',6,TIMESTAMP'2025-08-13 10:00:00',TIMESTAMP'2025-08-13 10:00:00'),
('RT202508010008','LVT0000000000008','梦想家','标准','纯电','重庆','重庆','CQ005','电商',DATE'2025-08-07',NULL,359800.00,7000.00,6,'u_0fedc','已取消',0,TIMESTAMP'2025-08-07 09:30:00',TIMESTAMP'2025-08-07 09:30:00'),
('RT202508010009','LVT0000000000009','追光','标准','纯电','陕西','西安','XA004','门店',DATE'2025-08-08',DATE'2025-08-15',289800.00,3000.00,5,'u_6e6e6','已交付',5,TIMESTAMP'2025-08-15 13:50:00',TIMESTAMP'2025-08-15 13:50:00'),
('RT202508010010','LVT0000000000010','FREE','标准','增程','江苏','南京','NJ007','大客户',DATE'2025-08-09',DATE'2025-08-16',319800.00,4000.00,5,'u_9912a','已交付',6,TIMESTAMP'2025-08-16 08:45:00',TIMESTAMP'2025-08-16 08:45:00'),
('RT202508010011','LVT0000000000011','梦想家','旗舰','纯电','湖北','武汉','WH001','门店',DATE'2025-08-10',DATE'2025-08-18',409800.00,15000.00,6,'u_13fa0','已交付',4,TIMESTAMP'2025-08-18 17:20:00',TIMESTAMP'2025-08-18 17:20:00'),
('RT202508010012','LVT0000000000012','追光','长续航','纯电','浙江','杭州','HZ003','电商',DATE'2025-08-11',DATE'2025-08-19',319800.00,5000.00,5,'u_7bd31','已交付',4,TIMESTAMP'2025-08-19 10:10:10',TIMESTAMP'2025-08-19 10:10:10');

SELECT * FROM vehicle_sales_df;

3、已配置报告页面已存在一条自定义报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 选择一条「自定义报告」的记录, 点击「编辑」按钮, 修改内容如下: 「报告名称」输入非空不重名字符${name} 「生成样式」选择质检式 「规则范围」保持默认“全部” 「报告周期」选择一次性 「数据周期」选择T-1 ~ T 展示结果选择「展示全部结果」 「是否需要车辆信息」保持默认“是” | 配置成功 |
| 3 | 点击「确定」 | 1) 「编辑报告」表单提交成功, 并有toast提示: 「编辑成功」 2) 「已配置报告」中对应报告记录更新为修改后的内容 |
| 4 | 选择一条「单表报告」的记录, 点击「编辑」按钮, 修改内容如下: 「报告名称」输入非空不重名字符${name} 「生成样式」选择质检式 「规则范围」保持默认“全部” 「报告周期」选择一次性 「数据周期」选择T-1 ~ T 展示结果选择「展示全部结果」 「是否需要车辆信息」保持默认“是” | 配置成功 |
| 5 | 点击「确定」 | 1) 「编辑报告」表单提交成功, 并有toast提示: 「编辑成功」 2) 「已配置报告」中对应报告记录更新为修改后的内容 |

##### 【P1】验证「新建报告」-功能配置正常(自定义调度)

> 前置条件

```
已在离线平台中创建Hive表: vehicle_sales_df

1、进入离线平台-数据开发-周期任务界面
2、 右键任务开发目录, 新建HiveSQL任务, 并临时运行以下SQL语句后, 保存并提交.

DROP TABLE IF EXISTS vehicle_sales_df;
CREATE TABLE vehicle_sales_df (
  sale_id        STRING  COMMENT '零售单号，业务唯一',
  vin            STRING  COMMENT '17位VIN',
  model          STRING  COMMENT '车型：FREE/梦想家/追光',
  trim           STRING  COMMENT '配置：标准/长续航/四驱旗舰等',
  energy_type    STRING  COMMENT '能源：增程/纯电',
  province       STRING  COMMENT '省份',
  city           STRING  COMMENT '城市',
  dealer_code    STRING  COMMENT '经销商编码',
  channel        STRING  COMMENT '渠道：门店/电商/大客户',
  order_date     DATE    COMMENT '下单日期',
  deliver_date   DATE    COMMENT '交付日期',
  invoice_amount DECIMAL(12,2) COMMENT '开票金额(含税)',
  subsidy_amount DECIMAL(12,2) COMMENT '补贴金额(可为空)',
  warranty_years INT     COMMENT '质保年限',
  owner_hash     STRING  COMMENT '脱敏用户ID(哈希)',
  retail_status  STRING  COMMENT '已交付/已退车/已取消',
  mileage_km     INT     COMMENT '交付里程(km)',
  created_at     TIMESTAMP,
  updated_at     TIMESTAMP
)
PARTITIONED BY (part_month STRING COMMENT 'yyyy-MM')
STORED AS ORC;

INSERT INTO vehicle_sales_df PARTITION (part_month='2025-08') VALUES
('RT202508010001','LVT0000000000001','FREE','四驱旗舰','增程','湖北','武汉','WH001','门店',DATE'2025-08-01',DATE'2025-08-05',339800.00,10000.00,5,'u_7a9f1','已交付',12,TIMESTAMP'2025-08-05 10:20:00',TIMESTAMP'2025-08-05 10:20:00'),
('RT202508010002','LVT0000000000002','梦想家','长续航','纯电','广东','深圳','SZ011','电商',DATE'2025-08-02',DATE'2025-08-06',369800.00,8000.00,6,'u_51b2c','已交付',10,TIMESTAMP'2025-08-06 12:01:00',TIMESTAMP'2025-08-06 12:01:00'),
('RT202508010003','LVT0000000000003','追光','标准','纯电','上海','上海','SH008','门店',DATE'2025-08-03',DATE'2025-08-08',289800.00,NULL,5,'u_c103f','已交付',9,TIMESTAMP'2025-08-08 09:00:00',TIMESTAMP'2025-08-08 09:00:00'),
('RT202508010004','LVT0000000000004','FREE','标准','增程','四川','成都','CD006','门店',DATE'2025-08-03',DATE'2025-08-09',319800.00,5000.00,5,'u_8ab33','已退车',15,TIMESTAMP'2025-08-09 14:30:00',TIMESTAMP'2025-08-20 10:00:00'),
('RT202508010005','LVT0000000000005','梦想家','旗舰','纯电','浙江','杭州','HZ003','大客户',DATE'2025-08-04',DATE'2025-08-10',399800.00,12000.00,6,'u_77dd2','已交付',8,TIMESTAMP'2025-08-10 16:10:00',TIMESTAMP'2025-08-10 16:10:00'),
('RT202508010006','LVT0000000000006','追光','长续航','纯电','广东','广州','GZ002','门店',DATE'2025-08-05',DATE'2025-08-12',309800.00,6000.00,5,'u_19aa1','已交付',7,TIMESTAMP'2025-08-12 11:11:11',TIMESTAMP'2025-08-12 11:11:11'),
('RT202508010007','LVT0000000000007','FREE','四驱旗舰','增程','北京','北京','BJ001','门店',DATE'2025-08-06',DATE'2025-08-13',349800.00,9000.00,5,'u_abc91','已交付',6,TIMESTAMP'2025-08-13 10:00:00',TIMESTAMP'2025-08-13 10:00:00'),
('RT202508010008','LVT0000000000008','梦想家','标准','纯电','重庆','重庆','CQ005','电商',DATE'2025-08-07',NULL,359800.00,7000.00,6,'u_0fedc','已取消',0,TIMESTAMP'2025-08-07 09:30:00',TIMESTAMP'2025-08-07 09:30:00'),
('RT202508010009','LVT0000000000009','追光','标准','纯电','陕西','西安','XA004','门店',DATE'2025-08-08',DATE'2025-08-15',289800.00,3000.00,5,'u_6e6e6','已交付',5,TIMESTAMP'2025-08-15 13:50:00',TIMESTAMP'2025-08-15 13:50:00'),
('RT202508010010','LVT0000000000010','FREE','标准','增程','江苏','南京','NJ007','大客户',DATE'2025-08-09',DATE'2025-08-16',319800.00,4000.00,5,'u_9912a','已交付',6,TIMESTAMP'2025-08-16 08:45:00',TIMESTAMP'2025-08-16 08:45:00'),
('RT202508010011','LVT0000000000011','梦想家','旗舰','纯电','湖北','武汉','WH001','门店',DATE'2025-08-10',DATE'2025-08-18',409800.00,15000.00,6,'u_13fa0','已交付',4,TIMESTAMP'2025-08-18 17:20:00',TIMESTAMP'2025-08-18 17:20:00'),
('RT202508010012','LVT0000000000012','追光','长续航','纯电','浙江','杭州','HZ003','电商',DATE'2025-08-11',DATE'2025-08-19',319800.00,5000.00,5,'u_7bd31','已交付',4,TIMESTAMP'2025-08-19 10:10:10',TIMESTAMP'2025-08-19 10:10:10');

SELECT * FROM vehicle_sales_df;

3、进入「数据资产-数据质量-规则任务配置」中, 为该表配置监控规则, 监控规则为「完整性校验-单表」

4、进入「控制台-全局配置-自定义调度日期」中, 添加自定义调度日期所需的csv文件, 文件内容如下:

假设当前时间为2025-09-19
```csv
调度日期1. 按yyyyMMdd格式填写2. 日期上限1000个3. 从第二行开始解析
20250901
20250917
20250918
20250919
20250920
20250923
20250924
```

然后设置自定义调度日期名称: 测试自定义调度
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 点击「新建报告」按钮 | 弹出「新建报告」弹窗 |
| 3 | 「报告名称」输入非空不重名字符${name} 「生成样式」选择质检式 「规则范围」选择“完整性” 「数据源」「数据库」「数据表」依次选择到Hive表vehicle_sales_df 「报告周期」选择「自定义调度」, 然后选择「测试自定义调度」 「具体时间」选择00:00 「数据周期」选择「100天前~0天前」 展示结果保持默认选项「展示全部结果」 「是否需要车辆信息」保持默认“是” | 配置成功 |
| 4 | 点击「确定」 | 1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」 2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录 |
| 5 | 点击「已生成报告」 | 1) 「已生成报告」列表中新增「数据周期」在当前日期之后, 但符合自定义调度日期的范围, 且「报告状态」为待生成的报告记录 2) 等到符合1)中的第一个日期后, 0点时, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期时间}, 并且操作中的按钮由置灰状态变更为可点击状态 3) 等到符合1)中的第二个日期后, 0点时, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期时间}, 并且操作中的按钮由置灰状态变更为可点击状态... |
| 6 | 点击「报告详情」 | 跳转到质量报告详情页面: 1) 报告详情「规则校验明细」中的单表规则部分显示三条「完整性检验」的规则记录 2) 报告详情中统计的是报告生成时间之前的100天前~0天前内运行完成的所有任务实例的结果信息 |

##### 【P1】验证「新建报告」-功能配置正常(月)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 点击「新建报告」按钮 | 弹出「新建报告」弹窗 |
| 3 | 「报告名称」输入非空不重名字符${name} 「生成样式」选择质检式 「规则范围」选择“完整性” 「数据源」「数据库」「数据表」依次选择到Spark表car_compare02 「报告周期」选择「月」 「生效日期」「具体时间」保持默认 「选择时间」选择「每月T+1号」 「数据周期」选择每月1号~每月T号 展示结果保持默认选项「展示最新结果」 「是否需要车辆信息」保持默认“是” | 配置成功 |
| 4 | 点击「确定」 | 1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」 2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录 |
| 5 | 点击「已生成报告」 | 1) 「已生成报告」列表中新增一条「数据周期」在当前日期之前的第一个1号~15号之间的日期范围, 且「报告状态」为待生成的报告记录 2) 等到当月T+1的0点时, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期时间} 3) 操作中的按钮由置灰状态变更为可点击状态 |
| 6 | 点击「报告详情」 | 跳转到质量报告详情页面: 1) 展示「车辆数」 2) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录 3) 报告详情中统计的是当前日期之前的第一个1号~15号之间的日期范围运行完成的所有任务实例的结果信息 |

##### 【P1】验证「新建报告」-功能配置正常(周)

> 前置条件

```
1) 已在离线平台中创建Hive/Doris/Spark源的车辆信息表, 创建并执行SparkSQL语句:

DROP TABLE IF EXISTS car_compare02;
CREATE TABLE car_compare02 (
vin STRING COMMENT '车辆唯一识别码',
car_series STRING COMMENT '车系',
car_power STRING COMMENT '动力类型',
car_config STRING COMMENT '车型配置',
car_endurance STRING COMMENT '续航类型',
drive_type STRING COMMENT '驱动形式',
car_equipment STRING COMMENT '车辆配置版本',
is_certific INT COMMENT '是否认证'
)
PARTITIONED BY (delivery_time STRING COMMENT '交付日期，yyyy-MM-dd')
COMMENT '车辆信息表'
STORED AS ORC;

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-01') VALUES
('LDP91C60PE200011','FREE','EV','H53a','常规','四驱','N3',1),
('LDP91C60PE200012','FREE','EV','H53a','常规','四驱','N3',0),
('LDP91C60PE200013','FREE','EREV','H60','常规','四驱','N3',NULL),
('LDP91C60PE200014','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200015','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200016','FREE','EREV','H60','常规','四驱','N5',1),
('LDP91C60PE200017','FREE','EREV','H60','常规','四驱','N5',0),
('LDP91C60PE200018','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200019','FREE','EV','H53a','常规','四驱','N3',NULL),
('LDP91C60PE200020','FREE','EV','H53a','常规','四驱','N3',NULL);

INSERT INTO car_compare02 PARTITION (delivery_time='2025-10-02') VALUES
('LDP91C60PE200021','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200022','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200023','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200024','梦想家','EV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200025','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200026','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200027','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200028','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200029','梦想家','EREV','H60','长续航','四驱','N3',NULL),
('LDP91C60PE200030','梦想家','EREV','H60','长续航','四驱','N3',NULL);

SELECT * FROM car_compare02;

2) 确保「通用配置-报告关联表设置」中已配置车辆数统计字段vin/车系关联字段car_series/车型关联字段car_config/动力类型关联字段car_power
Spark建表语句

DROP TABLE IF EXISTS car_base_table;
CREATE TABLE car_base_table (
vin STRING COMMENT '车辆数统计字段',
car_series STRING COMMENT '车系关联字段',
car_power STRING COMMENT '动力类型关联字段',
car_config STRING COMMENT '车型关联字段'
)COMMENT '车辆维表'
STORED AS ORC;

-- p20250919 分区
INSERT INTO car_base_table VALUES
('LDP91C60PE200001','知音','EV','H60a'),
('LDP91C60PE200002','知音','EV','H60a'),
('LDP91C60PE200004','知音','EV','H60a'),
('LDP91C60PE200003','知音','EREV','H60'),
('LDP91C60PE200005','知音','EREV','H60'),
('LDP91C60PE200006','知音','EV','H60a'),
('LDP91C60PE200007','知音','EV','H60a'),
('LDP91C60PE200008','知音','EREV','H60'),
('LDP91C60PE200009','知音','EREV','H60'),
('LDP91C60PE200010','知音','EREV','H60'),
('LDP91C60PE200011','FREE','EV','H53a'),
('LDP91C60PE200012','FREE','EV','H53a'),
('LDP91C60PE200013','FREE','EREV','H60'),
('LDP91C60PE200014','FREE','EREV','H60'),
('LDP91C60PE200015','FREE','EREV','H60'),
('LDP91C60PE200016','FREE','EREV','H60'),
('LDP91C60PE200017','FREE','EREV','H60'),
('LDP91C60PE200018','FREE','EV','H53a'),
('LDP91C60PE200019','FREE','EV','H53a'),
('LDP91C60PE200020','FREE','EV','H53a'),
('LDP91C60PE200021','梦想家','EREV','H60'),
('LDP91C60PE200022','梦想家','EREV','H60'),
('LDP91C60PE200023','梦想家','EREV','H60'),
('LDP91C60PE200024','梦想家','EV','H60'),
('LDP91C60PE200025','梦想家','EREV','H60'),
('LDP91C60PE200026','梦想家','EREV','H60'),
('LDP91C60PE200027','梦想家','EREV','H60'),
('LDP91C60PE200028','梦想家','EREV','H60'),
('LDP91C60PE200029','梦想家','EREV','H60'),
('LDP91C60PE200030','梦想家','EREV','H60'),
('LDP91C60PE200031','追光','EV','H53a'),
('LDP91C60PE200032','追光','EV','H53a'),
('LDP91C60PE200033','追光','EV','H53a'),
('LDP91C60PE200034','追光','EV','H53a'),
('LDP91C60PE200035','追光','EV','H53a'),
('LDP91C60PE200036','追光','EV','H53a'),
('LDP91C60PE200037','追光','EV','H53a'),
('LDP91C60PE200038','追光','EV','H53a'),
('LDP91C60PE200039','追光','EREV','H53b'),
('LDP91C60PE200040','追光','EREV','H53b');

SELECT * from car_base_table;

报告关联维表设置（hive）中将car_base_table表设置为spark的关联维表

3)在「已配置报告」中新建报告, 规则范围默认「全部」, 并配置car_compare02表, 确保 「已生成报告」中存在该报告记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 进入成功 |
| 2 | 点击「新建报告」按钮 | 弹出「新建报告」弹窗 |
| 3 | 「报告名称」输入非空不重名字符${name} 「生成样式」选择质检式 「规则范围」选择“完整性” 「数据源」「数据库」「数据表」依次选择到Hive表car_compare02 「报告周期」选择「周」 「生效日期」「具体时间」保持默认 「选择时间」选择「星期六」 「数据周期」选择每周一~每周五 展示结果保持默认选项「展示最新结果」 「是否需要车辆信息」保持默认“是” | 配置成功 |
| 4 | 点击「确定」 | 1) 「新建报告」表单提交成功, 并有toast提示: 「新增成功」 2) 「已配置报告」中新增一条报告类型为「自定义报告」的记录 |
| 5 | 点击「已生成报告」 | 1) 「已生成报告」列表中新增一条「数据周期」在当前日期之前的第一个周一~周五之间的日期范围, 且「报告状态」为待生成的报告记录 2) 等到T+1之后的第一个周六0点, 状态由「待生成」>「生成中」>「已生成」,并更新「生成时间」为${当前日期时间} 3) 操作中的按钮由置灰状态变更为可点击状态 |
| 6 | 点击「报告详情」 | 跳转到质量报告详情页面: 1) 展示「车辆数」 2) 报告详情「规则校验明细」中的单表规则部分显示一条「完整性检验」且最后校验时间为当前时间的规则记录 3) 报告详情中统计的是当前日期之前的第一个周一~周五的时间范围中运行完成的所有任务实例的结果信息 |

##### 【P1】验证「已配置报告」-数据表筛选

> 前置条件

```
已存在来自不同数据表的配置
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 在「数据表」输入关键字${table}, 回车或点击「查询」 | 1) 输入前: 输入框置灰提示「请输入数据表搜索」 2)输入后: 显示「关联数据表」包含${table}的记录 |
| 3 | 点击「重置」 | 显示全部记录 |

##### 【P1】验证「已配置报告」-报告名称筛选

> 前置条件

```
已存在≥3条不同名称的配置
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【质量报告】页面 | 成功进入「已配置报告」页面 |
| 2 | 在「报告名称」输入关键字${name}, 回车或点击「查询」 | 1) 输入前: 输入框置灰提示「请输入报告名称搜索」2)输入后: 显示「报告名称」包含${name}的记录 |
| 3 | 点击「重置」 | 显示全部记录 |

### 通用配置，报告关联维表设置(#9336)

##### 【P1】「报告关联维表设置Doris」-「车辆数统计字段」字段不存在或不匹配-异常情况验证

> 前置条件

```
已存在Doris维表设置，配置如下：
Doris维表设置如下：
「数据源」选择「Doris」
「schema」 选择「schemaA」
「数据库」选择「databaseA」
「数据表」选择「tableA」
「车辆数统计字段」选择「vin」
「车系关联字段」选择「car_config」
「车型关联字段」选择「car_series」
「动力类型关联字段」选择「car_power」
Doris维表ddl/dml 如下:
create schemaA.databaseA.tableA (
vin string ,
car_series string  ,
car_power string,
car_config string
);
insert into schemaA.databaseA.tableA values
('test1','追光1','EV','H53a'),
('test2','追光2','EV','H53a'),
('test3','追光3','EV','H53a'),
('test4,'追光1','EV','H53a'),
('test5','追光2','EV','H53a'),
('test6','追光3','EV','H53a');
校验规则表ddl/dml 如下:
create tableB (
test_col string ,
name string
);
insert into tableB values
('test1','岚图_追光1'),
('test2','岚图_追光2');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 表中包含总车辆不展示(日志内报错字段名不匹配或不存在) |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 【完整性校验】规则均配置 | 配置完成 |
| 5 | 【报告配置】如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「天」-「每天18点」 「数据周期」选择「前1天～前3天」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置成功 |
| 6 | 保存并立即运行规则 | 任务实例运行完成 |
| 7 | 进入「质量报告」页面查看报告 | 1. 报告上方展示车辆信息汇总模块 |

##### 【P1】「报告关联维表设置Doris」配置全流程校验

> 前置条件

```
平台已引入并授权Doris数据源给当前项目，且Doris数据源存在schemaA/databaseA/tableA
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-数据质量-通用配置页面 | 进入成功 |
| 2 | 选择「报告关联维表设置Doris」 | 选择成功 |
| 3 | hive维表设置如下： 「数据源」选择「Doris」 「schema」选择「schemaA」 「数据库」选择「databaseA」 「数据表」选择「tableA」 「车辆数统计字段」选择「vin」 「车系关联字段」选择「car_config」 「车型关联字段」选择「car_series」 「动力类型关联字段」选择「car_power」 | 配置成功 |
| 4 | 点击保存 | hive维表设置配置成功 |


##### 【P1】「报告关联维表设置Hive」-「车辆数统计字段」字段不存在或不匹配-异常情况验证

> 前置条件

```
已存在hive维表设置，配置如下：
hive维表设置如下：
「数据源」选择「hive」
「数据库」选择「databaseA」
「数据表」选择「tableA」
「车辆数统计字段」选择「vin」
「车系关联字段」选择「car_config」
「车型关联字段」选择「car_series」
「动力类型关联字段」选择「car_power」
hive维表ddl/dml 如下:
create databaseA.tableA (
vin string ,
car_series string  ,
car_power string,
car_config string
);
insert into databaseA.tableA values
('test1','追光1','EV','H53a'),
('test2','追光2','EV','H53a'),
('test3','追光3','EV','H53a'),
('test4,'追光1','EV','H53a'),
('test5','追光2','EV','H53a'),
('test6','追光3','EV','H53a');
校验规则表ddl/dml 如下:
create tableB (
test_col string ,
name string
);
insert into tableB values
('test1','岚图_追光1'),
('test2','岚图_追光2');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-质量-规则任务配置页面 | 进入成功 |
| 2 | 点击「新建监控规则」按钮，进入监控规则配置页面 | 表中包含总车辆不展示(日志内报错字段名不匹配或不存在) |
| 3 | 配置「数据源」「数据库」「数据表」，选择【完整性校验】规则 | 选择成功，展示【完整性校验】规则配置项 |
| 4 | 【完整性校验】规则均配置 | 配置完成 |
| 5 | 【报告配置】如下： 「报告名称」保持默认名称 「报告类型」保持默认「质检式」 「报告统计规则范围」默认选择「全部」 「报告周期」选择「天」-「每天18点」 「数据周期」选择「前1天～前3天」 「结果展示」 选择「展示最新结果」 「是否需要车辆信息」选择「是」 | 报告配置成功 |
| 6 | 保存并立即运行规则 | 任务实例运行完成 |
| 7 | 进入「质量报告」页面查看报告 | 1. 报告上方展示车辆信息汇总模块 |

##### 【P1】「报告关联维表设置Hive」配置全流程校验

> 前置条件

```
平台已引入并授权Hive数据源给当前项目，且HIVE数据源存在databaseA/tableA
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-数据质量-通用配置页面 | 进入成功 |
| 2 | 选择「报告关联维表设置Hive」 | 选择成功 |
| 3 | hive维表设置如下： 「数据源」选择「hive」 「数据库」选择「databaseA」 「数据表」选择「tableA」 「车辆数统计字段」选择「vin」 「车系关联字段」选择「car_config」 「车型关联字段」选择「car_series」 「动力类型关联字段」选择「car_power」 | 配置成功 |
| 4 | 点击保存 | hive维表设置配置成功 |

##### 【P1】验证「数据质量」模块新增「通用配置」一级菜单

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入数据资产-数据质量页面 | 进入成功 |
| 2 | 页面模块UI CHECK | 左侧一级菜单新增「通用配置」 |

## v6.4.4

### 【岚图】优化需求(#9407)

##### 【P1】验证「批量开启检测」功能正确

> 前置条件

```
1. 已存在规则A、B、C且规则均为关闭检测状态
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A、B、C，点击「开启检测」按钮 | 二次提示“请确认是否批量开启检测？” |
| 3 | 点击「取消」 | 不影响规则原始状态 |
| 4 | 点击「确认」 | 规则检测状态均变更为开启检测 |
| 5 | 再次选择规则A、B、C | 「开启检测」按钮置灰，仅能操作「关闭检测」 |
| 6 | 观察第二天规则实例生成记录 | 开启检测后，正常生成实例任务且实例运行结果符合预期 |

##### 【P1】验证「任务实例页面」支持定时刷新功能正确

> 前置条件

```
1. 已存在质量校验规则A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，点击「立即运行」按钮 | 生成实例成功 |
| 3 | 点击「任务实例查询」 | 进入「任务实例查询」页面 |
| 4 | 查看页面刷新接口 | 默认一分钟刷新一次 |
| 5 | 变更配置，设置默认刷新时间为10S，重启服务，再次查看 | 修改成功，接口10s刷新一次 |

##### 【P1】验证自定义正则内容支持在规则详情页面查看

> 前置条件

```
1. 已存在有效性校验规则A
2. 已存在自定义规则rule(^[1-9]\d*$)、rule2(^\d*$)
3. 规则A引用自定义规则rule
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，点击规则名查看规则详情 | 「校验类型」后新增「？」标识 |
| 3 | 选择规则A，点击规则名查看规则详情 | 「校验类型」后新增「？」标识 |
| 4 | 鼠标hover「？」标识处 | 提示具体正则内容“^[1-9]\d*$” |
| 5 | 编辑规则，重新选择自定义正则rule2 | 保存 |
| 6 | 选择规则A，点击规则名查看规则详情 | 提示具体正则内容“^\d*$” |
| 7 | 编辑自定义正则rule2，修改内容为「test」,保存 | 修改自定义正则成功 |
| 8 | 选择规则A，点击规则名查看规则详情 | 提示具体正则内容“^\d*$” |
| 9 | 重新编辑保存规则A后，查看规则详情 | 提示具体正则内容“test“ |



##### 【P1】验证「临时保存」功能正确

> 前置条件

```
1. 数据源中心已添加${datasource}数据源并授权给资产平台

2. 资产平台已引入该数据源，且该数据源下存在${database}数据库-${table}数据表

3. ${table}建表DDL如下
create table if not exists ${table}(id int,name varchar(255),age int);

4. 资产平台${datasource}数据源已授权给当前测试项目
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」页面 | 进入成功 |
| 2 | 点击「规则任务配置」按钮 | 进入「新建监控规则」页面 |
| 3 | 点击「新建监控规则」按钮 | 进入「监控对象」配置页 |
| 4 | 「规则名称」 输入 “test”「选择数据源」 选择 ${datasource}「选择数据库」选择${database}「选择数据表」选择${table}点击「下一步」按钮 | 「监控对象」配置完成，跳转到「监控规则配置」页面 |
| 5 | 「监控规则配置」页面添加校验规则，点击「下一步」按钮 | 校验规则添加成功，跳转到「调度属性配置」页面 |
| 6 | 「调度配置」配置如下「调度周期」选择「天」「生效日期」选择「2025-10-21~2125-10-21」「具体时间」选择「00:00」「规则拼接包」 输入「1」「资源组」选择「default」「报告配置」选择「无需生成报告」点击「临时保存」按钮 | 退出到「规则任务配置」页面 |
| 7 | 点击「规则名称-表名」查看规则详情 | 中间态规则不支持点击查看规则详情 |
| 8 | 查看规则「执行周期」「规则状态」「是否关联任务」字段值 | 中间态规则当前字段均展示“--” |
| 9 | 选择当前规则，点击「编辑」按钮 | 进入「调度属性页面」，原配置保留成功 |
| 10 | 编辑 「调度配置」配置如下「调度周期」选择「天」「生效日期」选择「2025-10-21~2025-10-21」「具体时间」选择「12:00」「规则拼接包」 输入「1」「资源组」选择「default」「报告配置」选择「无需生成报告」点击「临时保存」按钮 | 编辑规则调度属性成功 |
| 11 | 点击「临时保存」按钮后，再次编辑查看 | 「调度属性」更新正确 |

### 【岚图】新增功能权限点说明(#9408)

##### 【P1】验证「质量报告」页面权限控制功能正确

> 前置条件

```
1. 当前租户下已存在A、B、C三个用户(租户中心添加)
2. A、B、C三个用户均添加至质量项目并分配角色
3. A->管理员 B->数据开发 C->访客
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用A用户登陆，并进入资产项目 | 进入成功 |
| 2 | 进入「数据质量」-「质量报告」页面 | 进入页面成功，可查看并操作质量报告相关内容相关内容 |
| 3 | 使用B用户登陆，并进入资产项目 | 进入成功 |
| 4 | 进入「数据质量」-「质量报告」页面 | 进入页面成功，可查看并操作质量报告相关内容相关内容 |
| 5 | 使用C用户登陆，并进入资产项目 | 进入成功 |
| 6 | 进入「数据质量」-「质量报告」页面 | 进入页面成功，可查看但不可操作质量报告相关内容相关内容 |

##### 【P1】验证「任务实例查询」页面权限控制功能正确

> 前置条件

```
1. 当前租户下已存在A、B、C三个用户(租户中心添加)
2. A、B、C三个用户均添加至质量项目并分配角色
3. A->管理员 B->数据开发 C->访客
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用A用户登陆，并进入资产项目 | 进入成功 |
| 2 | 进入「数据质量」-「任务实例查询」页面 | 进入页面成功，可查看并操作任务实例相关内容 |
| 3 | 使用B用户登陆，并进入资产项目 | 进入成功 |
| 4 | 进入「数据质量」-「任务实例查询」页面 | 进入页面成功，可查看并操作任务实例相关内容 |
| 5 | 使用C用户登陆，并进入资产项目 | 进入成功 |
| 6 | 进入「数据质量」-「任务实例查询」页面 | 进入页面成功，可查看但不可操作任务实例相关内容 |

##### 【P1】验证「规则任务配置」页面权限控制功能正确

> 前置条件

```
1. 当前租户下已存在A、B、C三个用户(租户中心添加)
2. A、B、C三个用户均添加至质量项目并分配角色
3. A->管理员 B->数据开发 C->访客
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 使用A用户登陆，并进入资产项目 | 进入成功 |
| 2 | 进入「数据质量」-「规则任务配置」页面 | 进入页面成功，可查看并操作任务配置相关内容 |
| 3 | 使用B用户登陆，并进入资产项目 | 进入成功 |
| 4 | 进入「数据质量」-「规则任务配置」页面 | 进入页面成功，可查看并操作任务配置相关内容 |
| 5 | 使用C用户登陆，并进入资产项目 | 进入成功 |
| 6 | 进入「数据质量」-「规则任务配置」页面 | 进入页面成功，可查看但不可操作任务配置相关内容 |

### 【岚图】质量内置规则库管理(#9410)

##### 【P1】验证「格式-自定义正则-xxx(规则名称)」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-自定义正则-xxx(规则名称)」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合xxx(规则名称)的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-自定义正则-xxx(规则名称)」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-自定义正则-xxx(规则名称)」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-自定义正则」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-自定义正则-xxx(规则名称)」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);

INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-自定义正则-xxx(规则名称)」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合xxx(规则名称)的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-自定义正则-xxx(规则名称)」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-自定义正则-xxx(规则名称)」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-自定义正则」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-日期格式datetime，占比」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下
CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);
INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式datetime，占比」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式datetime格式的占比，可配置符合格式占比>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式datetime，占比」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式datetime，占比」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式datetime」「校验格式」选择「占比」「期望值」 <10%「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |

##### 【P1】验证「格式-日期格式datetime，固定值」规则功能正确

> 前置条件

```
1. 已存在doris数据源
2. 数据源下存在database.tableA
3. tableA DDL/DML如下

CREATE TABLE IF NOT EXISTS database.tableA (
id BIGINT NOT NULL COMMENT '学生ID',
course_name VARCHAR(64) NOT NULL COMMENT '课程名称',
score DECIMAL(4,1) COMMENT '成绩',
exam_date DATE NOT NULL COMMENT '考试日期'
)
ENGINE=OLAP
DUPLICATE KEY(id, exam_date)
PARTITION BY RANGE (exam_date) (
PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
PARTITION p202404 VALUES LESS THAN ('2024-05-01')
)
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“);

INSERT INTO database.tableA (id, course_name, score, exam_date)
VALUES
(1, '数学', 85.5, '2024-03-15'),
(2, '英语', 92.0, '2024-03-15'),
(3, '英语', 78.0, '2024-04-20');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 查看规则 | 1. 「规则名称」展示为「格式校验」2. 「规则解释」展示为「格式-日期格式datetime，固定值」3. 「规则分类」展示为「有效性」4. 「关联范围」展示为「字段级」5. 「关联规则数」展示为「XX」6. 「规则状态」展示为「开启」7. 「规则描述」展示为「校验字段值符合日期格式date格式的数量，可配置符合格式个数>/>=/</<=/=/!=某个数值。」 |
| 3 | 「规则状态」变更为「关闭」状态 | 变更成功 |
| 4 | 点击「规则任务配置」-「新增监控规则」 | 进入规则配置「监控对象」页面 |
| 5 | 「监控对象」配置「数据源」「数据库」「数据表」「输入分区」 选择「选择已有分区」-“exam_date=2024-03-15“「监控规则」配置「有效性校验」-「统计函数-格式校验」 查看「校验方法」 | 不展示「格式-日期格式datetime，固定值」 |
| 6 | 「规则状态」变更为「开启」状态 | 变更成功 |
| 7 | 再次查看「监控规则」下的「校验方法」 | 展示「格式-日期格式datetime，固定值」 |
| 8 | 「字段」选择「id」「统计规则」 选择「格式校验-日期格式datetime」「校验格式」选择「固定值」「期望值」 <10「过滤条件」 输入「id < 100」「强弱规则」选择「弱规则」「规则描述」输入「测试规则」 | 配置完成 |
| 9 | 保存规则，且「调度属性」中配置「规则报告」为最新结果 | 保存成功 |
| 10 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |
| 11 | 「内置规则」-「规则状态」变更为「关闭」状态 | 关联规则数不为0，不支持关闭 |


##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「统计性校验」 |
| 4 | 在「内置规则」中开启任一「统计性」-「统计函数」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「统计性校验」规则，选择「统计函数」，点击「校验方法」下拉框 | 展示「统计性」-「校验方法」-「异常值检测，IQR离群点数量」「异常值检测，IQR离群点占比」「异常值检测，Z- score置信区间」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「统计性」-「统计函数」-「异常值检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「统计性校验」选项 |
| 4 | 在「内置规则」中开启任一「统计性」-「统计函数」-「异常值检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「统计性校验」规则，点击「统计函数」下拉框 | 展示「统计性」-「统计函数」-「异常值检测」可选项 |


##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，选择「字段」，点击「统计规则」下拉框 | 不展示「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |
| 4 | 在「内置规则」中开启任一「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，选择「字段」，点击「统计规则」下拉框 | 展示「有效性」-「校验方法」-「占比」「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「有效性校验」选项 |
| 4 | 在「内置规则」中开启任一「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「有效性校验」规则，点击「统计函数」下拉框 | 展示「有效性」-「统计函数」-「数值取值范围」「数值枚举个数」「格式校验」「字段长度」「数据精度」「枚举值」「NULL值检测」「重复值检测」可选项 |


##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |
| 4 | 在「内置规则」中开启任一「唯一性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 不展示「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，点击「添加规则」下拉框 | 不展示「唯一性校验」可选项 |
| 4 | 在「内置规则」中开启任一「唯一性」-「统计函数」-「重复数」「重复率」「多表唯一性判断」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「唯一性校验」规则，点击「统计函数」下拉框 | 展示「统计函数」-「重复数」「重复率」「多表唯一性判断」可选项 |


##### 【P1】验证「校验方法」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 「规则类型」只展示「字段」，「统计函数」下拉框只展示「字段取值校验」 |
| 4 | 在「内置规则」中开启任一「完整性」-「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 展示「校验方法」-「固定值」「1天波动检测」「7天波动检测」「月度波动检测」「7天平均值波动检测」「月度平均值波动检测」可选项 |

##### 【P1】验证「统计函数」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」 | 不展示任何关于「单表」和「字段」可选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，选择「规则类型」为「单表」或「字段」，点击「统计函数」下拉框 | 展示「统计函数」-「空值数」「空值率」「空串数」「空串率」「字段取值范围校验」「表行数」可选项 |


##### 【P1】验证「多表」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「多表」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「多表」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「多表」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「多表」选项 |

##### 【P1】验证「表级」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「表级」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「表级」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「表级」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「表级」选项 |

##### 【P1】验证「字段级」前端交互逻辑正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 将「完整性」-「规则类型」-「字段级」相关规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 不展示「字段级」选项 |
| 4 | 在「内置规则」中开启任一「完整性」-「规则类型」-「字段级」相关规则 | 开启成功 |
| 5 | 进入「规则任务配置」-「监控规则配置页面」，添加「完整性校验」规则，点击「规则类型」下拉框 | 展示「字段级」选项 |

##### 【P1】验证「统计性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有统计性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有统计性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「统计性校验」选项 |

##### 【P1】验证「唯一性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有唯一性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有唯一性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「唯一性校验」选项 |

##### 【P1】验证「有效性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有有效性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有有效性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「有效性校验」选项 |

##### 【P1】验证「完整性」相关规则均未开启时，「监控规则」模块展示正确

> 前置条件

```
所有完整性相关的规则均未关联子规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入页面成功 |
| 2 | 将所有完整性相关的规则均关闭 | 关闭成功 |
| 3 | 进入「规则任务配置」-「监控规则」配置页面 | 进入成功 |
| 4 | 鼠标hover「添加规则」按钮处 | 不展示「完整性校验」选项 |

##### 【P1】验证筛选框联合查询功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 「规则分类」选择「完整性」「有效性」 | 选择成功 |
| 3 | 「关联范围」选择「表级」「字段级」 | 选择成功 |
| 4 | 「规则状态」选择「开启」 | 选择成功 |
| 5 | 联合查询 | 成功筛选出所有状态为开启的「完整性」+「有效性」的「表级」和「字段级」的规则 |

##### 【P1】验证「规则分类」筛选功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「规则分类」筛选框 | 筛选框选项展示「完整性」「唯一性」「有效性」「统计性」 |
| 3 | 选择「完整性」，确认 | 仅展示「完整性」相关规则 |
| 4 | 选择「唯一性」，确认 | 仅展示「唯一性」相关规则 |
| 5 | 选择「有效性」，确认 | 仅展示「有效性」相关规则 |
| 6 | 选择「统计性」，确认 | 仅展示「统计性」相关规则 |
| 7 | 选择「完整性」「统计性」，确认 | 展示「完整性」+「统计性」相关规则 |
| 8 | 选择「唯一性」「有效性」，确认 | 展示「唯一性」+「有效性」相关规则 |
| 9 | 选择「完整性」「唯一性」「有效性」「统计性」，确认 | 展示所有规则 |
| 10 | 全部不勾选，确认 | 展示所有规则 |

##### 【P1】验证「内置规则」页面「导出规则库」功能正确

> 前置条件

```
公共管理页面已配置全局水印并勾选资产产品
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产」-「数据质量」-「规则任务配置」-「规则库配置」页面 | 进入成功 |
| 2 | 点击「导出规则库」按钮 | 提示“请确认是否导出规则库” |
| 3 | 点击“取消” | 提示隐藏，不导出规则库数据 |
| 4 | 点击“确认” | 导出规则库数据，表命名为“内置规则库_currentTime()” |
| 5 | 查看内置规则库内容 | 1. 正确展示所有检测规则明细内容 |
| 6 | 子主题 6 | 2. 水印信息展示正确 |

## v6.4.5

### hive数据源)(#9695)

##### 【P1】验证表元数据已同步-成功-分区字段过滤功能正确

> 前置条件

```
1. 当前表A已同步到数据地图
2. 且当前表A dt/pt 字段为分区字段
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 选择「选择动态分区」，点击「请选择一级分区字段」下拉框 | 仅仅展示分区字段「dt\pt」 |

### 报告支持持续生成(#9693)

##### 【P1】验证「持续生成中报告」状态流程正确

> 前置条件

```
1. 已存在质量周期调度规则任务(小时任务-间隔1小时)

2. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string

)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table1 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 1」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」「生效日期」为「2025-11-20～2025-11-20」「间隔时间」为 「1小时」「开始时间-结束时间」为「00:00:00～15:00:00」「规则拼接包」为「1」「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 第二天10：00查看任务运行状态 | 报告状态展示为「持续生成中」 |
| 6 | 15:00过后再看任务运行状态 | 当前数据周期内的实例均已跑完，报告状态变更为「已生成」(变更时间是定时任务刷新，暂定1小时) |

### 支持抽样检查(#9691)

##### 【P1】验证「抽样检查设置」展示正确

> 前置条件

```
1. 已存在规则A配置「抽样检查设置」
「字段内容去重设置」配置为「age、score」
「过滤条件设置」配置为「手动配置」「age >= 20」
「抽样设置」配置为「绝对数配置」「10」条
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 点击规则A，查看规则A详情信息 | 「基本信息」下展示「抽样检查设置」内容 |
| 3 | 编辑规则A，修改「字段内容去重设置」「过滤条件设置」「抽样设置」，保存规则 | 编辑成功 |
| 4 | 再次点击规则A，查看规则A详情信息 | 「基本信息」下展示「抽样检查设置」编辑后内容 |
| 5 | 编辑规则A，关闭「抽样检查设置」，保存任务 | 保存成功 |
| 6 | 再次点击规则A，查看规则A详情信息 | 「基本信息」下展示「抽样检查设置」，内容为「关闭」 |

### 明细数据下载支持100W条数据(#9697)

##### 【P1】验证「质量报告」详情-明细数据支持下载1万条数据

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string

)USING paimon
tblproperties (
'primary-key' = 'id'
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，配置「规则报告」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 第二天查看报告详情，下载明细数据 | 成功下载脏数据前1w条数据 |

##### 【P1】验证「规则实例」详情-明细数据支持下载100万条数据

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS my_table_sink (
id int,
age string,
name string,
score string,
sex string

)USING paimon
tblproperties (
'primary-key' = 'id'
);
3. 数据表内有200w条数据
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 进入「任务实例查询」页面，查看任务实例详情-明细数据 | 明细数据预览正确 |
| 7 | 点击下载明细数据 | 成功下载脏数据前100w条数据 |

### 质量任务调度支持跟随离线任务调度设置周期(#9692)

##### 【P1】验证质量任务同步需编辑生效功能正确

> 前置条件

```
1. 已存在离线任务A(自定义调度-天任务-每天12:00),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「13:00」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 在离线任务调度后，质量任务能够正常调度 |
| 7 | 编辑离线任务，设置调度周期为小时任务，每隔一个小时运行一次 | 变更成功 |
| 8 | 不编辑规则，等待质量调度 | 质量任务调度时刻仍为之前的时刻 |
| 9 | 编辑规则，直接保存 | 保存成功 |
| 10 | 触发离线任务A实例运行 | 质量任务调度时刻调整（根据离线最后一个实例的调度时刻-更新质量任务实例的调度时刻） |


##### 【P1】验证离线「自定义调度周期任务」-质量「天任务」-质量任务运行逻辑正确

> 前置条件

```
1. 已存在离线任务A(自定义调度周期任务-每天12:00),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「13:00」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 在离线任务调度后，质量任务能够正常调度 |
| 7 | 编辑规则，「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「10:00」 | 关联离线任务成功 |
| 8 | 「任务关联」添加离线任务A | 10点时，质量任务不运行，等到12点后离线任务运行完成后质量任务起调； |
| 9 | 触发离线任务A实例运行 |  |

##### 【P1】验证离线「cron表达式任务」-质量「天任务」-质量任务运行逻辑正确

> 前置条件

```
1. 已存在离线任务A(cron表达式任务 每天中午12:00),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「13:00」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 在离线任务调度后，质量任务能够正常调度 |
| 7 | 编辑规则，「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 具体时间为「10:00」 | 编辑成功 |
| 8 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 9 | 触发离线任务A实例运行 | 10点时，质量任务不运行，等到12点后离线任务运行完成后质量任务起调； |

##### 【P1】验证离线「天任务」-质量「月任务」-质量任务运行逻辑正确

> 前置条件

```
1. 已存在离线任务A(天任务),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「月」，「生效日期」选择为「2025-11-01～2025-12-01」，「每月15号」「每月30号」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 质量任务仅在15/30号两天进行实例调度运行，且在离线实例运行过程后执行 |

##### 【P1】验证离线「天任务」-质量「周任务」-质量任务运行逻辑正确

> 前置条件

```
1. 已存在离线任务A(天任务),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「周」，「生效日期」选择为「2025-11-01～2025-12-01」，「周二」「周三」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 周一离线任务实例运行，质量任务实例不运行；周二、周三当天离线任务实例运行完成后质量任务运行 |

##### 【P1】验证离线「天任务」-质量「天任务」-质量任务运行逻辑正确

> 前置条件

```
1. 已存在离线任务A（天任务 每天12:00),已提交至运维中心
2. 校验表结构 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
质量任务A配置如下：
「规则名称」输入「test_rule」
「选择数据源」选择「${DATASOURCE}」
「选择数据库」选择「${DATABASE}」
「选择数据表」选择「${TABLE}」
「监控规则」新增「有效性校验」
「字段」选择「score」
「统计函数」选择「数值取值范围」
「期望值」为「score > 150」
「过滤条件」设置为「id != 100」
「强弱规则」选择为「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 选择规则A，编辑进入「调度属性」配置页面 | 进入成功 |
| 3 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 4 | 「质量任务周期」选择「天」，「生效日期」选择为「2025-11-01～2025-12-01」 | 配置成功 |
| 5 | 「任务关联」添加离线任务A | 关联离线任务成功 |
| 6 | 触发离线任务A实例运行 | 当天离线任务实例运行完成后运行质量校验任务 |

##### 【P1】验证「具体时间」配置项展示逻辑正确

> 前置条件

```
1. 已存在离线任务A(分钟调度),已提交至运维中心
2. 已存在离线任务B(小时调度),已提交至运维中心
3. 已存在离线任务C(天调度),已提交至运维中心
4. 已存在离线任务D(周调度),已提交至运维中心
5. 已存在离线任务E(月调度),已提交至运维中心
6. 已存在离线任务F(cron表达式),已提交至运维中心
7. 已存在离线任务G(自定义调度),已提交至运维中心
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「调度属性」配置页面 | 进入成功 |
| 2 | 「调度周期」选择「手动关联离线任务周期」 | 选择成功 |
| 3 | 任务关联选择关联离线任务A | 调度配置不展示「具体时间」配置项 |
| 4 | 任务关联选择关联离线任务B | 调度配置不展示「具体时间」配置项 |
| 5 | 任务关联选择关联离线任务C | 调度配置不展示「具体时间」配置项 |
| 6 | 任务关联选择关联离线任务D | 调度配置不展示「具体时间」配置项 |
| 7 | 任务关联选择关联离线任务E | 调度配置不展示「具体时间」配置项 |
| 8 | 任务关联选择关联离线任务F | 调度配置展示「具体时间」配置项 |
| 9 | 任务关联选择关联离线任务G | 调度配置展示「具体时间」配置项 |

### 质量关联离线任务支持根据名称匹配自动关联(#9694)

##### 【P1】验证「自动关联」任务覆盖逻辑正确

> 前置条件

```
1. DT_demo租户下存在离线、质量同名项目test_project

2. 离线项目内存在DorisSQL/SparkSQL/HiveSQL任务 table_test并且已提交至运维中心

3. 质量项目内存在Doris/SparkThrift/Hive数据源下的table_test表校验规则

4. table_test DDL、DML如下：
drop table if exists my_table_sink;
create table if not EXISTS my_table_sink (
id int,
name string,
age int,
dt string,
hour string,
ts timestamp(3)
) USING paimon
partitioned by (dt,hour)
tblproperties (
'primary-key' = 'id'
);

INSERT INTO paimon_table VALUES
(1, 'Alice',21, '2025-11-20', '14', TIMESTAMP '2025-11-20 14:30:00.123'),
(2, 'Lily', 22, '2025-11-20', '15', TIMESTAMP '2025-11-20 14:30:00.123'),
(3, 'Bob', 23, '2025-11-21', '14', TIMESTAMP '2025-11-20 14:30:00.123');

5. 已存在「租户A」、「离线项目A」、「离线任务A」(已提交至运维中心)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age <=100 」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 点击下一步，进入「调度属性」配置页面 | 进入成功 |
| 5 | 「调度周期」选择「自动关联离线任务周期」 | 选择成功 |
| 6 | 点击「新增」，选择「租户A」、「离线项目A」、「离线任务A」 | 手动关联任务正确 |
| 7 | 保存规则 | 规则保存成功 |
| 8 | 进入离线平台，对离线任务及其下游进行补数据操作，查看结果 | 离线任务运行后，质量规则任务也成功运行 |
| 9 | 编辑规则，进入「调度属性」编辑页面 | 进入成功 |
| 10 | 「任务关联」处点击「自动关联」按钮 | 成功关联任务table_test并覆盖手动添加的离线任务A |
| 11 | 保存规则 | 规则保存成功 |
| 12 | 进入离线平台，对离线任务A及其下游进行补数据操作，查看结果 | 离线任务正常运行，不运行质量规则(依赖解绑成功) |
| 13 | 进入离线平台，对离线任务table_test进行补数据操作，查看结果 | 离线任务运行后，质量规则任务也成功运行 |

##### 【P1】验证「自动关联」血缘解析任务关联逻辑正确

> 前置条件

```
1. 当前校验表无法查询到相同项目名称/数据表的任务
2. 当前表已同步至资产数据地图且存在离线任务上游，关系如下
任务A->任务B->table
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age <=100 」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 点击下一步，进入「调度属性」配置页面 | 进入成功 |
| 5 | 「任务关联」处点击「自动关联」按钮 | 成功关联任务B |
| 6 | 保存规则 | 规则保存成功 |
| 7 | 进入离线平台，对离线任务B及下游进行补数据操作，查看结果 | 离线任务运行后，质量规则任务也成功运行 |
| 8 | 进入离线平台，对离线任务A及下游任务进行补数据操作，查看结果 | 离线任务运行后，质量规则任务也成功运行 |

##### 【P1】验证「自动关联」匹配失败-逻辑正确

> 前置条件

```
1. 不存在离线、资产同名称项目
2. 当前测试表不存在离线任务上游
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「age」「统计函数」选择「数值取值范围」「期望值」为「age <=100 」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 点击下一步，进入「调度属性」配置页面 | 进入成功 |
| 5 | 「任务关联」处点击「自动关联」按钮 | 提示“无法自动关联到离线任务，请手动配置” |

### 质量报告取值范围、枚举值不通过场景说明优化(#9696)

##### 【P1】验证「有效性-枚举值」校验不通过时，质量报告文案优化正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table1 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「枚举值」「期望值」为「100,101,102」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 进入「任务实例查询」页面，查看任务实例详情-明细数据 | 明细数据预览正确 |
| 7 | 进入「质量报告」页面查看报告详情信息 | 规则校验不通过说明为“字段枚举值存在约定范围外的值，约定范围外的值的数量总计为2个，不符合规则“枚举值包含xx”” |

##### 【P1】验证「有效性-数值取值范围」校验不通过时，质量报告文案优化正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string
)USING paimon
tblproperties (
'primary-key' = 'id'
);
INSERT INTO table1 VALUES
(1, '11','林大','100','男'),
(2, '12','王二','99','男');
(3, '13','张三','99','男');
(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」「选择数据源」选择「${DATASOURCE}」「选择数据库」选择「${DATABASE}」「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」新增「有效性校验」「字段」选择「score」「统计函数」选择「数值取值范围」「期望值」为「score > 150」「过滤条件」设置为「id != 100」「强弱规则」选择为「弱规则」「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 配置「调度属性」，保存规则 | 规则保存成功 |
| 5 | 临时运行规则 | 规则校验失败 |
| 6 | 进入「任务实例查询」页面，查看任务实例详情-明细数据 | 明细数据预览正确 |
| 7 | 进入「质量报告」页面查看报告详情信息 | 规则校验不通过说明为“存在字段值不符合取值范围区间，不在区间内的数量为4个，不符合规则“取值范围xx” |

## v6.4.6

### 【数据标准】支持dbc标准落标检查(#9918)

##### 【P1】验证验证【标准管理】-【落标检查】-【落标检查结果】批量导出页面

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 切换到【落标检查结果】 | 切换成功 |
| 3 | UI Check | 【落标检查总览】 [请选择导出内容]-检查列表内容/检查列表内容+不达标明细数据 |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查结果】-【查看详情】页面内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 切换到【落标检查结果】 | 切换成功 |
| 3 | 找到测试用数据，点击 [查看详情] 按钮 | 弹出详情页面 |
| 4 | UI Check | 【检查信息】 [数据源][数据库][数据表][字段] 【检查结果】 [检查项][是否达标][检查开始时间][检查结束时间][操作（查看日志/查看详情）] 【关联标准详情】 [标准信息] [版本变更] 以上内容正常显示 |
| 5 | 原型图中【标准管理】-【落标检查】-【落标检查结果】-【查看详情】-【检查结果】无分页栏 | 点击 [检查开始时间] 排序按钮 |
| 6 | 交互测试 |  |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查结果】页面交互

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 切换到【落标检查结果】 | 切换成功 |
| 3 | 输入数据库全称 | 成功输入 |
| 4 | 点击 [查询] 按钮 | 展示数据库名称包含搜索内容的所有落标任务记录 |
| 5 | 输入数据库名称部分 | 成功输入 |
| 6 | 点击 [查询] 按钮 | 展示数据库名称包含搜索内容的所有落标任务记录 |
| 7 | 输入数据表全称 | 成功输入 |
| 8 | 点击 [查询] 按钮 | 展示数据表名称包含搜索内容的所有落标任务记录 |
| 9 | 输入数据表名称部分 | 成功输入 |
| 10 | 点击 [查询] 按钮 | 展示数据表名称包含搜索内容的所有落标任务记录 |
| 11 | 输入字段全称 | 成功输入 |
| 12 | 点击 [查询] 按钮 | 展示使用了名称包含查询内容的字段的所有落标任务记录 |
| 13 | 输入字段名称部分 | 成功输入 |
| 14 | 点击 [查询] 按钮 | 展示使用了名称包含查询内容的字段的所有落标任务记录 |
| 15 | 在数据库/数据表/字段输入框中输入内容，点击 [重置] 按钮 | 所有输入框重置为默认状态 |
| 16 | 组合编辑 [数据库/数据表/字段] 内容，点击 [查询] 按钮 | 展示使用了名称包含 [数据库/数据表/字段] 的所有落标任务记录 |
| 17 | 点击 [导出] 按钮 | 弹出导出选择框，支持选择“检查列表内容/检查列表内容+不达标明细数据” |
| 18 | 点击 [勾选框] （单选/全选） | 全选勾选框成功勾选当前页所有字段，单选勾选框成功勾选选定字段 |
| 19 | 点击 [检查状态] 筛选按钮，选择筛选项 | 支持多选，且在选择了筛选项后，更新【落标检查结果】列表，根据筛选项展示对应落标检查结果 |
| 20 | 点击 [是否达标] 筛选按钮，选择筛选项 | 支持多选，且在选择了筛选项后，更新【落标检查结果】列表，根据筛选项展示对应落标检查结果 |
| 21 | 点击 [检查开始时间] 排序按钮 | 支持按照正序/倒序排列，更新【落标检查结果】列表，根据排序结果展示对应落标检查结果 |
| 22 | 点击 [检查结束时间] 排序按钮 | 支持按照正序/倒序排列，更新【落标检查结果】列表，根据排序结果展示对应落标检查结果 |
| 23 | 组合[所属数据源][所属数据库][检查周期][检查状态][检查开始时间][检查结束时间] 筛选按钮，选择筛选项 | 在选择了筛选项后，更新【落标检查结果】列表，根据组合筛选项展示对应落标检查任务 |
| 24 | 点击 [操作] 列中的 [查询详情] 按钮 | 弹出对应的落标任务结果详情页面 |
| 25 | 点击 [上一页] | 切换 [落标检查结果] 至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化 |
| 26 | 点击 [下一页] | 切换 [落标检查结果] 至下一分页内容，当当前页数为最后一页时无点击动作且鼠标悬浮无变化 |
| 27 | 点击 [页码] | 切换 [落标检查结果] 至选定页码的分页内容 |
| 28 | 点击 [显示条数/页] | 切换20条/页;50条/页;100条/页 |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查结果】页面内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 切换到【落标检查结果】 | 切换成功 |
| 3 | UI Check | 【落标检查总览】 [检查数据表][检查字段总数][达标字段数][标准达标率] 【落标检查结果】 [数据库搜索栏][数据表搜索栏][字段搜索栏][查询按钮][重置按钮][导出按钮] [勾选栏][数据源][数据库][表][字段][检查状态][是否达标][检查开始时间][检查结束时间][操作（查看详情）] [分页栏] 以上内容正常显示 |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【编辑检查任务】-【检查任务详情】页面交互

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 在【落标检查任务】页面找到【test】表，点击【test】 | 弹出【test】表详情页面 |
| 3 | 点击【检查字段列表】-[分页栏]功能 | 点击 [上一页] 切换【检查字段列表】至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化 |
| 4 | 点击【检查结果总览】-[分页栏]功能 | 点击 [上一页] 切换【检查结果总览】至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化 |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【编辑检查任务】-【检查任务详情】页面内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 在【落标检查任务】页面找到【test】表，点击【test】 | 弹出【test】表详情页面 |
| 3 | 【检查范围】 [数据表名称][所属数据库][所属数据源] [检查数据范围][标准来源][车型信息关联字段] 【检查字段列表】 [字段] [分页栏] [检查项]（精度倍数/数据精度/值域范围/数据长度/空值数/重复数） [规则包] 【调度周期】 [检查周期][生效日期][具体时间][告警方式][接收人] 【检查结果总览】 [开始检查时间][结束检查时间][检查字段数][标准达标率][不达标字段数/检查失败数][检查状态] [分页栏] 以上内容正常显示 |  |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【编辑检查任务】-【检查范围】页面交互

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 定位到测试用任务 【test】，点击 [编辑] 按钮 | 进入[检查范围]配置页面 |
| 3 | 点击[选择数据源]下拉框 | 不可编辑 |
| 4 | 点击[数据库]下拉框 | 不可编辑 |
| 5 | 点击[数据表]下拉框 | 不可编辑 |
| 6 | 点击切换[选择分区]单选框 | 当选择到选择已有分区/选择动态分区/手动输入分区时，下方联动出现对应填写内容 |
| 7 | 填写选择分区内容 | 展示树形标准目录，支持多选 |
| 8 | 点击[标准目录]下拉框 | 测试用标准按层级格式填充进选择框 |
| 9 | 选择测试用标准 | 展示所有车系/车型 |
| 10 | 点击[车型关联字段]下拉框 | 所选车型填充进选择框 |
| 11 | 选择测试用车型 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生成任务 |
| 12 | 点击 [取消] 按钮 | 进入[选择字段]配置页面 |
| 13 | 点击 [下一步] 按钮 | 逻辑：字段列表为已经存在绑定了标准的字段列表，若字段无标准绑定，不展示在列表中。针对后续新增绑定标准的字段，是否开启检查默认为不开启，需要在编辑任务的时候开启后才可进行落标检查。 |
| 14 | 点击 [字段名称查询框]，输入查询字段，点击 [搜索] 按钮 | 全选勾选框成功勾选当前页所有字段，单选勾选框成功勾选选定字段 |
| 15 | 点击 [勾选框] （单选/全选） | 点击的记录 [是否开启检查] 按钮成功切换状态 |
| 16 | 点击 [是否开启检查] 按钮 | 逻辑：默认选择全部，支持选择单个/多个检查项，若字段下的标准技术属性项存在未维护的情况，不展示对应的检查项，检查按钮无法开启 |
| 17 | 点击[检查项]下拉框 | 点击 [上一页] 切换 [检查字段列表] 至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化 |
| 18 | 点击 [分页栏] 功能 | 对应记录 [是否开启检查] 状态变更 |
| 19 | 点击 [批量开启/关闭] 按钮 | 提示：“如果检查字段较多，建议设置多个拼接包。系统会根据拼接包数量将若干个字段检查任 务划分至不同的并行任务重运行，每个并行 任务的运行状态不会影响其他任务“ |
| 20 | 鼠标悬浮在 [告警通知] 后的悬浮提示按钮上 | 成功输入 |
| 21 | 点击 [规则包数量] 输入框，输入数值 | 提示“检查任务运行失败时进行通知提醒。（存在一个字段检查失败则进行告警提醒）“ |
| 22 | 鼠标悬浮在 [告警通知] 后的悬浮提示按钮上 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生成任务 |
| 23 | 点击 [取消] 按钮 | 点击临时检查立即生成一条检查 |
| 24 | 点击 [临时检查] 按钮 | 成功进入 [调度配置] 配置页面 |
| 25 | 点击 [下一步] 按钮 | 下拉框中显示所有配置：天/周/月 |
| 26 | 点击[调度周期]下拉框 | 显示日期选择框，可选择开始日期-结束日期，默认为当前日期到后100年，可进行年月日选择维度的切换 |
| 27 | 点击[生效日期]日期框 | 分别选择[时/分] |
| 28 | 点击[具体时间]下拉框 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生产任务 |
| 29 | 点击 [取消] 按钮 | 提示“各个告警通道需要先在控制台配置默认告警 通道，否则配置后无效“ |
| 30 | 鼠标悬浮在 [告警方式] 后的悬浮提示按钮上 | 各选项可点击切换选择状态 |
| 31 | 点击 [告警方式] 选择按钮 | 返回 [选择字段] 配置页面，当前 [调度配置] 页面内容不保存 |
| 32 | 点击 [上一步] 按钮 | 成功新增对应落标检查任务，按照周期配置的生效时间进行检查 |
| 33 | 点击 [新增] 按钮 | 成功新增对应落标检查任务，先执行检查一遍后再按照周期配置生效时间进行检查，更新对应数据，生成检查结果 |
| 34 | 点击 [新增并立即执行] 按钮 |  |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【编辑检查任务】-【检查范围】页面内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 定位到测试用任务 【test】，点击 [编辑] 按钮 | 进入[检查范围]配置页面 |
| 3 | 【检查范围】UI Check | 【检查数据范围】 [选择数据源][数据库][数据表] [选择分区（选择已有分区/选择动态分区/手动输入分区）] 【对标标准】 [标准目录] [车型关联字段] [取消][下一步] 以上内容正常显示 |
| 4 | 【选择字段】UI Check | 【检查数据范围】 [字段名称查询框] [勾选框][字段][是否开启检查] [检查项]（精度倍数/数据精度/值域范围/数据长度/空值数/重复数） [分页栏] [批量开启][批量关闭] 【规则包设置】 [规则包数量下拉框][悬浮提示] [取消][临时检查][下一步] 以上内容正常显示 |
| 5 | 【调度配置】UI Check | 【检查周期】 [调度周期][生效日期][具体时间] 【告警通知】[悬浮提示] [告警方式][悬浮提示]： [短信][邮箱] [钉钉] [自定义告警通道Hep4c6TO] [自定义告警通道saePItOS] [自定义告警通道aGuV4thH] [自定义告警通道EGYugtUm] [自定义告警——企业微信] [中信建投] [标准jar] [取消][上一步][新增][新增并立即执行] 以上内容正常显示 |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【新建检查任务】页面交互

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 在【落标检查任务】页面点击【新建检查任务】按钮 | 进入[检查范围]配置页面 |
| 3 | 点击[选择数据源]下拉框 | 下拉框中显示所有配置的数据源 |
| 4 | 选择测试用数据源 | 填充所选数据源 |
| 5 | 点击[数据库]下拉框 | 根据所选数据源显示对应的数据源 |
| 6 | 选择测试用数据库 | 填充所选数据库 |
| 7 | 点击[数据表]下拉框 | 根据所选数据库显示对应的数据表 |
| 8 | 选择测试用数据表 | 填充所选数据表 |
| 9 | 点击切换[选择分区]单选框 | 当选择到选择已有分区/选择动态分区/手动输入分区时，下方联动出现对应填写内容 |
| 10 | 填写选择分区内容 | 展示树形标准目录，支持多选 |
| 11 | 点击[标准目录]下拉框 | 测试用标准按层级格式填充进选择框 |
| 12 | 选择测试用标准 | 展示所有车系/车型 |
| 13 | 点击[车型关联字段]下拉框 | 所选车型填充进选择框 |
| 14 | 选择测试用车型 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生成任务 |
| 15 | 点击 [取消] 按钮 | 进入[选择字段]配置页面 |
| 16 | 点击 [下一步] 按钮 | 逻辑：字段列表为已经存在绑定了标准的字段列表，若字段无标准绑定，不展示在列表中。针对后续新增绑定标准的字段，是否开启检查默认为不开启，需要在编辑任务的时候开启后才可进行落标检查。 |
| 17 | 点击 [字段名称查询框]，输入查询字段，点击 [搜索] 按钮 | 全选勾选框成功勾选当前页所有字段，单选勾选框成功勾选选定字段 |
| 18 | 点击 [勾选框] （单选/全选） | 点击的记录 [是否开启检查] 按钮成功切换状态 |
| 19 | 点击 [是否开启检查] 按钮 | 逻辑：默认选择全部，支持选择单个/多个检查项，若字段下的标准技术属性项存在未维护的情况，不展示对应的检查项，检查按钮无法开启 |
| 20 | 点击[检查项]下拉框 | 点击 [上一页] 切换 [检查字段列表] 至上一分页内容，当当前页数为1时无点击动作且鼠标悬浮无变化 |
| 21 | 点击 [分页栏] 功能 | 对应记录 [是否开启检查] 状态变更 |
| 22 | 点击 [批量开启/关闭] 按钮 | 提示：“如果检查字段较多，建议设置多个拼接包。系统会根据拼接包数量将若干个字段检查任 务划分至不同的并行任务重运行，每个并行 任务的运行状态不会影响其他任务“ |
| 23 | 鼠标悬浮在 [告警通知] 后的悬浮提示按钮上 | 成功输入 |
| 24 | 点击 [规则包数量] 输入框，输入数值 | 提示“检查任务运行失败时进行通知提醒。（存在一个字段检查失败则进行告警提醒）“ |
| 25 | 鼠标悬浮在 [告警通知] 后的悬浮提示按钮上 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生成任务 |
| 26 | 点击 [取消] 按钮 | 点击临时检查立即生成一条检查 |
| 27 | 点击 [临时检查] 按钮 | 成功进入 [调度配置] 配置页面 |
| 28 | 点击 [下一步] 按钮 | 下拉框中显示所有配置：天/周/月 |
| 29 | 点击[调度周期]下拉框 | 显示日期选择框，可选择开始日期-结束日期，默认为当前日期到后100年，可进行年月日选择维度的切换 |
| 30 | 点击[生效日期]日期框 | 分别选择[时/分] |
| 31 | 点击[具体时间]下拉框 | 返回【标准管理】-【落标检查】-【落标检查任务】页面，不生产任务 |
| 32 | 点击 [取消] 按钮 | 提示“各个告警通道需要先在控制台配置默认告警 通道，否则配置后无效“ |
| 33 | 鼠标悬浮在 [告警方式] 后的悬浮提示按钮上 | 各选项可点击切换选择状态 |
| 34 | 点击 [告警方式] 选择按钮 | 返回 [选择字段] 配置页面，当前 [调度配置] 页面内容不保存 |
| 35 | 点击 [上一步] 按钮 | 成功新增对应落标检查任务，按照周期配置的生效时间进行检查 |
| 36 | 点击 [新增] 按钮 | 成功新增对应落标检查任务，先执行检查一遍后再按照周期配置生效时间进行检查，更新对应数据，生成检查结果 |
| 37 | 点击 [新增并立即执行] 按钮 |  |

##### 【P1】验证【标准管理】-【落标检查】-【落标检查任务】-【新建检查任务】页面内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 在【落标检查任务】页面点击【新建检查任务】按钮 | 进入[检查范围]配置页面 |
| 3 | 【检查范围】UI Check | 【检查数据范围】 [选择数据源][数据库][数据表] [选择分区（选择已有分区/选择动态分区/手动输入分区）] 【对标标准】 [标准目录] [车型关联字段] [取消][下一步] 以上内容正常显示 |
| 4 | 【选择字段】UI Check | 【检查数据范围】 [字段名称查询框] [勾选框][字段][是否开启检查] [检查项]（精度倍数/数据精度/值域范围/数据长度/空值数/重复数） [分页栏] [批量开启][批量关闭] 【规则包设置】 [规则包数量下拉框][悬浮提示] [取消][临时检查][下一步] 以上内容正常显示 |
| 5 | 【调度配置】UI Check | 【检查周期】 [调度周期][生效日期][具体时间] 【告警通知】[悬浮提示] [告警方式][悬浮提示]： [短信][邮箱] [钉钉] [自定义告警通道Hep4c6TO] [自定义告警通道saePItOS] [自定义告警通道aGuV4thH] [自定义告警通道EGYugtUm] [自定义告警——企业微信] [中信建投] [标准jar] [取消][上一步][新增][新增并立即执行] 以上内容正常显示 |

##### 【P1】验证标准达标率、不达标字段数/检查失败数取最新一次任务运行的结果

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 找到【test】表的落标检查，确认为开启检查状态，运行后确认【标准达标率】和【不达标字段数/检查失败数】 | 一周期后数据更新，标准达标率、不达标字段数/检查失败数取最新一次任务运行的结果 |

##### 【P1】验证最近编辑时间，最近检查时间取最新一次任务运行的结果

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【落标检查】页面 | 进入成功 |
| 2 | 找到【test】表的落标检查，确认为开启检查状态，运行后确认最近编辑时间，最近检查时间 | 一周期后数据更新，标准达标率、不达标字段数/检查失败数取最新一次任务运行的结果 |

##### 【P1】验证【落标检查总览】-【标准达标率】逻辑

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据标准】-【标准管理】-【落标检查】 | 成功进入 |
| 2 | 根据统计逻辑，检查【落标检查总览】-【标准达标率】统计结果 | 达标字段/检查字段总数*100%，取两位小数。统计数据准确，符合统计逻辑 |

##### 【P1】验证【落标检查总览】-【达标字段数】逻辑

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据标准】-【标准管理】-【落标检查】 | 成功进入 |
| 2 | 根据统计逻辑，检查【落标检查总览】-【达标字段数】统计结果 | 落标检查的检查项有一项不达标则该字段默认为不达标字段，检查失败字段不计算在达标字段数内。统计数据准确，符合统计逻辑 |

##### 【P1】验证【落标检查总览】-【检查数据字段总数】逻辑

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据标准】-【标准管理】-【落标检查】 | 成功进入 |
| 2 | 根据统计逻辑，检查【落标检查总览】-【检查数据字段总数】统计结果 | 统计数据准确，符合统计逻辑 |

##### 【P1】验证【落标检查总览】-【检查数据表】逻辑

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据标准】-【标准管理】-【落标检查】 | 成功进入 |
| 2 | 根据统计逻辑，检查【落标检查总览】-【检查数据表】统计结果 | 统计数据准确，符合统计逻辑 |


##### 【P1】验证【标准管理】-【标准映射】-【映射记录】超10000条时展示前10000条

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【标准管理】-【标准映射】 | 进入成功 |
| 2 | 找到【test】记录，点击对应的【映射记录】（超10000条记录）按钮 | 弹出[映射记录]详情页面 |
| 3 | UI Check | 在【映射记录】列表中展示了前10000条记录 |

##### 【P1】验证输入[数据库]或[数据源]名称是否会查询到数据库或数据源层面的映射结果

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【标准管理】-【标准映射】 | 进入成功 |
| 2 | 找到【test】记录，点击对应的【映射记录】按钮 | 弹出[映射记录]详情页面 |
| 3 | 在【数据表名称搜索框】中输入【test】库（表中无重名现象），点击放大镜按钮 | 映射记录页面更新，无搜索结果 |

##### 【P1】验证【标准管理】-【标准映射】-【映射目标】支持选择到数据表

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【标准管理】-【标准映射】 | 进入成功 |
| 2 | 点击【标准映射】按钮 | 进入[标准映射]配置页面 |
| 3 | UI Check | 【映射目标】中层级为[数据源类型]-[数据源]-[数据库]-[数据表] |
| 4 | 点击各级选择框 | 弹出可选择的[数据源类型]-[数据源]-[数据库]-[数据表] |

##### 【P1】验证【标准管理】-【标准定义】-【标准上线】提示内容调整

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 找到【test】标准，点击对应【上线按钮】按钮 | 弹出提示框“数据标准上线后，支持在标准映射中选择已上线的标准进行映射” |


##### 【P1】验证【数据标准】-【标准定义】标准进行“下线”操作时页面测试

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 找到【test】标准（该标准已上线且被落标检查任务使用），确认该标准的操作栏 | 该标准操作栏只有“下线”按钮 |
| 3 | 点击【下线】按钮 | 弹出提示框“该数据标准已被引用至0张数据表，下线数据标准数据表中将不再展示字段的标准标签信息，且会同步删除标准映射结果” |
| 4 | 点击提示框【下线】按钮 | 弹出提示框“已有关联标准的字段xxx_xxx、xxx_xxx（表名_字段名）等xx个字段创建了落标检查任务，请先前往落标检查任务关闭字段的检查后再进行标准下线。” |

##### 【P1】验证【数据标准】-【标准定义】标准进行“下线”操作时标准映射、绑定关系均会删除

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 找到【test】标准（该标准已上线且存在标准映射、绑定关系），点击【下线】按钮 | 弹出提示框“该数据标准已被引用至0张数据表，下线数据标准数据表中将不再展示字段的标准标签信息，且会同步删除标准映射结果” |
| 3 | 点击提示框【下线】按钮 | 弹出顶部提示框“申请下线成功，若需查看审批进度可前往【公共管理-审批管理】模块，点击跳转可直接查看审批进度。” |
| 4 | 点击【跳转】完成审批操作后，进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 【test】标准改为“待上线” |
| 5 | 进入【数据标准】-【标准管理】-【标准映射】页面 | 进入成功 |
| 6 | 查找原【test】标准生成的映射记录 | 映射记录已清除，绑定关系同步清除 |


##### 【P1】验证【导入标准】-【重复则覆盖更新】提示按钮“？“的内容

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【导入标准】按钮 | 进入[导入标准]配置页面 |
| 3 | 鼠标悬浮在【重复处理规则】-【重复则覆盖更新】后的“？“上 | 显示““标准英文名称”重复则覆盖更新，若存在车型信息，会将“英文名称+车型”联合判断，重复则覆盖更新” |

##### 【P1】验证【导入标准】文件类型支持提示

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 打开下载的导入模板文件，按规则填写内容，保存为XLSX，XLS类型两份文件 | 进入成功 |
| 2 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入[导入标准]配置页面 |
| 3 | 点击【导入标准】按钮 | 显示“支持XLS、XLSX文件类型” |
| 4 | 查看文件类型支持提示 |  |


##### 【P1】验证【标准管理】-【标准定义】-【新建标准】，【技术属性】-【车系/车系】切换后，复制的【技术属性】中的数据联动切换

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | 业务属性配置如下： [中文名称] 最大功率 [英文名称] Maximum power [英文缩写] MaxP [标准目录] tst [车系/车型]宝马x型/x5；宝马x型/x3；宝马x型/x1M35Li | 【技术属性】配置完成 |
| 4 | 技术属性配置如下： [数据类型] 数值型 [数据长度] <=5 [数据精度] 4/3 [是否允许空值] 否 [是否允许重复] 是 [默认值] 不作填写 [初始值] 不作填写 [无效值] 500 [精度倍数] 1.1 [偏移量] 20 | 【技术属性】配置完成 |
| 5 | 点击【车型】选择框，将【车型】属性改为车型2 | 数据更改成功，【技术属性】版块更新，【是否复制属性】变更为【是否将 车型1 属性粘贴到 车型2 ？】且后置确认按钮，其他内容清空 |
| 6 | 点击【是否将 车型1 属性粘贴到 车型2 ？】框的确认按钮 | 原车型1填写内容填充到了现车型2的配置中 |
| 7 | 点击【保存】按钮 | 弹出提示“数据标准保存成功”，返回【标准定义】页面 |
| 8 | 找到【测试】标准，点击编辑 | 进入【编辑标准】配置页面 |
| 9 | 点击【技术属性】下的【车系/车型】进行切换，确认配置属性是否成功复制并保存 | 成功复制，根据【车型/车系】存在两条配置属性，与复制结果无误 |

##### 【P1】验证【标准管理】-【标准定义】-【技术属性】-【车型/车系】的数据复制功能页面

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | 确认【技术属性】页面 | 在【车型/车系】下【数据类型】上，存在【[勾选框]+“复制车型x数据”】，“车型x”显示为当前配置车型，点击勾选框可进行勾选 |
| 4 | 技术配置配置如下： [车系] 车系1 [车型] 车型1 [是否复制属性] 勾选 [数据类型] 数值型 [数据长度] <=5 [数据精度] 1/1 [是否允许空值] 是 [是否允许重复] 是 [默认值] 1 [取值范围] >1 [枚举列表] 不作调整 | 【新建标准】-[技术配置]配置完成 |
| 5 | 点击【车型】选择框，将【车型】属性改为车型2 | 数据更改成功，【技术属性】版块更新，【是否复制属性】变更为【是否将 车型1 属性粘贴到 车型2 ？】且后置确认按钮，其他内容清空 |
| 6 | 确认【技术属性】页面 | 原【[勾选框]+“复制车型x数据”】变更为【“是否将 车型1 属性粘贴到 车型2 ？”+[确认按钮]】，点击确认按钮可实现数据复制功能 |

##### 【P1】验证【标准管理】-【标准定义】-【导出标准】一条标准根据【车型/车系】存在多条【技术属性】配置时，【导出标准】能正确进行导出

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【导出标准】按钮 | 进入[导出标准]配置页面 |
| 3 | 勾选导出标准（包含一条标准根据【车型/车系】存在多条【技术属性】的情况），点击【确定】按钮 | 自动下载导入模板 |
| 4 | 打开下载文件 | 存在多条记录，且记录内容正确 |
| 5 | 检查导出记录表是否根据【车型/车系】存在多条【技术属性】 |  |

##### 【P1】验证【标准管理】-【标准定义】-【新建标准】，【技术属性】-【车型/车系】切换后，【技术属性】中的数据对应切换

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | 业务属性配置如下： [中文名称] 最大功率 [英文名称] Maximum power [英文缩写] MaxP [标准目录] tst [车系/车型]宝马x型/x5；宝马x型/x3；宝马x型/x1M35Li | 【技术属性】配置完成 |
| 4 | 技术属性配置如下： [数据类型] 数值型 [数据长度] <=5 [数据精度] 4/3 [是否允许空值] 否 [是否允许重复] 是 [默认值] 不作填写 [初始值] 不作填写 [无效值] 500 [精度倍数] 1.1 [偏移量] 20 | 【技术属性】配置完成 |
| 5 | 点击【车型】选择框，将【车型】属性改为车型2 | 数据更改成功，【技术属性】版块更新，【是否复制属性】变更为【是否将 车型1 属性粘贴到 车型2 ？】且后置确认按钮，其他内容清空 |
| 6 | 填写部分内容后，将【车型】属性改为车型1 | 【技术属性】中的数据对应切换 |
| 7 | 点击【保存】按钮 | 弹出提示“数据标准保存成功”，返回【标准定义】页面 |
| 8 | 找到【测试】标准，点击编辑 | 进入【编辑标准】配置页面 |
| 9 | 点击【技术属性】下的【车系/车型】进行切换 | 可根据车型车系查看不同技术属性 |

##### 【P1】验证【标准管理】-【标准定义】扩充配置数据类型及输入限制

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | 业务属性配置如下： [中文名称] 测试 [英文名称] test [标准目录] tst | 【技术属性】配置完成 |
| 4 | 技术属性配置如下： [初始值] 1 [无效值] 123456789 [精度倍数] 1.11 [偏移量] 11111111.11111111 | 【技术属性】配置完成 |
| 5 | 尝试修改技术属性配置如下： [初始值] a [无效值] @ [精度倍数] 啊 [偏移量] K | 无法输入 |

##### 【P1】验证【标准管理】-【标准定义】-【导出标准】配置扩充

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【导出标准】按钮 | 进入[导出标准]配置页面 |
| 3 | 勾选导出标准，点击【确定】按钮 | 自动下载导入模板 |
| 4 | 打开下载文件 | 确认导入模板新增【车型】、【车系】、【初始值】、【无效值】、【精度倍数】、【偏移量】 |
| 5 | 检查表头是否新增【车型】、【车系】、【初始值】、【无效值】、【精度倍数】、【偏移量】 |  |

##### 【P1】验证【标准管理】-【标准定义】-【导入模板】配置扩充

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【导入标准】按钮 | 进入[导入标准]配置页面 |
| 3 | 点击【下载模板】按钮 | 自动下载导入模板 |
| 4 | 打开下载文件 | 必填显示已取消 |
| 5 | 检查表头【英文缩写（不支持大写字母）】是否取消必填显示 | 确认导入模板新增【车型】、【车系】、【初始值】、【无效值】、【精度倍数】、【偏移量】 |
| 6 | 检查表头是否新增【车型】、【车系】、【初始值】、【无效值】、【精度倍数】、【偏移量】 |  |

##### 【P1】验证【标准管理】-【标准定义】-【编辑标准】配置扩充

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 找到列表中的【test】标准，点击【编辑】按钮 | 进入[编辑标准]配置页面 |
| 3 | UI Check | 【业务属性】 新增了【车型/车系】树形目录，最大支持配置20个 【技术属性】下新增了【车系/车型】选择栏，可切换车型/车系查看每个车型下的技术属性配置，新增了【初始值】、【无效值】、【精度倍数】、【偏移量】在【取值范围】后【枚举范围】前 |

##### 【P1】验证【标准管理】-【标准定义】-【标准详情】配置扩充

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击列表中的【test】标准 | 进入[标准详情]页面 |
| 3 | UI Check | 【业务属性】 新增了【车型/车系】树形目录，最大支持配置20个 【技术属性】下新增了【车系/车型】选择栏，可切换车型/车系查看每个车型下的技术属性配置，新增了【初始值】、【无效值】、【精度倍数】、【偏移量】在【取值范围】后【枚举范围】前 |

##### 【P1】验证【标准管理】-【标准定义】-【新建标准】配置扩充

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | UI Check | 【业务属性】 新增了【车型/车系】树形目录，最大支持配置20个（超出提示“车型最大支持配置20个！”） 【技术属性】 新增了【车型/车系】选择栏，点击出现下拉框，对车型或车系进行选择；在【取值范围】后出现【初始值】、【无效值】、【精度倍数】、【偏移量】，四项属性皆为输入框 |

##### 【P1】验证【标准管理】-【标准定义】-【导入模板】必填项标识修改

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【导入标准】按钮 | 进入[导入标准]配置页面 |
| 3 | 点击【下载模板】按钮 | 自动下载导入模板 |
| 4 | 打开下载文件 | 必填显示已取消 |
| 5 | 检查表头【英文缩写（不支持大写字母）】是否取消必填显示 |  |

##### 【P1】验证【标准定义】-【新增/编辑标准】-【英文缩写】必填项标识修改及不作必填项提示

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产】-【数据标准】-【标准管理】-【标准定义】页面 | 进入成功 |
| 2 | 点击【新建标准】按钮 | 进入[新建标准]配置页面 |
| 3 | 业务属性配置如下： [中文名称] 测试 [英文名称] Test_&Box [英文缩写] 不作填写 [标准目录] tst （非必填项不作填写） | [新建标准]配置完成，[英文缩写]字段前无红色“*“（必填项标识），不作填写的情况下焦点离开输入框未提示“请输入名称” |

## v6.4.8

### 【内置规则丰富】合理性，单调递减、单调递增(#10189)

##### 【P1】验证排序字段类型选择其他类型，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1 (
id int,
col1 datetime,
col2 string
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」/「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 保存成功 |
| 4 | 运行规则 | 运行失败，排序字段不是数值型/string类型 |

##### 【P1】验证字段选择其他类型，合理性校验功能

> 前置条件

```
TINYINT、SMALLINT、MEDIUMINT、INT 或 INTEGER、BIGINT、FLOAT、DOUBLE 或 DOUBLE PRECISION、DECIMAL 或 NUMERIC
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择非数值型/string的字段，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」/「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 保存失败，只能选择数值型/string |

##### 【P1】验证字段/排序字段类型为decimal/numeric，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1 (
id DECIMAL(10, 2),        -- DECIMAL类型，总共10位，小数2位
col1 NUMERIC(10, 2),      -- NUMERIC类型，总共10位，小数2位
col2 DECIMAL(8, 4)        -- DECIMAL类型，总共8位，小数4位
);

-- 插入常规测试数据
INSERT INTO table1 (id, col1, col2) VALUES
(-25.50, -30.75, -2.5000),
(0.00, 0.00, 0.0000),
(50.00, 75.25, 1.6180),
(123.45, 456.78, 9.8765)，
(100.50, 200.75, 3.1416),
(9999.99, 8888.88, 0.1234)；
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 6 | 立即运行，查看结果 | 规则校验都不通过 |
| 7 | 查看明细 | 明细正确 |

##### 【P1】验证字段/排序字段类型为double/double precision，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1 (
id DOUBLE,                 -- DOUBLE类型
col1 DOUBLE PRECISION,     -- DOUBLE PRECISION类型
col2 DOUBLE                -- 再一个DOUBLE类型
);

-- 插入测试数据
INSERT INTO table1(id, col1, col2) VALUES
(1.5, 3.141592653589793, 2.718281828459045),
(2.25, 1.414213562373095, 1.618033988749895),
(100.0, 0.000000001, 999999999.999999)
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 6 | 立即运行，查看结果 | col1规则校验通过，col2校验不通过 |
| 7 | 查看明细 | 明细正确 |

##### 【P1】验证字段/排序字段类型为float，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1(
id FLOAT,
col1 FLOAT,
col2 FLOAT(10, 2)         -- 可指定精度
);

-- 插入数据
INSERT INTO table1 (id, col1, col2) VALUES
(1.0, 3.14159, 12345.67),
(2.5, -0.001234, 999.999),
(3.14, 1.23e-5, 1.23e5),
(4.001, 1234567.89, 0.000001),
(5.99, 999.999999, 100.50);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看结果 | 校验不通过 |
| 6 | 查看明细 | 明细正确 |

##### 【P1】验证字段/排序字段类型为bigint，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;

CREATE TABLE IF NOT EXISTS table1 (
id BIGINT,
col1 BIGINT,
col2 BIGINT
);

INSERT INTO table1 (id, col1, col2) VALUES
(1, 9223372036854775807, -9223372036854775808),
(2, 1000000000000000000, 2000000000000000000),
(3, 0, 5000000000000000000);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 6 | 立即运行，查看结果 | 校验不通过 |
| 7 | 查看明细 | 明细正确 |

##### 【P1】验证字段/排序字段类型为int/integer，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1 (
id INT,
col1 INTEGER,
col2 INT
);

INSERT INTO table1 (id, col1, col2) VALUES
(1, 1000000000, 2000000000),
(2, -1000000000, 0),
(3, 2147483647, -2147483648);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 6 | 立即运行，查看结果 | 校验通过 |

##### 【P1】验证字段/排序字段类型为mediumint，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1(
id MEDIUMINT,
col1 MEDIUMINT,
col2 MEDIUMINT
);

INSERT INTO table1 (id, col1, col2) VALUES
(1, 1000000, 6000000),
(2, 3000000, 4000000),
(3, 5000000, 2000000);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看结果 | 校验通过 |

##### 【P1】验证字段/排序字段类型为smallint，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
CREATE TABLE IF NOT EXISTS table1 (
id SMALLINT,
col1 SMALLINT,
col2 SMALLINT
);

-- 插入数据（修正字段名和列数）
INSERT INTO table1 (id, col1, col2) VALUES
(2, 20, 20),
(3, 40, 30),
(4, 30, 40),
(5, 50, 50);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col2」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看结果 | 规则检验不通过 |

##### 【P1】验证字段/排序字段类型为tinyint，合理性校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id tinyint,
col1 tinyint，
col2 tinyint
)

INSERT INTO table1  VALUES
(2, 20,50),
(3, 40,40),
(4, 30,30),
(5, 50,20);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「id」，「统计函数」选择「数据变化趋势」，「选择排序字段」选择「col1」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看结果 | col1字段的规则检验不通过 |
| 6 | 查看明细 | 明细数据展示正确 |

##### 【P1】验证编辑规则-修改合理性校验功能正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1
VALUES
(8, 1000, 8.88, 888.888, 888.88),
(9, 900, 9.99, 999.999, 999.99),
(10, 800, 10.10, 1010.1010, 1010.10);

4、已存在table1的规则：test_rule
存在合理性校验规则：
规则填写：
「字段」选择「int_col」，
「统计函数」选择「数据变化趋势」，
「过滤条件」输入「id<100」
「选择排序字段」选择「id」，
「校验方法」选择「单调递减」
「强弱规则」选择「弱规则」，
「规则描述」输入「合理性校验测试」，点击保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 编辑规则「test_rule」 | 进入编辑页面 |
| 3 | 修改「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行 | 运行成功 |
| 6 | 查看结果 | 校验不通过 |
| 7 | 查看明细 | 明细正确 |

##### 【P1】验证编辑规则-添加合理性校验功能正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1
VALUES
(8, 1000, 8.88, 888.888, 888.88),
(9, 900, 9.99, 999.999, 999.99),
(10, 800, 10.10, 1010.1010, 1010.10);

4、已存在table1的规则：test_rule
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 编辑规则「test_rule」 | 进入编辑页面 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行 | 运行成功 |
| 6 | 查看结果 | 校验通过 |

##### 【P1】验证合理性校验强规则-校验通过生效

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1 (id, int_col, float_col, double_col, decimal_col)
VALUES
(1, 100, 10.10, 111.111, 111.11),
(2, 200, 9.99, 222.222, 222.22),
(3, 300, 8.88, 333.333, 333.33),
(4, 400, 7.77, 444.444, 444.44),
(5, 500, 6.66, 555.555, 555.55),
(6, 600, 5.55, 666.666, 666.66),
(7, 700, 4.44, 777.777, 777.77),
(8, 800, 3.33, 888.888, 888.88),
(9, 900, 2.22, 999.999, 999.99),
(10, 1000, 1.11, 1010.1010, 1010.10);

4、已存在离线任务，hivesql
「租户A」-「离线开发」-「项目A」-「test」
sql为：select 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「float_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「强规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「float_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「强规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「自动关联离线任务」「规则拼接包」为「1」，「资源组」选择「default」，关联离线任务「test」保存规则 | 规则保存成功 |
| 6 | 进入「租户A」-「离线开发」-「项目A」-「运维中心」，对任务test「补当前任务及下游」，查看结果 | 质量任务校验通过，离线任务运行成功 |

##### 【P1】验证合理性校验弱规则-校验不通过生效

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1 (id, int_col, float_col, double_col, decimal_col)
VALUES
(1, 100, 10.10, 111.111, 111.11),
(2, 200, 9.99, 222.222, 222.22),
(3, 300, 8.88, 333.333, 333.33),
(4, 400, 7.77, 444.444, 444.44),
(5, 600, 5.55, 555.555, 555.55),
(6, 500, 6.66, 666.666, 666.66),
(7, 700, 4.44, 777.777, 777.77),
(8, 800, 3.33, 888.888, 888.88),
(9, 900, 2.22, 999.999, 999.99),
(10, 1000, 1.11, 1010.1010, 1010.10);

4、已存在离线任务，hivesql
「租户A」-「离线开发」-「项目A」-「test」
sql为：select 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「double_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「自动关联离线任务」「规则拼接包」为「1」，「资源组」选择「default」，关联离线任务「test」保存规则 | 规则保存成功 |
| 6 | 进入「租户A」-「离线开发」-「项目A」-「运维中心」，对任务test「补当前任务及下游」，查看结果 | 质量任务校验不通过，离线任务运行成功 |

##### 【P1】验证合理性校验弱规则-校验通过生效

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1 (id, int_col, float_col, double_col, decimal_col)
VALUES
(1, 100, 10.10, 111.111, 111.11),
(2, 200, 9.99, 222.222, 222.22),
(3, 300, 8.88, 333.333, 333.33),
(4, 400, 7.77, 444.444, 444.44),
(5, 500, 6.66, 555.555, 555.55),
(6, 600, 5.55, 666.666, 666.66),
(7, 700, 4.44, 777.777, 777.77),
(8, 800, 3.33, 888.888, 888.88),
(9, 900, 2.22, 999.999, 999.99),
(10, 1000, 1.11, 1010.1010, 1010.10);

4、已存在离线任务，hivesql
「租户A」-「离线开发」-「项目A」-「test」
sql为：select 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「float_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「double_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「自动关联离线任务」「规则拼接包」为「1」，「资源组」选择「default」，关联离线任务「test」保存规则 | 规则保存成功 |
| 6 | 进入「租户A」-「离线开发」-「项目A」-「运维中心」，对任务test「补当前任务及下游」，查看结果 | 质量任务校验通过，离线任务运行成功 |

##### 【P1】验证数据表质量报告-单调递减校验结果正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)
INSERT INTO table1 (id, int_col, float_col, double_col, decimal_col)
VALUES
(1, 1000, 10.10, 111.111, 111.11),
(2, 900, 9.99, 222.222, 222.22),
(3, 800, 8.88, 333.333, 333.33),
(4, 700, 7.77, 444.444, 444.44),
(5, 500, 6.66, 555.555, 555.55),
(6, 600, 5.55, 666.666, 666.66),
(7, 400, 4.44, 777.777, 777.77),
(8, 300, 3.33, 888.888, 888.88),
(9, 200, 2.22, 999.999, 999.99),
(10, 100, 1.11, 1010.1010, 1010.10);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 添加「合理性校验」规则，规则填写：「字段」选择「float_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 5 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 6 | 运行后，查看质量报告展示 | 1）规则校验明细列表有字段「规则类型、规则名称、字段名称、字段类型、质检结果、未通过原因、详情说明、操作」2）数据1:「合理性校验」-「数据变化趋势校验」-「int_col」-「int」-「校验不通过」-「数据变化趋势校验未通过」-「在id字段排序下，不符合规则单调递减」-「查看详情」；数据2：「合理性校验」-「数据变化趋势校验」-「float_col」-「int」-「校验通过」-「--」-「在id字段排序下，符合规则单调递减」-「--」； |
| 7 | 点击查看详情 | ？？？？ |

##### 【P1】验证合理性校验-单调递减实例详情正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1
VALUES
(8, 900, 8.88, 888.888, 888.88),
(9, 800, 9.99, 999.999, 999.99),
(10, 1000, 10.10, 1010.1010, 1010.10);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看实例详情 | 合理性校验展示：「字段」：「int_col」，「统计函数」：「数据变化趋势」，「过滤条件」：「id<100」「排序字段」：「id」，「校验方法」：「单调递减」，「强弱规则」：「弱规则」，「规则描述」：「合理性校验测试」 |

##### 【P1】验证合理性校验-单调递减运行-校验不通过功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)
INSERT INTO table1
VALUES
(8, 900, 8.88, 888.888, 888.88),
(9, 800, 9.99, 999.999, 999.99),
(10, 1000, 10.10, 1010.1010, 1010.10);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行 | 运行成功 |
| 6 | 查看结果 | 校验不通过 |

##### 【P1】验证新建单调递减监控规则

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1
VALUES
(8, 800, 8.88, 888.888, 888.88),
(10, 1000, 10.10, 1010.1010, 1010.10),
(9, 900, 9.99, 999.999, 999.99);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递减」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 查看规则详情页 | 详情页展示数据正确 |

##### 【P1】验证合理性校验-单调递增实例详情正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)

INSERT INTO table1
VALUES
(8, 900, 8.88, 888.888, 888.88),
(9, 800, 9.99, 999.999, 999.99),
(10, 1000, 10.10, 1010.1010, 1010.10);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行，查看实例详情 | 合理性校验展示：「字段」：「int_col」，「统计函数」：「数据变化趋势」，「过滤条件」：「id<100」「排序字段」：「id」，「校验方法」：「单调递增」，「强弱规则」：「弱规则」，「规则描述」：「合理性校验测试」 |

##### 【P1】验证合理性校验-单调递增运行-校验不通过功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)
INSERT INTO table1
VALUES
(8, 900, 8.88, 888.888, 888.88),
(9, 800, 9.99, 999.999, 999.99),
(10, 1000, 10.10, 1010.1010, 1010.10);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 立即运行 | 运行成功 |
| 6 | 查看结果 | 校验不通过 |

##### 【P1】验证新建单调递增监控规则

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id BIGINT,
int_col INT,
float_col FLOAT,
double_col DOUBLE,
decimal_col DECIMAL(10, 2)
)
INSERT INTO table1
VALUES
(8, 800, 8.88, 888.888, 888.88),
(10, 1000, 10.10, 1010.1010, 1010.10),
(9, 900, 9.99, 999.999, 999.99);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则，规则填写：「字段」选择「int_col」，「统计函数」选择「数据变化趋势」，「过滤条件」输入「id<100」「选择排序字段」选择「id」，「校验方法」选择「单调递增」「强弱规则」选择「弱规则」，「规则描述」输入「合理性校验测试」，点击保存 | 规则集保存成功 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 查看规则详情页 | 详情页展示数据正确 |

##### 【P1】验证【合理性校验】规则框-校验方法正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则 | 新增合理性校验规则框 |
| 4 | 查看校验方法展示 | 下拉框展示「单调递增」「单调递减」，单选 |

##### 【P1】验证【合理性校验】规则框-选择排序字段正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则 | 新增合理性校验规则框 |
| 4 | 查看选择排序字段展示 | 展示选择表下的所有字段，单选 |

##### 【P1】验证【合理性校验】规则框-统计函数正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则 | 新增合理性校验规则框 |
| 4 | 查看统计函数展示 | 默认展示“数据变化趋势”，下拉框仅有选项“数据变化趋势” |

##### 【P1】验证【合理性校验】规则框-字段正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则 | 新增合理性校验规则框 |
| 4 | 查看字段展示 | 展示选择表下的所有字段，单选 |

##### 【P1】验证【合理性校验】规则框正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 添加「合理性校验」规则 | 新增「合理性校验规则框」，左上角展示“合理性规则”。允许选择「字段、统计函数、过滤条件、选择排序字段、校验方法、强弱规则、规则描述」 |

##### 【P1】验证新增【合理性校验】类型

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 查看右侧「添加规则」 | 新增「合理性校验」 |

### 【内置规则丰富】时效性，及时性，两个字段之间的时间差校验(#10182)

##### 【P1】验证「多字段时间差校验」任务质量报告正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看质量报告 | 页面包含： 1）报告进入目录 2）质量评估汇总（任务名）区域，（数据源、数据库、检测数据范围、表行数、抽样行数、字段数、校验规则数、校验通过率） 3）规则校验明细，（规则类型-时效性校验、规则名称、字段名称、字段类型、质验结果、未通过原因、详情说明-鼠标悬浮展示全部、操作） |

##### 【P1】验证「多字段时间差校验」任务不通过/失败结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看不通过的实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 1）都展示「时效性校验」-「多字段时间差校验」配置的详情； 2）校验未通过的规则支持查看明细 |
| 8 | 点击查看明细 | 1）标题显示为“查看“及时性校验-多字段时间差校验”明细” 2）记录不符合时间差内的数据，列表为全部列数据，配置的校验字段标红展示 |
| 9 | 点击【下载明细】按钮 | 支持下载明细，内容正确 |
| 10 | 点击【表级报告】tab | 包含： 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |
| 11 | 查看运行失败的示例详情 | 1）展示「时效性校验」-「多字段时间差校验」配置的详情； 2）运行失败的规则支持查看日志 |

##### 【P1】验证「多字段时间差校验」任务通过结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「order_date1；order_date2」 「时间差」选择为「<=1秒」 「大小关系」配置为「order_date1>order_date2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 包含「时效性校验」-「多字段时间差校验」配置的详情 |
| 8 | 点击【表级报告】tab | 包含 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |




##### 【P1】验证「字段类型异常」校验功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下：（6个字段组分别为int/varchar/string/decimal/boolean/double类型） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「id1；id2」。「时间差」选择为「<1天」。「大小关系」配置为「id1<id2」 2）「选择对比字段组2」为「user_name1；user_name2」。「时间差」选择为「>=1秒」。「大小关系」配置为「user_name1<user_name2」 3）「选择对比字段组3」为「address1；address2」。「时间差」选择为「>=1秒」。「大小关系」配置为「address1<address2」 4）「选择对比字段组4」为「salary1；salary2」。「时间差」选择为「>=1秒」。「大小关系」配置为「salary1<salary2」 5）「选择对比字段组4」为「is_active1；is_active2」。「时间差」选择为「>=1秒」。「大小关系」配置为「is_active1<is_active2」 6）「选择对比字段组4」为「total_amount1；total_amount2」。「时间差」选择为「>=1秒」。「大小关系」配置为「total_amount1<total_amount2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 仅支持配置时间日期型、string字段，监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 立即执行规则 | 运行失败，日志显示正确失败详情 |

##### 【P1】验证「string转long」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 「选择对比字段组」为「date_str_ymd_hms_ms1；date_str_ymd_hms_ms2」。「时间差」选择为「<1天」。「大小关系」配置为「date_str_ymd_hms_ms1<date_str_ymd_hms_ms2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果不通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「date/datetime/time/timestamp类型」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
COMMENT '时效性校验表';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下：（4个字段组全通过） 「监控规则」新增「时效性校验」 「字段」选择为「id」 「统计函数」选择「及时性校验（多字段时间差校验）」 「过滤条件」设置为「id<100」 1）「选择对比字段组1」为「create_date 1；create_date 2」。「时间差」选择为「>=1天」。「大小关系」配置为「create_date 1<create_date 2」 2）「选择对比字段组2」为「update_datetime 1；update_datetime 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「update_datetime 1<update_datetime 2」 3）「选择对比字段组3」为「work_time 1；work_time 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「work_time 1<work_time 2」 4）「选择对比字段组4」为「sync_timestamp 1；sync_timestamp 2」。「时间差」选择为「>=1秒」。「大小关系」配置为「sync_timestamp 1<sync_timestamp 2」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果为通过，且实例详情展示正确，质量报告展示正确 |



##### 【P1】验证「多字段时间差校验」区域详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「时效性校验」规则 | 选择成功，页面显示「时效性校验」规则配置区域 |
| 4 | 查看配置区域详情 | 包含： 1）「字段」，可选择对应数据表下的所有字段 2）「统计函数」，可选择「及时性校验（多字段时间差校验）」 3）「过滤条件」，可选择「选项配置」、「手动配置」 4）「选择对比字段组」，选择对应数据表下的所有字段，可配置多个对比字段组 5）「时间差」，可配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」 6）「大小关系」，可配置字段1 >/< 字段2 7）可对「对比字段组」进行新增删除操作 8）「强弱规则」，可选择「强/弱规则」 9）「规则描述」，可输入内容 10）「保存」和「取消」按钮 |

### 【内置规则丰富】时效性，周期性，同一个字段的时间差校验(#10181)

##### 【P1】验证「单字段时间差校验」任务质量报告正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「order_date」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「order_date」 「时间差」选择为「<=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看质量报告 | 页面包含： 1）报告进入目录 2）质量评估汇总（任务名）区域，（数据源、数据库、检测数据范围、表行数、抽样行数、字段数、校验规则数、校验通过率） 3）规则校验明细，（规则类型-时效性校验、规则名称、字段名称、字段类型、质验结果、未通过原因、详情说明、操作） |

##### 【P1】验证「单字段时间差校验」任务不通过/失败结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「order_date」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「order_date」 「时间差」选择为「<=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看不通过的实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 1）都展示「时效性校验」-「单字段时间差校验」配置的详情； 2）校验未通过的规则支持查看明细 |
| 8 | 点击查看明细 | 1）标题显示为“查看“周期性校验-单字段时间差校验”明细” 2）记录不符合时间差内的数据，列表为全部列数据，配置的校验字段标红展示 |
| 9 | 点击【下载明细】按钮 | 支持下载明细，内容正确 |
| 10 | 点击【表级报告】tab | 包含： 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |
| 11 | 查看运行失败的示例详情 | 1）都展示「时效性校验」-「单字段时间差校验」配置的详情； 2）运行失败的规则支持查看日志 |

##### 【P1】验证「单字段时间差校验」任务通过结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「order_date」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「order_date」 「时间差」选择为「<=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 包含「时效性校验」-「单字段时间差校验」配置的详情 |
| 8 | 点击【表级报告】tab | 包含 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |




##### 【P1】验证「字段类型异常」校验功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则1」配置如下：（int类型） 「监控规则」新增「时效性校验」 「字段」选择为「 id」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「id」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 「监控规则2」配置如下：（VARCHAR类型） 「监控规则」新增「时效性校验」 「字段」选择为「 user_name」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「user_name」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 5 | 「监控规则3」配置如下：（string类型-不为时间戳） 「监控规则」新增「时效性校验」 「字段」选择为「  address」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 address」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 6 | 「监控规则4」配置如下：（decimal类型） 「监控规则」新增「时效性校验」 「字段」选择为「 salary」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「salary」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 7 | 「监控规则5」配置如下：（boolean类型） 「监控规则」新增「时效性校验」 「字段」选择为「 is_active」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「is_active」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 8 | 「监控规则6」配置如下：（double类型） 「监控规则」新增「时效性校验」 「字段」选择为「 total_amount」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「total_amount」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存失败，提示仅支持配置时间日期型字段 |

##### 【P1】验证「string转long」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 date_str_ymd_hms_ms」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「date_str_ymd_hms_ms」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「timestamp类型」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 sync_timestamp」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 sync_timestamp」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「timestamp类型」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 sync_timestamp」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 sync_timestamp」 「时间差」选择为「>=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「time类型」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 work_time」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 work_time」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「time类型」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 work_time」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 work_time」 「时间差」选择为「>=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「datetime类型」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 update_datetime」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 update_datetime」 「时间差」选择为「=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「datetime类型」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「时效性校验」 「字段」选择为「 update_datetime」 「统计函数」选择「周期性校验（单字段时间差校验）」 「过滤条件」设置为「id<100」 「选择排序字段」为「 update_datetime」 「时间差」选择为「>=1秒」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果符合预期，且实例详情展示正确，质量报告展示正确 |



##### 【P1】验证「单字段时间差校验」区域详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS tableA (
create_date DATE COMMENT '日期类型',
update_datetime DATETIME COMMENT '日期时间类型',
work_time TIME COMMENT '时间类型',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转DATETIME',
date_str_mdy STRING COMMENT '字符串时间(HH:MM:SS)，强转TIME',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name VARCHAR(50) COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10,2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';
INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
-- 第一行数据
(
'2026-02-04',                     -- DATE 类型
'2026-02-04 09:30:15',            -- DATETIME 类型
'08:00:00',                       -- TIME 类型
'2026-02-04 09:30:15',            -- TIMESTAMP 类型
'2026-02-04',                     -- 字符串日期
'2026-02-04 09:30:15',            -- 字符串日期时间
'08:00:00',                       -- 字符串时间
'2026-02-04 09:30:15.123',        -- 带毫秒的字符串
'20260204',                       -- 非标准字符串
1,                                -- INT 类型
'张三',                           -- VARCHAR/STRING 类型
25,                               -- TINYINT 类型
13800138000,                      -- BIGINT 类型
'zhangsan@example.com',           -- STRING 类型
8500.50,                          -- DECIMAL 类型
TRUE,                             -- BOOLEAN 类型
'北京市朝阳区XX路88号',           -- STRING 类型
95.5,                             -- FLOAT 类型
125000.75                         -- DOUBLE 类型
),
-- 第二行数据
(
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30',
'2026-02-05',
'2026-02-05 14:20:30',
'09:15:00',
'2026-02-05 14:20:30.456',
'20260205',
2,
'李四',
30,
13900139000,
'lisi@example.com',
9800.00,
FALSE,
'上海市浦东新区XX街66号',
88.8,
189000.99
),
-- 第三行数据
(
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20',
'2026-02-06',
'2026-02-06 18:45:20',
'10:30:00',
'2026-02-06 18:45:20.789',
'20260206',
3,
'王五',
28,
13700137000,
'wangwu@example.com',
7999.99,
TRUE,
'广州市天河区XX大道99号',
92.0,
98500.50
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「时效性校验」规则 | 选择成功，页面显示「时效性校验」规则配置区域 |
| 4 | 查看配置区域详情 | 包含： 1）「字段」，可选择对应数据表下的所有字段 2）「统计函数」，可选择「周期性校验（单字段时间差校验）」 3）「过滤条件」，可选择「选项配置」、「手动配置」 4）「选择排序字段」，可选择对应数据表下的所有字段 5）「时间差」，可配置「>/</>=/<=/=/!= xx 毫秒/秒/分钟/小时/天」 6）「强弱规则」，可选择「强/弱规则」 7）「规则描述」，可输入内容 8）「上一步」、「临时保存」和「下一步」按钮 |

### 【岚图】【规则集管理】支持每个数据表的规则集管理(#10193)

##### 【P1】验证删除规则集后, 对已配置过历史规则的任务不生效

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 4 | 引入规则包rule01中所有校验规则 | 引入成功, 配置参数正确 |
| 5 | 保存规则任务task01后, 立即执行 | 任务运行成功, 校验结果正确: 校验不通过 |
| 6 | 删除规则集1 | 删除成功 |
| 7 | 重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态 | 任务运行成功, 校验结果正确: 校验不通过 |

##### 【P1】验证编辑规则集后, 对已配置过历史规则的任务不生效

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 4 | 引入规则包rule01中所有校验规则 | 引入成功, 配置参数正确 |
| 5 | 保存规则任务task01后, 立即执行 | 任务运行成功, 校验结果: 校验不通过 |
| 6 | 修改【规则集-规则包rule01】中的校验规则:- 期望值: >= -200 | 配置成功 |
| 7 | 新建规则任务task02并立即执行:1) 监控对象: t2 (与dwd_voyah_vehicle_sales_dates同表结构同数据)2) 监控规则: rule01中的校验规则 | 任务运行成功, 校验结果: 校验通过 |
| 8 | 重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态 | 任务运行成功, 校验结果: 校验不通过 |

##### 【P1】验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入20规则包, 每个包含1个校验规则

1、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

2、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空值数
- 期望值: = 0

3、完整性校验:
- 生效范围: 字段级
- 字段: order_id
- 统计函数: 空值数
- 期望值: = 0

4、完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

5、完整性校验:
- 生效范围: 字段级
- 字段: guide_price
- 统计函数: 空值数
- 期望值: = 0

6、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 空值数
- 期望值: = 0

7、完整性校验:
- 生效范围: 字段级
- 字段: dealer_name
- 统计函数: 空值数
- 期望值: = 0

8、完整性校验:
- 生效范围: 字段级
- 字段: order_status
- 统计函数: 空值数
- 期望值: = 0

9、完整性校验:
- 生效范围: 字段级
- 字段: factory_date
- 统计函数: 空值数
- 期望值: = 0

10、完整性校验:
- 生效范围: 字段级
- 字段: sale_date
- 统计函数: 空值数
- 期望值: = 0

11、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

12、完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

13、完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

14、有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

15、有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0  出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 针对规则 17,19,20: 计算 order_id 重复数        COUNT(1) OVER(PARTITION BY order_id) as calc_order_dup_count,        -- [辅助计算] 针对规则 18: 计算 vin 重复数        COUNT(1) OVER(PARTITION BY vin) as calc_vin_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- =========================================================    -- A. 完整性校验 (规则 1-10: 这里的逻辑是“找出为空或NULL的数据“)    -- =========================================================    -- 规则1: vin 空串    (trim(vin) = '') OR    -- 规则2-10: 各关键字段判空    (vin IS NULL) OR    (order_id IS NULL) OR    (car_model IS NULL) OR    (guide_price IS NULL) OR    (final_price IS NULL) OR    (dealer_name IS NULL) OR    (order_status IS NULL) OR    (factory_date IS NULL) OR    (sale_date IS NULL)    -- =========================================================    -- B. 取值范围与有效性 (规则 11, 14, 15, 16)    -- =========================================================    OR     -- 规则11: final_price < 0    (final_price < 0)        OR    -- 规则14: vin 长度 <= 0 (注: 空串/NULL已被上面捕获，此处兜底)    (length(vin) <= 0)    OR    -- 规则15: guide_price 超出 [0, 1000000] 范围    (guide_price < 0 OR guide_price > 1000000)    OR    -- 规则16: car_model 枚举校验 (假设标准值为3个: FREE, 梦想家, 追光)    -- 如果当前值不在这3个里面，且不是NULL，则视为脏数据    (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- =========================================================    -- C. 唯一性与重复性 (规则 17, 18, 19, 20)    -- =========================================================    OR    -- 规则17,19,20: order_id 出现重复 (统计数 > 1)    (calc_order_dup_count > 1)    OR    -- 规则18: vin 出现重复 (统计数 > 1)    (calc_vin_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 变更分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 10校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入规则包, 包含10个校验规则

完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0  出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 唯一性校验: 计算 order_id 的重复次数        COUNT(1) OVER(PARTITION BY order_id) as order_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- ---------------------------------------------------------    -- 1. 完整性校验 (字段级)    -- ---------------------------------------------------------    -- 规则: vin 空串数=0 (即: 找出 vin 为空串的数据)    (trim(vin) = '')        OR         -- 规则: car_model 空值数=0 (即: 找出 car_model 为 NULL 的数据)    (car_model IS NULL)        OR         -- 规则: final_price 期望值 >= 0 (即: 找出 < 0 的数据)    (final_price < 0)    -- ---------------------------------------------------------    -- 2. 有效性校验    -- ---------------------------------------------------------    -- 规则: vin 字符串长度 > 0 (即: 找出长度 <= 0 或 NULL 的数据)    -- 注: 此规则与上面的“空串数“、“空值数“有重叠，此处做兜底    OR (length(vin) <= 0 OR vin IS NULL)        -- 规则: guide_price 取值范围 [0, 1000000] (即: 找出在此范围之外的数据)    OR (guide_price < 0 OR guide_price > 1000000)        -- 规则: car_model 枚举个数 = 3 (即: 找出不属于这3个标准车型的数据)    -- 假设标准枚举值为: 岚图FREE, 岚图梦想家, 岚图追光    -- 注: NULL值已被前面的完整性校验捕获，此处主要校验“未知枚举值“    OR (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- ---------------------------------------------------------    -- 3. 唯一性校验    -- ---------------------------------------------------------    -- 规则: order_id 重复数/重复率期望为0 (即: 找出重复出现的订单)    OR (order_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)

> 前置条件

```
建表语句如下:
创建两个表: dwd_voyah_sales_time_quality、dwd_voyah_sales_time_quality02
-- =========================================================
-- 1. 建表语句 (DDL)
-- 表名: dwd_voyah_sales_time_quality
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_sales_time_quality;

CREATE TABLE IF NOT EXISTS dwd_voyah_sales_time_quality (
order_id        BIGINT          COMMENT '订单自增ID (用于验证单调递增)',
vin             STRING          COMMENT '车辆识别码',
order_time      TIMESTAMP       COMMENT '下定时间 (基准时间字段)',
payment_time    TIMESTAMP       COMMENT '支付时间 (用于比较行内时间差)',
delivery_status INT             COMMENT '交付状态'
)
COMMENT '岚图汽车销售时效校验表'
PARTITIONED BY (
pt_date         STRING          COMMENT '一级分区: yyyyMMdd',
data_type       STRING          COMMENT '二级分区: normal(正常)/abnormal_xx(异常场景)'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML)
-- =========================================================

-- ---------------------------------------------------------
-- 场景A: [正常数据]
-- 分区: 20260201 / normal
-- 验证通过:
-- 1. payment_time > order_time (行内时间差合理)
-- 2. order_time 相邻行有间隔 (相邻行时间差合理)
-- 3. order_id 随时间推移严格递增 (单调性符合)
-- ---------------------------------------------------------
INSERT INTO TABLE dwd_voyah_sales_time_quality PARTITION (pt_date='20260201', data_type='normal')
VALUES
(10001, 'LTV001', '2026-02-01 10:00:00', '2026-02-01 10:05:00', 1),
(10002, 'LTV002', '2026-02-01 10:10:00', '2026-02-01 10:15:00', 1),
(10003, 'LTV003', '2026-02-01 10:30:00', '2026-02-01 10:35:00', 1),
(10004, 'LTV004', '2026-02-01 11:00:00', '2026-02-01 11:02:00', 1);

-- ---------------------------------------------------------
-- 场景B: [异常数据 - 规则1: 行内字段时间差校验]
-- 分区: 20260202 / abnormal_diff_row
-- 异常点: ID 20002 的支付时间 早于 下定时间 (逻辑错误)
-- ---------------------------------------------------------
INSERT INTO TABLE dwd_voyah_sales_time_quality PARTITION (pt_date='20260202', data_type='abnormal_diff_row')
VALUES
(20001, 'LTV_ERR_01', '2026-02-02 09:00:00', '2026-02-02 09:10:00', 1), -- 正常
(20002, 'LTV_ERR_02', '2026-02-02 09:30:00', '2026-02-02 09:29:59', 1); -- 异常: 支付比下单早1秒

-- ---------------------------------------------------------
-- 场景C: [异常数据 - 规则2: 相邻两行时间差校验]
-- 分区: 20260203 / abnormal_diff_adjacent
-- 异常点: ID 30002 和 30003 的 order_time 完全一致 (时间差为0)
-- 假设规则要求: 订单系统处理能力限制，相邻订单间隔必须 >= 1秒
-- ---------------------------------------------------------
INSERT INTO TABLE dwd_voyah_sales_time_quality PARTITION (pt_date='20260203', data_type='abnormal_diff_adjacent')
VALUES
(30001, 'LTV_GAP_01', '2026-02-03 14:00:00', '2026-02-03 14:05:00', 1),
(30002, 'LTV_GAP_02', '2026-02-03 14:00:05', '2026-02-03 14:10:00', 1),
(30003, 'LTV_GAP_03', '2026-02-03 14:00:05', '2026-02-03 14:12:00', 1); -- 异常: 与上一行时间差为0

-- ---------------------------------------------------------
-- 场景D: [异常数据 - 规则3: 字段单调性校验]
-- 分区: 20260204 / abnormal_monotonicity
-- 异常点: order_id 出现乱序 (40003 在 40002 之前出现)
-- 预期: 按照 order_time 排序后，order_id 应该也是递增的
-- ---------------------------------------------------------
INSERT INTO TABLE dwd_voyah_sales_time_quality PARTITION (pt_date='20260204', data_type='abnormal_monotonicity')
VALUES
(40001, 'LTV_SORT_01', '2026-02-04 15:00:00', '2026-02-04 15:05:00', 1),
(40003, 'LTV_SORT_03', '2026-02-04 15:10:00', '2026-02-04 15:15:00', 1), -- 异常: ID跳变
(40002, 'LTV_SORT_02', '2026-02-04 15:20:00', '2026-02-04 15:25:00', 1); -- 异常: 时间晚但ID小 (破坏单调递增)

-- =========================================================
-- 1. 建表语句 (补充对比表)
-- 表名: dwd_voyah_sales_time_quality02
-- 结构: 与原表完全一致
-- =========================================================
CREATE TABLE IF NOT EXISTS dwd_voyah_sales_time_quality02 LIKE dwd_voyah_sales_time_quality;

-- =========================================================
-- 2. 数据插入语句 (构造对比数据)
-- 分区: 对应规则配置中的 pt_date=20260203 / data_type='normal'
-- 数据: 故意构造与原表(20260204分区)完全不同的数据，以确保“一致性校验“失败
-- =========================================================
INSERT INTO TABLE dwd_voyah_sales_time_quality02 PARTITION (pt_date='20260203', data_type='normal')
VALUES
-- 这里的 Order_ID (300xx) 与原表测试分区 (400xx) 完全不同，确保主键对比失败
(30001, 'LTV_REF_01', '2026-02-03 10:00:00', '2026-02-03 10:05:00', 1),
(30002, 'LTV_REF_02', '2026-02-03 10:10:00', '2026-02-03 10:15:00', 1),
(30003, 'LTV_REF_03', '2026-02-03 10:20:00', '2026-02-03 10:25:00', 1);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_sales_time_quality- 选择分区: pt_date='20260204' / data_type='abnormal_monotonicity'2) 监控规则: 引入规则包1(一致性校验、合理性校验)、规则包2(时效性校验)一致性校验: - 校验类型: 多表数据一致性对比- 校验字段: /- 校验表主键: order_id- 对比表1: dwd_voyah_sales_time_quality02- 输入分区: pt_date=20260203/data_type='normal'- 对比表主键: order_id合理性校验:- 字段: order_id- 统计函数: 数据变化趋势- 过滤条件: /- 排序字段: order_id- 校验方法: 单调递增时效性校验- 字段: order_id- 统计函数: 周期性校验（单字段时间差校验）- 过滤条件: /- 排序字段: order_id- 时间差: <= 1 秒时效性校验- 字段: order_id- 统计函数: 及时性校验（多字段时间差校验）- 对比字段组1: order_time, payment_time- 时间差: <= 1 秒- 大小关系: order_time < payment_time3) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认 | 执行成功, 校验结果: 校验不通过 |
| 3 | 选择任务rule01, 立即执行 | 显示表数据中未通过的数据 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 执行成功, 校验结果: 校验通过 |
| 5 | 编辑规则任务rule01, 分区: pt_date='20260201' / data_type='normal'其它配置不变, 保存后重新执行任务 |  |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 3校验规则)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验、有效性校、唯一性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 0有效性校验:- 字段: vin- 统计规则: 字符串长度 - 校验方法: 固定制- 期望值> 0唯一性校验- 字段: order_id- 统计函数: 重复数- 校验方法: 固定值- 期望值: =03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 1) 显示表数据中未通过的数据2) 状态: 只要有一个未通过, 状态为: 校验异常 |
| 5 | SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE     -- 1. 完整性校验异常 (final_price < 0 或为 NULL)    (final_price < 0 OR final_price IS NULL)        OR        -- 2. 有效性校验异常 (vin 长度 <= 0，包含 NULL 或 纯空格字符串)    (length(trim(vin)) = 0 OR vin IS NULL)        OR        -- 3. 唯一性校验异常 (order_id 重复)    order_id IN (        SELECT order_id         FROM dwd_voyah_vehicle_sales_dates         GROUP BY order_id         HAVING COUNT(1) > 1    ); | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 5 | SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE final_price < 0 OR final_price IS NULL; | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |


##### 【P1】验证删除规则集后, 对已配置过历史规则的任务不生效

> 前置条件

```
建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 4 | 引入规则包rule01中所有校验规则 | 引入成功, 配置参数正确 |
| 5 | 保存规则任务task01后, 立即执行 | 任务运行成功, 校验结果正确: 校验不通过 |
| 6 | 删除规则集1 | 删除成功 |
| 7 | 重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态 | 任务运行成功, 校验结果正确: 校验不通过 |

##### 【P1】验证编辑规则集后, 对已配置过历史规则的任务不生效

> 前置条件

```
建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 4 | 引入规则包rule01中所有校验规则 | 引入成功, 配置参数正确 |
| 5 | 保存规则任务task01后, 立即执行 | 任务运行成功, 校验结果: 校验不通过 |
| 6 | 修改【规则集-规则包rule01】中的校验规则:- 期望值: >= -200 | 配置成功 |
| 7 | 新建规则任务task02并立即执行:1) 监控对象: t2 (与dwd_voyah_vehicle_sales_dates同表结构同数据)2) 监控规则: rule01中的校验规则 | 任务运行成功, 校验结果: 校验通过 |
| 8 | 重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态 | 任务运行成功, 校验结果: 校验不通过 |

##### 【P1】验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入20规则包, 每个包含1个校验规则

1、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

2、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空值数
- 期望值: = 0

3、完整性校验:
- 生效范围: 字段级
- 字段: order_id
- 统计函数: 空值数
- 期望值: = 0

4、完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

5、完整性校验:
- 生效范围: 字段级
- 字段: guide_price
- 统计函数: 空值数
- 期望值: = 0

6、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 空值数
- 期望值: = 0

7、完整性校验:
- 生效范围: 字段级
- 字段: dealer_name
- 统计函数: 空值数
- 期望值: = 0

8、完整性校验:
- 生效范围: 字段级
- 字段: order_status
- 统计函数: 空值数
- 期望值: = 0

9、完整性校验:
- 生效范围: 字段级
- 字段: factory_date
- 统计函数: 空值数
- 期望值: = 0

10、完整性校验:
- 生效范围: 字段级
- 字段: sale_date
- 统计函数: 空值数
- 期望值: = 0

11、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

12、完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

13、完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

14、有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

15、有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0 <= x <= 1000000

16、有效性校验:
- 字段: car_model
- 统计规则: 数值-枚举个数
- 期望值: = 3

17、有效性校验:
- 字段: order_id
- 统计规则: 重复数
- 期望值: = 0

18、有效性校验:
- 字段: vin
- 统计规则: 重复数
- 期望值: = 0

19、唯一性校验
- 字段: order_id
- 统计函数: 重复数
- 期望值: =0

20、唯一性校验
- 字段: order_id
- 统计函数: 重复率
- 期望值: =0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 针对规则 17,19,20: 计算 order_id 重复数        COUNT(1) OVER(PARTITION BY order_id) as calc_order_dup_count,        -- [辅助计算] 针对规则 18: 计算 vin 重复数        COUNT(1) OVER(PARTITION BY vin) as calc_vin_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- =========================================================    -- A. 完整性校验    -- =========================================================    -- 规则1: vin 空串    (trim(vin) = '') OR    -- 规则2-10: 各关键字段判空    (vin IS NULL) OR    (order_id IS NULL) OR    (car_model IS NULL) OR    (guide_price IS NULL) OR    (final_price IS NULL) OR    (dealer_name IS NULL) OR    (order_status IS NULL) OR    (factory_date IS NULL) OR    (sale_date IS NULL)    -- =========================================================    -- B. 取值范围与有效性 (规则 11, 14, 15, 16)    -- =========================================================    OR     -- 规则11: final_price < 0    (final_price < 0)        OR    -- 规则14: vin 长度 <= 0 (注: 空串/NULL已被上面捕获，此处兜底)    (length(vin) <= 0)    OR    -- 规则15: guide_price 超出 [0, 1000000] 范围    (guide_price < 0 OR guide_price > 1000000)    OR    -- 规则16: car_model 枚举校验 (假设标准值为3个: FREE, 梦想家, 追光)    -- 如果当前值不在这3个里面，且不是NULL，则视为脏数据    (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- =========================================================    -- C. 唯一性与重复性 (规则 17, 18, 19, 20)    -- =========================================================    OR    -- 规则17,19,20: order_id 出现重复 (统计数 > 1)    (calc_order_dup_count > 1)    OR    -- 规则18: vin 出现重复 (统计数 > 1)    (calc_vin_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 10校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入规则包, 包含10个校验规则

完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0 <= x <= 1000000

有效性校验:
- 字段: car_model
- 统计规则: 数值-枚举个数
- 期望值: = 3

唯一性校验
- 字段: order_id
- 统计函数: 重复数
- 期望值: =0

唯一性校验
- 字段: order_id
- 统计函数: 重复率
- 期望值: =0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 唯一性校验: 计算 order_id 的重复次数        COUNT(1) OVER(PARTITION BY order_id) as order_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- ---------------------------------------------------------    -- 1. 完整性校验 (字段级)    -- ---------------------------------------------------------    -- 规则: vin 空串数=0 (即: 找出 vin 为空串的数据)    (trim(vin) = '')        OR         -- 规则: car_model 空值数=0 (即: 找出 car_model 为 NULL 的数据)    (car_model IS NULL)        OR         -- 规则: final_price 期望值 >= 0 (即: 找出 < 0 的数据)    (final_price < 0)    -- ---------------------------------------------------------    -- 2. 有效性校验    -- ---------------------------------------------------------    -- 规则: vin 字符串长度 > 0 (即: 找出长度 <= 0 或 NULL 的数据)    -- 注: 此规则与上面的“空串数“、“空值数“有重叠，此处做兜底    OR (length(vin) <= 0 OR vin IS NULL)        -- 规则: guide_price 取值范围 [0, 1000000] (即: 找出在此范围之外的数据)    OR (guide_price < 0 OR guide_price > 1000000)        -- 规则: car_model 枚举个数 = 3 (即: 找出不属于这3个标准车型的数据)    -- 假设标准枚举值为: 岚图FREE, 岚图梦想家, 岚图追光    -- 注: NULL值已被前面的完整性校验捕获，此处主要校验“未知枚举值“    OR (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- ---------------------------------------------------------    -- 3. 唯一性校验    -- ---------------------------------------------------------    -- 规则: order_id 重复数/重复率期望为0 (即: 找出重复出现的订单)    OR (order_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(2规则包 * 2校验规则)

> 前置条件

```
建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_sales_time_quality- 选择分区: pt_date='20260204' / data_type='abnormal_monotonicity'2) 监控规则: 引入规则包1(一致性校验、合理性校验)、规则包2(时效性校验)一致性校验: - 校验类型: 多表数据一致性对比- 校验字段: /- 校验表主键: order_id- 对比表1: dwd_voyah_sales_time_quality02- 输入分区: pt_date=20260203/data_type='normal'- 对比表主键: order_id合理性校验:- 字段: order_id- 统计函数: 数据变化趋势- 过滤条件: /- 排序字段: order_id- 校验方法: 单调递增时效性校验- 字段: order_id- 统计函数: 周期性校验（单字段时间差校验）- 过滤条件: /- 排序字段: order_id- 时间差: <= 1 秒时效性校验- 字段: order_id- 统计函数: 及时性校验（多字段时间差校验）- 对比字段组1: order_time, payment_time- 时间差: <= 1 秒- 大小关系: order_time < payment_time3) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 5 | SQL验证:WITH iqr_stats AS (    -- 计算 guide_price 的四分位数和 IQR 阈值    SELECT         percentile_approx(guide_price, 0.25) as q1,        percentile_approx(guide_price, 0.75) as q3,        (percentile_approx(guide_price, 0.75) - percentile_approx(guide_price, 0.25)) * 1.5 as iqr_range    FROM dwd_voyah_vehicle_sales_dates),duplicate_orders AS (    -- 识别 order_id 重复的数据    SELECT order_id    FROM dwd_voyah_vehicle_sales_dates    GROUP BY order_id    HAVING COUNT(1) > 1)SELECT     t.*,    CASE         WHEN t.final_price < 0 OR t.final_price IS NULL THEN '完整性校验异常:成交价<0或为空'        WHEN length(trim(t.vin)) = 0 OR t.vin IS NULL THEN '有效性校验异常:VIN长度<=0'        WHEN d.order_id IS NOT NULL THEN '唯一性校验异常:订单号重复'        WHEN t.guide_price < (i.q1 - i.iqr_range) OR t.guide_price > (i.q3 + i.iqr_range) THEN '统计性校验异常:指导价IQR离群'        ELSE NULL     END AS error_reasonFROM     dwd_voyah_vehicle_sales_dates tCROSS JOIN iqr_stats iLEFT JOIN duplicate_orders d ON t.order_id = d.order_idWHERE     -- 1. 完整性校验: final_price < 0 或 NULL    (t.final_price < 0 OR t.final_price IS NULL)        -- 2. 有效性校验: vin 长度 <= 0 (含纯空格或NULL)    OR (length(trim(t.vin)) = 0 OR t.vin IS NULL)        -- 3. 唯一性校验: order_id 重复    OR (d.order_id IS NOT NULL)        -- 4. 统计性校验: guide_price 为 IQR 离群点    OR (t.guide_price < (i.q1 - i.iqr_range) OR t.guide_price > (i.q3 + i.iqr_range)); | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 3校验规则)

> 前置条件

```
建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 0有效性校验:- 字段: vin- 统计规则: 字符串长度 - 校验方法: 固定制- 期望值> 0唯一性校验- 字段: order_id- 统计函数: 重复数- 校验方法: 固定值- 期望值: =03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 5 | SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE     -- 1. 完整性校验异常 (final_price < 0 或为 NULL)    (final_price < 0 OR final_price IS NULL)        OR        -- 2. 有效性校验异常 (vin 长度 <= 0，包含 NULL 或 纯空格字符串)    (length(trim(vin)) = 0 OR vin IS NULL)        OR        -- 3. 唯一性校验异常 (order_id 重复)    order_id IN (        SELECT order_id         FROM dwd_voyah_vehicle_sales_dates         GROUP BY order_id         HAVING COUNT(1) > 1    ); | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 1校验规则)

> 前置条件

```
建表语句如下:
-- =========================================================
-- 1. 建表语句 (Doris DDL)
-- Doris 建议使用 OLAP 引擎，并根据 key 进行分桶
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;

CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        VARCHAR(64)     COMMENT '销售订单号',
vin             VARCHAR(64)     COMMENT '车辆识别代码(VIN)',
car_model       VARCHAR(128)    COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     VARCHAR(255)    COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付',
factory_date    VARCHAR(8)      NOT NULL COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       VARCHAR(8)      NOT NULL COMMENT '二级分区: 出售日期 yyyyMMdd'
)
ENGINE=OLAP
DUPLICATE KEY(order_id, vin)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITION BY LIST (factory_date, sale_date) (
PARTITION p20260115_20260201 VALUES IN ((“20260115“, “20260201“)),
PARTITION p20251220_20260201 VALUES IN ((“20251220“, “20260201“)),
PARTITION p20260301_20260201 VALUES IN ((“20260301“, “20260201“)),
PARTITION p20260201_20260201 VALUES IN ((“20260201“, “20260201“)),
PARTITION p20260202_20260202 VALUES IN ((“20260202“, “20260202“))
)
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES (
“replication_num“ = “1“
);

-- =========================================================
-- 2. 数据插入语句 (Doris DML)
-- Doris 会根据 factory_date 和 sale_date 的值自动进入对应分区
-- =========================================================

-- 【场景A：正常数据】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
(order_id, vin, car_model, guide_price, final_price, dealer_name, order_status, factory_date, sale_date)
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3, '20260115', '20260201'),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3, '20260115', '20260201'),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3, '20260115', '20260201'),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3, '20260115', '20260201');

-- 【场景B：库存积压】 3条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_20260201_005', 'LTV_DREAM_OLD_01', '岚图梦想家', 339900.00, 330000.00, '武汉交付中心', 3, '20251220', '20260201'),
('ORD_20260201_006', 'LTV_FREE_OLD_02', '岚图FREE', 266900.00, 250000.00, '上海交付中心', 3, '20251220', '20260201'),
('ORD_20260201_007', 'LTV_PASSION_OLD_03', '岚图追光', 252800.00, 248000.00, '北京交付中心', 3, '20251220', '20260201');

-- 【场景C：逻辑脏数据】 2条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3, '20260301', '20260201'),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3, '20260301', '20260201');

-- 【场景D：极速产销】 1条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3, '20260201', '20260201');

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO dwd_voyah_vehicle_sales_dates
VALUES
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3, '20260202', '20260202'),
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3, '20260202', '20260202'),
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3, '20260202', '20260202'),
('ORD_ERR_BLANK', '    ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3, '20260202', '20260202');

-- 查询分区信息（Doris 语法）
SHOW PARTITIONS FROM dwd_voyah_vehicle_sales_dates;

-- 全表查询
SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 5 | SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE final_price < 0 OR final_price IS NULL; | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |


##### 【P1】验证删除规则集后, 对已配置过历史规则的任务不生效

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 新建监控规则, 配置监控对象(dwd_voyah_vehicle_sales_dates)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 4 | 引入规则包rule01中所有校验规则 | 引入成功, 配置参数正确 |
| 5 | 保存规则任务task01后, 立即执行 | 任务运行成功, 校验结果正确: 校验不通过 |
| 6 | 删除规则集1 | 删除成功 |
| 7 | 重新运行历史规则任务task01, 在【校验结果查询】中查看运行状态 | 任务运行成功, 校验结果正确: 校验不通过 |

##### 【P1】验证规则任务配置规则包后校验正常(20规则包 * 1校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入20规则包, 每个包含1个校验规则

1、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

2、完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空值数
- 期望值: = 0

3、完整性校验:
- 生效范围: 字段级
- 字段: order_id
- 统计函数: 空值数
- 期望值: = 0

4、完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

5、完整性校验:
- 生效范围: 字段级
- 字段: guide_price
- 统计函数: 空值数
- 期望值: = 0

6、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 空值数
- 期望值: = 0

7、完整性校验:
- 生效范围: 字段级
- 字段: dealer_name
- 统计函数: 空值数
- 期望值: = 0

8、完整性校验:
- 生效范围: 字段级
- 字段: order_status
- 统计函数: 空值数
- 期望值: = 0

9、完整性校验:
- 生效范围: 字段级
- 字段: factory_date
- 统计函数: 空值数
- 期望值: = 0

10、完整性校验:
- 生效范围: 字段级
- 字段: sale_date
- 统计函数: 空值数
- 期望值: = 0

11、完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

12、完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

13、完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

14、有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

15、有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0  出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 针对规则 17,19,20: 计算 order_id 重复数        COUNT(1) OVER(PARTITION BY order_id) as calc_order_dup_count,        -- [辅助计算] 针对规则 18: 计算 vin 重复数        COUNT(1) OVER(PARTITION BY vin) as calc_vin_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- =========================================================    -- A. 完整性校验    -- =========================================================    -- 规则1: vin 空串    (trim(vin) = '') OR    -- 规则2-10: 各关键字段判空    (vin IS NULL) OR    (order_id IS NULL) OR    (car_model IS NULL) OR    (guide_price IS NULL) OR    (final_price IS NULL) OR    (dealer_name IS NULL) OR    (order_status IS NULL) OR    (factory_date IS NULL) OR    (sale_date IS NULL)    -- =========================================================    -- B. 取值范围与有效性    -- =========================================================    OR     -- 规则11: final_price < 0    (final_price < 0)        OR    -- 规则14: vin 长度 <= 0 (注: 空串/NULL已被上面捕获，此处兜底)    (length(vin) <= 0)    OR    -- 规则15: guide_price 超出 [0, 1000000] 范围    (guide_price < 0 OR guide_price > 1000000)    OR    -- 规则16: car_model 枚举校验 (假设标准值为3个: FREE, 梦想家, 追光)    -- 如果当前值不在这3个里面，且不是NULL，则视为脏数据    (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- =========================================================    -- C. 唯一性与重复性    -- =========================================================    OR    -- 规则17,19,20    (calc_order_dup_count > 1)    OR    -- 规则18    (calc_vin_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 10校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入规则包, 包含10个校验规则

完整性校验:
- 生效范围: 字段级
- 字段: vin
- 统计函数: 空串数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: car_model
- 统计函数: 空值数
- 期望值: = 0

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

完整性校验:
- 生效范围: 单表
- 统计函数: 表行数
- 期望值: >= 0

完整性校验:
- 生效范围: 多表数据行数对比
- 对比表: dwd_voyah_vehicle_sales_dates
- 分区: factory_date=20260202/sale_date=20260202

有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 期望值> 0

有效性校验:
- 字段: guide_price
- 统计规则: 数值-取值范围
- 期望值: 0  出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 3 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 4 | SQL验证:SELECT     *FROM (    SELECT         *,        -- [辅助计算] 唯一性校验: 计算 order_id 的重复次数        COUNT(1) OVER(PARTITION BY order_id) as order_dup_count    FROM         dwd_voyah_vehicle_sales_dates) tWHERE     -- ---------------------------------------------------------    -- 1. 完整性校验 (字段级)    -- ---------------------------------------------------------    -- 规则: vin 空串数=0 (即: 找出 vin 为空串的数据)    (trim(vin) = '')        OR         -- 规则: car_model 空值数=0 (即: 找出 car_model 为 NULL 的数据)    (car_model IS NULL)        OR         -- 规则: final_price 期望值 >= 0 (即: 找出 < 0 的数据)    (final_price < 0)    -- ---------------------------------------------------------    -- 2. 有效性校验    -- ---------------------------------------------------------    -- 规则: vin 字符串长度 > 0 (即: 找出长度 <= 0 或 NULL 的数据)    -- 注: 此规则与上面的“空串数“、“空值数“有重叠，此处做兜底    OR (length(vin) <= 0 OR vin IS NULL)        -- 规则: guide_price 取值范围 [0, 1000000] (即: 找出在此范围之外的数据)    OR (guide_price < 0 OR guide_price > 1000000)        -- 规则: car_model 枚举个数 = 3 (即: 找出不属于这3个标准车型的数据)    -- 假设标准枚举值为: 岚图FREE, 岚图梦想家, 岚图追光    -- 注: NULL值已被前面的完整性校验捕获，此处主要校验“未知枚举值“    OR (car_model IS NOT NULL AND car_model NOT IN ('岚图FREE', '岚图梦想家', '岚图追光'))    -- ---------------------------------------------------------    -- 3. 唯一性校验    -- ---------------------------------------------------------    -- 规则: order_id 重复数/重复率期望为0 (即: 找出重复出现的订单)    OR (order_dup_count > 1); | 返回的数据与规则过滤出的数据一致 |
| 5 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |

##### 【P1】验证规则任务配置规则包后校验正常(1规则包 * 3校验规则)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: /

监控规则: 引入规则包、规则类型(完整性校验、有效性校、唯一性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

有效性校验:
- 字段: vin
- 统计规则: 字符串长度
- 校验方法: 固定制
- 期望值> 0

唯一性校验
- 字段: order_id
- 统计函数: 重复数
- 校验方法: 固定值
- 期望值: =0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择分区: /2) 监控规则: 引入规则包、规则类型(完整性校验)完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 0有效性校验:- 字段: vin- 统计规则: 字符串长度 - 校验方法: 固定制- 期望值> 0唯一性校验- 字段: order_id- 统计函数: 重复数- 校验方法: 固定值- 期望值: =03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 选择任务rule01, 立即执行 | 执行成功, 校验结果: 校验不通过 |
| 4 | 进入「校验结果查询」, 检查规则任务详情页 | 显示表数据中未通过的数据 |
| 5 | SQL验证:SELECT * FROM dwd_voyah_vehicle_sales_dates WHERE     -- 1. 完整性校验异常 (final_price < 0 或为 NULL)    (final_price < 0 OR final_price IS NULL)        OR        -- 2. 有效性校验异常 (vin 长度 <= 0，包含 NULL 或 纯空格字符串)    (length(trim(vin)) = 0 OR vin IS NULL)        OR        -- 3. 唯一性校验异常 (order_id 重复)    order_id IN (        SELECT order_id         FROM dwd_voyah_vehicle_sales_dates         GROUP BY order_id         HAVING COUNT(1) > 1    ); | 返回的数据与规则过滤出的数据一致 |
| 6 | 编辑规则任务rule01, 分区: factory_date=20260115/sale_date=20260201其它配置不变, 保存后重新执行任务 | 执行成功, 校验结果: 校验通过 |


##### 【P1】验证规则集引用规则仅支持删除

> 前置条件

```
规则集管理中已配置记录:
hive2.x的表hive_table, 规则包配置:

1) hive_rulePkg01: 完整性校验 * 1

2) hive_rulePkg02: 唯一性校验 * 10

3) hive_rulePkg03: (完整性校验~自定义SQL、一致性校验、时效性校验、合理性校验) * 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置监控对象(hive_table)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 3 | 选择hive_rulePkg03规则包, 勾选所有校验规则, 并引入 | 引入成功 |
| 4 | 检查完整性校验规则块 | 规则块仅支持删除按钮, 其余编辑操作全部禁用(置灰), 包括克隆按钮 |
| 5 | 点击删除, 并二次确认删除 | 删除成功 |
| 6 | 依次检查后面7个校验规则块 | 仅支持删除, 其余编辑操作、克隆操作均不再支持 |
| 7 | 依次删除并二次确认 | 删除成功 |
| 8 | 再次引入hive_rulePkg03规则包中的所有规则类型, 保存 | 引入、保存成功 |

##### 【P1】验证更换规则包但不引入, 校验规则配置不变

> 前置条件

```
监控规则-规则包中1、2已存在校验规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集 | 进入【新建规则集 ❯ 基础信息】配置页面 |
| 2 | 正常配置基础信息内容, 点击下一步 | 进入监控规则配置页面 |
| 3 | 选择已配置校验规则的规则包1并引入 | 规则包1中的校验规则引入成功, 配置信息正确 |
| 4 | 更换为规则包2 (不引入) | 规则包下的校验规则配置内容不变 |
| 5 | 保存后, 检查规则任务配置信息 | 保存成功, 配置内容不变:1) 规则包: 规则包12) 校验规则: 规则包1中的校验规则 |

##### 【P1】验证规则集引用功能正常(规则包选择全部)

> 前置条件

```
规则集管理中已配置记录:
hive2.x的表hive_table, 规则包配置:

1) hive_rulePkg01: 完整性校验 * 1

2) hive_rulePkg02: 唯一性校验 * 10

3) hive_rulePkg03: (完整性校验~自定义SQL、一致性校验、时效性校验、合理性校验) * 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置监控对象(hive_table)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 3 | 选择hive_rulePkg01、02、03规则包, 检查规则类型下拉框数据 | 支持选择完整性校验~合理性校验共8项 |
| 4 | 勾选所有规则类型后, 点击【引入】 | 引入成功, 不同规则包间的相同校验规则均被引入至规则任务: 完整性校验*2 + 唯一性校验*11 + 其它6种校验*1 |

##### 【P1】验证规则集引用功能正常(规则包单选)

> 前置条件

```
规则集管理中已配置记录:
hive2.x的表hive_table, 规则包配置:

1) hive_rulePkg01: 完整性校验 * 1

2) hive_rulePkg02: 唯一性校验 * 10

3) hive_rulePkg03: (完整性校验~自定义SQL、一致性校验、时效性校验、合理性校验) * 1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置监控对象(hive_table)后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 3 | 检查规则包下拉框数据 | 支持选择全部、hive_rulePkg01~04共5个选项 |
| 4 | 选择hive_rulePkg01规则包, 检查规则类型下拉框数据 | 存在级联关系, 仅筛选出该规则包下的规则类型: 完整性校验 |
| 5 | 勾选【完整性校验】后, 点击【引入】 | 成功引入一个【完整性校验】, 配置正确 |
| 6 | 正常配置调度属性后, 保存 | 配置保存成功 |
| 7 | 重新配置监控规则页面: 选择hive_rulePkg02规则包, 检查规则类型下拉框数据 | 筛选结果: 唯一性校验 |
| 8 | 勾选【唯一性校验】后, 点击【引入】 | 成功引入十个【唯一性校验】, 配置正确 |
| 9 | 正常配置调度属性后, 保存 | 配置保存成功 |
| 10 | 重新配置监控规则页面: 选择hive_rulePkg03规则包, 检查规则类型下拉框数据 | 筛选结果: 完整性校验~合理性校验共8项 |
| 11 | 勾选所有校验类型后, 点击【引入】 | 成功引入所有校验类型, 配置正确 |
| 12 | 正常配置调度属性后, 保存 | 配置保存成功 |

##### 【P1】验证监控规则页面变更

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 配置监控对象后点击下一步 | 进入【新建单表校验规则 ❯ 监控规则】配置页面 |
| 3 | 检查【监控规则】页面变更 | 1) 新增规则包(必填)、规则类型(非必填)下拉框、引入按钮2) 原右上角按钮(添加规则、查看全局参数)隐藏 |



##### 【P1】验证规则集详情数据正确

> 前置条件

```
规则集管理列表中已存在一条记录rule01
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面 | 进入成功 |
| 2 | 选择规则集rule01, 点击表名 | 右侧抽屉形式展开详情页, 包含基本信息和规则详情, 具体如下:1) 标题: ${数据表名称}规则集详情2) 基本信息: 包含表名、所属数据库、所属数据源、规则包数量、规则数量、规则集描述、更新人、更新时间3) 规则详情: - 展示该规则集记录中已配置的规则包内容, 包含规则包名称及关联的校验规则- 每个规则包支持折叠, 默认展开 |
| 3 | 检查【规则集详情页】中的基本信息&规则详情数据 | 1) 基本信息与规则集列表记录保持一致2) 规则详情与规则集记录中配置的规则包内容一致 |
| 4 | 进入【规则任务管理】中, 配置规则任务引入该规则包并保存 | 保存成功 |
| 5 | 检查【规则任务详情页】 | 显示规则任务关联的规则包中, 所有的校验规则 |
| 6 | 运行规则任务后, 进入【校验结果查询】, 检查【校验结果详情页】 | 显示规则任务关联的规则包中, 所有的校验规则 |



##### 【P1】验证更换规则包名称后, 校验规则配置不变

> 前置条件

```
监控规则-规则包中1、2已存在校验规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面,  编辑规则集rule01, 点击下一步 | 进入【编辑规则集 ❯ 监控规则】配置页面 |
| 2 | 将原规则包1更换为规则包2 | 规则包下的校验规则配置内容不变 |


##### 【P1】验证选择数据表选项过滤已配置的表

> 前置条件

```
规则集管理中已配置过hive2.x/sparkthrift2.x/doris3.x的表tableA
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面,  编辑规则集rule01 | 进入【编辑规则集 ❯ 基础信息】配置页面 |
| 2 | 选择已配置过规则的数据源(hive2.x)、数据库后, 查看选择数据表下拉选项 | 过滤已配置的hive表tableA |
| 3 | 选择已配置过规则的数据源(sparkthrift2.x)、数据库后, 查看选择数据表下拉选项 | 过滤已配置的sparkthrift表tableA |
| 4 | 选择已配置过规则的数据源(doris3.x)、数据库后, 查看选择数据表下拉选项 | 过滤已配置的doris表tableA |

##### 【P1】验证编辑规则集配置页面

> 前置条件

```
规则集列表已存在规则集记录rule01
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面 | 进入成功 |
| 2 | 选择规则集记录rule01, 点击编辑 | 进入【编辑规则集 ❯ 基础信息】配置页面, 所有字段均可编辑 |
| 3 | 基础信息UICHECK | 1) 选择数据表: ${最近一次编辑保存时的配置记录}2) 规则包: ${最近一次编辑保存时的规则包名称}3) 按钮: 取消/下一步 |
| 4 | 点击下一步 | 进入【编辑规则集 ❯ 监控规则】配置页面 |
| 5 | 监控规则UICHECK | 1) 规则包&校验规则: ${最近一次编辑保存时的规则包&校验规则}2) 按钮: 下一步/保存 |



##### 【P1】验证更换规则包名称后, 校验规则配置不变

> 前置条件

```
监控规则-规则包中1、2已存在校验规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集 | 进入【新建规则集 ❯ 基础信息】配置页面 |
| 2 | 正常配置基础信息内容, 点击下一步 | 进入「监控规则」配置页面 |
| 3 | 选择规则包1, 添加并配置校验规则1 | 配置成功 |
| 4 | 切换为规则包2, 检查校验规则配置信息 | 规则配置不变: 更换选择不同的规则包名称不影响已经配置的规则 |


##### 【P1】验证规则包名称增删改功能

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集 | 进入【新建规则集 ❯ 基础信息】配置页面 |
| 2 | 正常配置选择数据表内容 | 配置成功 |
| 3 | 在规则包名称配置中, 点击增加按钮, 添加规则包名称 | 添加成功, 从第二个规则包名称开始均提供删除按钮 |
| 4 | 添加至20个规则包名称 | 增加按钮消失 |
| 5 | 删除任一规则包名称 | 可再次添加 |
| 6 | 删除至1个规则包名称 | 删除按钮消失 |
| 7 | 规则包名称输入框输入51字符 | 置红提示: 规则包名称最大50个字符 |
| 8 | 输入50字符, 点击下一步 | 配置成功 |

##### 【P1】验证新建规则集配置页面

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面 | 进入成功 |
| 2 | 点击新增规则集 | 进入【新建规则集 ❯ 基础信息】配置页面, 支持配置基础信息和监控规则 |
| 3 | 基础信息UICHECK | 支持配置选择数据表、规则包:1) 选择数据表: 选择数据源(必填)、选择数据库(必填)、选择数据表(必填)、规则集描述2) 规则包: 支持对规则包名称进行增删改, 必填3) 按钮: 取消/下一步 |
| 4 | 正常配置基础信息内容, 点击下一步 | 进入【新建规则集 ❯ 监控规则】配置页面 |
| 5 | 监控规则UICHECK | 1)支持对每一个规则包配置不同的校验规则2)支持规则包的增删改操作3) 支持对规则包中的校验规则增删改和克隆操作4) 支持查看全局参数5) 按钮: 下一步/保存 |

##### 【P1】验证规则集管理页面

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则集管理】页面 | 进入成功 |
| 2 | 检查页面UI | 1、支持规则集列表展示, 包含表名、所属数据库、所属数据源、规则包数量、规则数量、规则集描述、更新人、更新时间、操作2、支持对规则集的增删改查3、支持对规则集分页列表展示 |
| 3 | 检查列表数据 | 1) 表名: ${最后一次编辑规则集时的表名}2) 所属数据库:  ${最后一次编辑规则集时的数据库}3) 所属数据源:  ${最后一次编辑规则集时的数据源}4) 规则包数量:  ${最后一次编辑规则集时的规则包数量, 不超过20}5) 规则数量:  ${最后一次编辑规则集时的规则数量}6) 规则集描述:  ${最后一次编辑规则集时的规则集描述}7) 更新人:  ${最后一次编辑规则集时的账号}8) 更新时间:  ${最后一次编辑规则集时的时间} |

### 【数据质量】菜单名称修改(#10221)

##### 【P1】验证新建项目菜单名称正确修改

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量」页面 | 页面正常打开 |
| 2 | 新建项目信息，并切换对应项目 | 项目新建成功，切换对应项目的页面 |
| 3 | 查看页面菜单 | 1）「概览」名称改为「总览」 2）「规则任务配置」名称改为「规则任务管理」 3）「任务实例查询」名称改为「校验结果查询」 4）「质量报告」名称改为「数据质量报告」 5）新增一级菜单「规则集管理」 |

### 【规则任务配置优化】一个数据表支持创建多个质量规则任务(#10188)

##### 【P1】验证报告内质量评估汇总命名变更

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
4、已存在table1的1个规则任务test_rule，报告名称为“table1质量报告”
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告」，查看table1质量报告 | 进入成功 |
| 2 | 查看报告内，质量评估汇总后的名称 | 展示表名_任务名称，即table1_test_rule |

##### 【P1】验证新增报告-多表-全部任务功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;

4.hive2.x/sparkthrift2.x/doris3.x数据表已配置规则集
规则包1:
自定义sql：
select * from table1； 固定值>2，弱规则

有效性校验：
字段id-取值范围-期望值>3，弱规则

5、已存在table1的2个规则任务，任务1、任务2

已存在table2的1个规则任务，
任务3
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告-新增报告」 | 进入成功 |
| 2 | 「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1、table2 | 新增「选择任务」字段 |
| 3 | 「选择任务」选择全部，点击确定 | 保存成功 |
| 4 | 查看报告内容 | 展示任务1、任务2、任务3相关的表级报告 |

##### 【P1】验证新增报告-单表-全部任务功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;

5、已存在table1的2个规则任务，任务1、任务2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告-新增报告」 | 进入成功 |
| 2 | 「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1 | 新增「选择任务」字段 |
| 3 | 「选择任务」选择全部，点击确定 | 保存成功 |
| 4 | 查看报告内容 | 展示任务1、任务2相关的表级报告 |

##### 【P1】验证新增报告-单表-单个任务功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
5、已存在table1的2个规则任务，任务1、任务2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告-新增报告」 | 进入成功 |
| 2 | 「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1 | 新增「选择任务」字段 |
| 3 | 「选择任务」选择「任务1」，点击确定 | 保存成功 |
| 4 | 查看报告内容 | 只展示任务1相关的表级报告 |

##### 【P1】验证新增选择任务字段

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
5、已存在table1的2个规则任务，任务1、任务2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告-新增报告」 | 进入成功 |
| 2 | 「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1，查看展示 | 新增「选择任务」字段 |
| 3 | 查看「选择任务」下拉框 | 展示「全部」「任务1」「任务2」 |
| 4 | 再添加一个关联表，查看「选择任务」下拉框 | 只展示「全部」 |

##### 【P1】验证新增质量报告，报告名称校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
4、已存在table1的1个规则任务，报告名称为“table1质量报告”
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告-新增报告」 | 进入成功 |
| 2 | 「报告名称」填写「table1质量报告」，关联表选择${DATASOURCE}_${DATABASE}_table1，任务选择全部，点击确定 | 报错：已存在相同的报告名称 |

##### 【P1】验证质量报告页面，根据表名搜索结果正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
4、已存在table1的1个规则任务，任务名称为“任务1”“任务2”
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-质量报告」 | 进入成功 |
| 2 | 数据表搜索“table1”，查看结果 | 返回“任务1”“任务2”配置的两条单表报告以及当前表的自定义报告信息 |

##### 【P1】验证任务实例查询页面，根据表名搜索结果正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
4、已存在table1的1个规则任务，任务名称为“任务1”“任务2”
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量-任务实例查询」 | 进入成功 |
| 2 | 搜索“table1”，查看结果 | 返回“任务1”、“任务2”两条规则的实例 |

##### 【P1】验证同一张表，不同任务，质量报告名称相同报错

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「字段级」-「字段值校验」-「字段值取值校验」配置如下：「规则类型」选择「字段级」，「字段」选择「id」，「统计函数」 选择「字段取值范围校验」，「过滤条件」 输入「id < 100」，「期望值」选择「>5」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成，规则与前置的「规则包1-完整性校验内容一致」 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」，不勾选「无需生成报告」，查看报告名称 | 报告名称为“table1/table1_test_rule_数据质量报告” |
| 5 | 保存规则，查看报告详情页 | 保存成功，详情页报告命名为“table1_test_rule“ |
| 6 | 再次新建监控规则，「规则名称」输入「test_rule1」，「报告名称」填写：「table1/table1_test_rule_数据质量报告」，其他与步骤2-4一致，保存规则 | 提示：已存在相同的报告名称 |

##### 【P1】验证同一张表，不同任务，质量报告名称正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「字段级」-「字段值校验」-「字段值取值校验」配置如下：「规则类型」选择「字段级」，「字段」选择「id」，「统计函数」 选择「字段取值范围校验」，「过滤条件」 输入「id < 100」，「期望值」选择「>5」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成，规则与前置的「规则包1-完整性校验内容一致」 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」，不勾选「无需生成报告」，查看报告名称 | 报告名称为“table1/table1_test_rule_数据质量报告” |
| 5 | 保存规则，查看报告详情页 | 保存成功，详情页报告命名为“table1_test_rule“ |
| 6 | 再次新建监控规则，「规则名称」输入「test_rule1」其他与步骤2-4一致，查看报告名称 | 报告名称为“table1/table1_test_rule1_数据质量报告” |
| 7 | 保存规则，查看报告详情页 | 保存成功，详情页报告命名为“table1_test_rule1“ |

##### 【P1】验证同一张表，不同任务，运行结果正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>5」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成，规则与前置的「规则包1-完整性校验内容一致」 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 再次新建监控规则，「规则名称」输入「test_rule1」，「监控规则」-配置「唯一性校验」-「字段id」-「重复值检测」-「重复数，固定值<0」-「过滤条件」 输入「id < 100」，其他内容与步骤2-4保持一致，保存规则 | 规则保存成功 |
| 6 | 分别运行规则，查看实例 | 实例任务信息正确，结果都为校验不通过，详情展示规则正确 |

##### 【P1】验证同一张表，不同任务，任务详情正确

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>0」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 再次新建监控规则，「规则名称」输入「test_rule1」，「监控规则」-配置「唯一性校验」-「字段id」-「重复值检测」-「重复数，固定值<0」-「过滤条件」 输入「id < 100」，其他内容与步骤2-4保持一致，保存规则 | 规则保存成功 |
| 6 | 分别查看规则「test_rule」、「test_rule1」的规则详情 | 规则详情展示正确，都与新建时一致 |

##### 【P1】验证同一张表，不同任务名，相同规则，任务创建成功

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>0」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 再次新建监控规则，「规则名称」输入「test_rule1」，其他内容与步骤2-4保持一致，保存规则 | 规则保存成功 |

##### 【P1】验证不同数据源下的表，相同任务名，任务创建成功

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2.${DATASOURCE}有相似数据源${DATASOURCE1}
3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>0」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 再次新建监控规则，「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE1}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」点击下一步，监控规则选择已有规则集，调度属性配置与步骤4一致 | 规则保存成功 |

##### 【P1】验证同一张表创建规则，规则名称校验功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目
2. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );
INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');
SELECT * FROM table1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「表级」-「表行数检测」-「固定值」配置如下：「校验类型」选择「单表」，「规则类型」选择「表级」，「统计函数」 选择「表行数」，「过滤条件」 输入「id < 100」，「校验方法」选择「固定值」，「期望值」选择「>0」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」保存规则 | 规则保存成功 |
| 5 | 再次新建监控规则，填写与步骤2-4致 | 提示：已存在重复的任务名称，不可重复添加！ |
| 6 | 修改「规则名称」为「任务1」，保存 | 保存成功 |

##### 【P1】验证历史已存在规则的数据表，新建质量任务功能

> 前置条件

```
1. 资产平台已存在${DATASOURCE}_${DATABASE}_${TABLE}并授权给当前测试项目

2.${DATASOURCE}有相似数据源${DATASOURCE1}

3. ${TABLE} DDL\DML 如下：
drop table if exists table1;
create table if not EXISTS table1 (
id int,
age string,
name string,
score string,
sex string )
USING paimon tblproperties ( 'primary-key' = 'id' );

INSERT INTO table1 VALUES (1, '11','林大','100','男'), (2, '12','王二','99','男'),(3, '13','张三','99','男'),(4, '14','李四','100','女');

SELECT * FROM table1;

4、历史已存在table的单表规则：test_rule
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「数据质量」-「规则任务配置」-「监控对象」页面 | 进入成功 |
| 2 | 「规则名称」输入「test_rule1」，「选择数据源」选择「${DATASOURCE}」，「选择数据库」选择「${DATABASE}」，「选择数据表」选择「${TABLE}」 | 监控对象配置成功 |
| 3 | 「监控规则」配置「完整性校验」-「字段级」-「字段值校验」-「字段值取值校验」配置如下：「规则类型」选择「字段级」，「字段」选择「id」，「统计函数」 选择「字段取值范围校验」，「过滤条件」 输入「id < 100」，「期望值」选择「>5」，「强弱规则」选择「弱规则」，「规则描述」输入「测试规则」 | 监控规则配置完成，规则与前置的「规则包1-完整性校验内容一致」 |
| 4 | 「调度属性」配置如下：「调度周期」选择「小时」，「生效日期」为「2025-11-20～2025-11-20」，「间隔时间」为 「1小时」，「开始时间-结束时间」为「00:00:00～15:00:00」，「规则拼接包」为「1」，「资源组」选择「default」，不勾选「无需生成报告」，查看报告名称 | 报告名称为“table1/table1_test_rule1_数据质量报告” |
| 5 | 任务运行，查看结果 | 结果正确，脏数据正确 |
| 6 | 任务运行后，查看质量报告结果 | 质量报告结果正确，没有错乱 |

### 【规则任务配置优化】质量规则任务支持编辑分区信息(#10192)

##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择动态分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date=20260202/sale_date=20260202

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择已有分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date=20260202/sale_date=20260202

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date/sale_date = bdp.system.bizdate

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date/sale_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 手动输入分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date=20260202/sale_date=20260202

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 选择动态分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date=20260202/sale_date=20260202

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |


##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择已有分区)

> 前置条件

```
1) 已存在规则任务, 监控规则配置如下
监控对象:
- 规则名称: rule01
- 数据表: dwd_voyah_vehicle_sales_dates
- 选择已有分区: factory_date=20260202/sale_date=20260202

监控规则: 引入规则包、规则类型(完整性校验)

完整性校验:
- 生效范围: 字段级
- 字段: final_price
- 统计函数: 字段取值校验
- 期望值: >= 0

调度属性:
- 调度周期: 时
- 生效日期: T~T+1
- 间隔时间: 1小时
- 其它默认

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)

> 前置条件

```
1)选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date/sale_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 选择已有分区)

> 前置条件

```
1) 选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date/sale_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 选择动态分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1)监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=20260202/sale_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date/sale_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |



##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择动态分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date/sale_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 手动输入分区)

> 前置条件

```
1) 选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 选择已有分区)

> 前置条件

```
1)选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2) 建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 手动输入分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115/sale_date=20260201 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |


##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择动态分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(手动输入分区 ❯ 选择已有分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 手动输入分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 运行成功 |
| 3 | 运行规则任务rule01, 立即执行 | 校验结果: 校验不通过 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 数据预览成功: 3条数据 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115 , 点击数据预览 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 6 | 后面配置不变, 保存后再次运行任务 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |
| 8 | 检查后续生成的rule01实例的详情页 |  |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择动态分区 ❯ 选择已有分区)

> 前置条件

```
1) 选择动态分区需要额外执行DML语句:
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='${bdp.system.bizdate}', sale_date='${bdp.system.bizdate}')
VALUES
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -200.00, '成都交付中心', 3);

2)建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择动态分区:  factory_date = bdp.system.bizdate2) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择已有分区: factory_date=20260115 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 手动输入分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- 表名: 岚图汽车销售双日期分区表
-- 分区: factory_date (出厂日期) / sale_date (出售日期)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 手动输入分区: factory_date=20260115, 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |

##### 【P1】验证分区信息改变, 任务实例信息改变(选择已有分区 ❯ 选择动态分区)

> 前置条件

```
建表语句如下:
=========================================================
-- 1. 建表语句 (DDL)
-- =========================================================
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- =========================================================
-- 2. 数据插入语句 (DML) - 共10条数据
-- =========================================================

-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
-- 用于测试：基础的分区扫描功能
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;

SELECT * FROM dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「立即生成」 | 配置成功 |
| 3 | 运行规则任务rule01, 立即执行 | 运行成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: 选择动态分区: factory_date = bdp.system.bizdate , 点击数据预览 | 数据预览成功: 暂无数据 |
| 6 | 后面配置不变, 保存后再次运行任务 | 1) 任务运行成功2) 规则任务rule01详情页中, 分区配置变更成功 |
| 7 | 进入【校验结果查询】, 检查【运行中、等待运行】的rule01实例的详情页 | 实例停止运行, 实例状态依次变更: 【停止中】、【中途停止】 |
| 8 | 检查后续生成的rule01实例的详情页 | 分区配置变更成功, 变更范围:1) 表名悬浮提示中的分区配置信息2) 规则详情页中, 表级报告中的表名和分区信息后续生成的实例正常运行, 校验结果: 校验通过 |


##### 【P1】验证规则任务正常运行(关闭检测)

> 前置条件

```
建表语句如下:
-- 1. 建表语句 (DDL)
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- 2. 数据插入语句 (DML) - 共10条数据
-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: T+1生成 | 配置成功 |
| 3 | 选择规则任务rule01, 关闭检测, 等待T+1生成 | 生成成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验通过 |

##### 【P1】验证规则任务正常运行(T+1生成)

> 前置条件

```
建表语句如下:
-- 1. 建表语句 (DDL)
DROP TABLE IF EXISTS dwd_voyah_vehicle_sales_dates;
CREATE TABLE IF NOT EXISTS dwd_voyah_vehicle_sales_dates (
order_id        STRING          COMMENT '销售订单号',
vin             STRING          COMMENT '车辆识别代码(VIN)',
car_model       STRING          COMMENT '车型名称',
guide_price     DECIMAL(20,2)   COMMENT '官方指导价',
final_price     DECIMAL(20,2)   COMMENT '最终成交价',
dealer_name     STRING          COMMENT '交付中心',
order_status    INT             COMMENT '状态: 3-已交付'
)
COMMENT '岚图汽车销售表-用于规则配置测试'
PARTITIONED BY (
factory_date    STRING          COMMENT '一级分区: 出厂日期 yyyyMMdd',
sale_date       STRING          COMMENT '二级分区: 出售日期 yyyyMMdd'
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

-- 2. 数据插入语句 (DML) - 共10条数据
-- 【场景A：正常数据】 4条
-- 出厂: 20260115 -> 出售: 20260201 (产销周期约半个月，正常)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260115', sale_date='20260201')
VALUES
('ORD_20260201_001', 'LTV_FREE_001', '岚图FREE', 266900.00, 261900.00, '武汉交付中心', 3),
('ORD_20260201_002', 'LTV_DREAM_002', '岚图梦想家', 369900.00, 365000.00, '杭州交付中心', 3),
('ORD_20260201_003', 'LTV_PASSION_003', '岚图追光', 252800.00, 252800.00, '深圳交付中心', 3),
('ORD_20260201_004', 'LTV_FREE_004', '岚图FREE', 266900.00, 260000.00, '成都交付中心', 3);

-- 【场景B：库存积压】 3条
-- 出厂: 20251220 -> 出售: 20260201 (去年生产今年卖，跨年跨月)
-- 用于测试：手动输入分区范围查询 (例如 factory_date  出售: 20260201 (出厂日期晚于出售日期，逻辑错误)
-- 用于测试：质量规则校验 (WHERE factory_date > sale_date 应该触发告警)
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260301', sale_date='20260201')
VALUES
('ORD_ERR_001', 'LTV_FUTURE_001', '岚图FREE', 266900.00, 266900.00, '广州交付中心', 3),
('ORD_ERR_002', 'LTV_FUTURE_002', '岚图梦想家', 369900.00, 369900.00, '西安交付中心', 3);

-- 【场景D：极速产销】 1条
-- 出厂: 20260201 -> 出售: 20260201 (当天生产当天卖)
-- 用于测试：边界值校验
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260201', sale_date='20260201')
VALUES
('ORD_FAST_001', 'LTV_SPEED_001', '岚图追光', 252800.00, 252800.00, '武汉交付中心', 3);

-- 【场景E：字段级异常 (脏数据)】 4条
INSERT INTO TABLE dwd_voyah_vehicle_sales_dates PARTITION (factory_date='20260202', sale_date='20260202')
VALUES
-- 1. [NULL异常]: 车型名称为 NULL
('ORD_ERR_NULL', 'LTV_NULL_VAL', NULL, 266900.00, 260000.00, '北京交付中心', 3),
-- 2. [空串异常]: 交付中心为 Empty String ('')
('ORD_ERR_EMPTY', 'LTV_EMPTY_STR', '岚图追光', 252800.00, 252800.00, '', 3),
-- 3. [数值异常]: 最终成交价为负数 (-100.00)
('ORD_ERR_NEG', 'LTV_NEG_PRICE', '岚图梦想家', 369900.00, -100.00, '成都交付中心', 3),
-- 4. [空值异常]: VIN码为纯空格 ('   '), 且官方指导价丢失
('ORD_ERR_BLANK', '   ', '岚图FREE', NULL, 0.00, '重庆交付中心', 3);

-- 查询已创建的分区信息
SHOW PARTITIONS dwd_voyah_vehicle_sales_dates;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建监控规则, 配置如下:1) 监控对象: - 规则名称: rule01- 数据表: dwd_voyah_vehicle_sales_dates- 选择已有分区: factory_date=202602022) 监控规则: 完整性校验: - 生效范围: 字段级- 字段: final_price- 统计函数: 字段取值校验- 期望值: >= 03) 调度属性:- 调度周期: 时- 生效日期: T~T+1- 间隔时间: 1小时- 其它默认- 实例生成方式: 「T+1生成」 | 配置成功 |
| 3 | 等待T+1生成规则任务实例 | 实例生成成功 |
| 4 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验不通过 |
| 5 | 进入【规则任务管理】, 编辑rule01, 修改分区: factory_date=20260115 , 点击数据预览 | 数据预览成功: 3条数据 |
| 6 | 后面配置不变, 保存后再次等待T+1生成规则任务实例 | 实例生成成功 |
| 7 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验通过 |
| 8 | 进入规则任务详情「编辑调度属性」配置页面, 将「T+1生成」, 改为「立即生成」后, 保存 | 配置变更成功 |
| 9 | 立即生成规则任务实例 | 生成成功 |
| 10 | 进入【校验结果查询】, 检查实例详情页面 | 校验结果: 校验通过 |

##### 【P1】验证规则任务支持「实例生成方式」

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 新建规则任务A, 配置监控对象、监控规则后, 检查调度属性页面 | 调度配置中新增字段: 实例生成方式 |
| 3 | 检查实例生成方式配置项 | 1) 枚举: T+1生成(默认)、立即生成2) 悬浮提示: 选中「T+1生成」，代表实例生成按照配置项设置的时间生成实例，默认是22：00；选中「立即生成」，代表提交后立即生成当天开始未来时间内的实例，之后的实例生成还是按照配置项设置的时间生成实例； |
| 4 | 保存规则任务, 检查规则任务详情页 | 新增字段: 实例生成方式, 回显内容正确 |
| 5 | 选择规则任务A, 进入任务详情页-「编辑调度属性」配置页面 | 调度配置中存在字段: 实例生成方式 |
| 6 | 检查实例生成方式配置项 | 1) 枚举: T+1生成(默认)、立即生成2) 悬浮提示: 选中「T+1生成」，代表实例生成按照配置项设置的时间生成实例，默认是22：00；选中「立即生成」，代表提交后立即生成当天开始未来时间内的实例，之后的实例生成还是按照配置项设置的时间生成实例； |

##### 【P1】验证规则任务支持编辑分区操作

> 前置条件

```
规则任务列表已存在监控对象为分区表的任务A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 选择规则任务A, 进入编辑页 | 1) 分区配置处于可编辑状态2) 分区配置信息回显正常 |

### 【规则库管理】支持自定义sql模版(#10205)

##### 【P1】验证列表展示

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 列表展示规则名称、规则分类、关联范围、关联规则数、规则描述、操作 | 列表字段显示正确 |
| 2 | 支持规则分类筛选，点击漏斗，枚举内容支持多选 | 筛选结果正确 |
| 3 | 支持规则范围筛选，点击漏斗，枚举内容支持多选 | 筛选结果正确 |
| 4 | 查看关联规则数 | 数量正确 |

##### 【P1】验证列表排序

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 按照修改时间倒排 | 排序正确 |


##### 【P1】验证规则名称

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 提示词：请输入 | 提示词正确 |
| 2 | 必填 | 为空提示 |
| 3 | 最大支持输入100 | 超长无法输入 |
| 4 | 不支持重复 | 若重复，提示校验 |

##### 【P1】验证规则分类

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 提示词：请选择 | 提示词正确 |
| 2 | 选择枚举 | 完整性/唯一性/有效性/统计性/时效性/合理性 |
| 3 | 必选 | 为空提示 |
| 4 | 仅支持单选 | 选择成功 |

##### 【P1】验证关联范围 提示词：请选择 提示词正确

> 前置条件

```
无
```

##### 【P1】验证关联范围 选择枚举 字段级/表级/多表

> 前置条件

```
无
```

##### 【P1】验证关联范围 必选 为空提示

> 前置条件

```
无
```

##### 【P1】验证关联范围 仅支持单选 选择成功

> 前置条件

```
无
```

##### 【P1】验证规则描述

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 提示词：请输入 | 提示词正确 |
| 2 | 必填 | 为空提示 |
| 3 | 最大支持输入255 | 超长无法输入 |

##### 【P1】验证全局参数

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 点击全局参数 | 成功出现全局参数弹框 |
| 2 | 查看内容 | 内容正正确 |

##### 【P1】验证Sql面板

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 输入sql | 输入成功 |
| 2 | sql支持参数化 | 使用${xxxx}表示 |

##### 【P1】验证参数名称

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 当类型选择当前校验表 | 参数名称置灰无需配置 |
| 2 | 当类型选择其他类型 | 支持输入 |
| 3 | 必填 | 为空提示 |
| 4 | 最大支持输入50 | 超长无法输入 |

##### 【P1】验证参数说明

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 非必填 | 支持为空 |
| 2 | 最大支持输入255 | 超长无法输入 |
| 3 | 支持在规则配置页面“?”悬浮查看 | 内容和配置一致 |


##### 【P1】验证自定义sql-规则类型

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 提示词：选择规则类型 | 提示词正确 |
| 2 | 选择枚举 | 规则类型支持选择完整性/唯一性/准确性/及时性/一致性/规范性 |
| 3 | 必选 | 为空提示 |
| 4 | 仅支持单选 | 选择成功 |

##### 【P1】验证自定义sql-sql面板

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 引用规则选择「自定义模版」 | sql面板正常回显sql模版填写的sql，且不支持编辑；若引用的sql模版填写SQL发生变更，规则编辑更新 |

##### 【P1】验证校验字段

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 引入的自定义sql模版约定了“关联范围”为“字段级，多表” | 支持选择校验字段，反之不支持选择？ |
| 2 | 单表 | 不支持 |
| 3 | 校验字段 | 支持多选，非必填支持为空 |
| 4 | 枚举内容 | 表字段 |
| 5 | 选择校验字段后若存在不符合规则的明细数据 | 选择的字段进行标红展示 |

### 【规则调度设置】spark任务调参(#10190)

##### 【P1】验证Spark环境参数配置生效(spark.driver.maxResultSize)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.maxResultSize=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签确认该参数值 | 应为2g |

##### 【P1】验证Spark环境参数配置生效(spark.speculation)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.speculation=true 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签确认 spark.speculation | 应为true |

##### 【P1】验证Spark环境参数配置生效(spark.network.timeout)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.network.timeout=300s 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster，在 Environment 页签搜索该参数 | 确认 Value 为 300s |

##### 【P1】验证Spark环境参数配置生效(spark.sql.shuffle.partitions)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.sql.shuffle.partitions=10 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 点击 Tracking UI: ApplicationMaster 进入 Spark UI，在 Stages 页签查看 Shuffle 操作的 Tasks 总数 | 应为 10 |

##### 【P1】验证Spark环境参数配置生效(spark.yarn.executor.memoryOverhead)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.yarn.executor.memoryOverhead=1024(1g) 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【 Allocated Memory MB】字段下, 对应任务的值 | Allocated Memory MB 总量会增加。例如 executor.memory 为 1g 时，该字段应显示约 2048MB |

##### 【P1】验证Spark环境参数配置生效(spark.driver.memory)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.memory=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【 Allocated Memory MB】字段下, 对应任务的值 | 找到 AppMaster 对应的那个 Container，其 Allocated Memory MB 应为 2048MB + Overhead |

##### 【P1】验证Spark环境参数配置生效(spark.driver.cores)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.driver.cores=2 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Allocated CPU Vcores】字段下, 对应任务的值 | Allocated CPU Vcores 的总量应在默认基础上增加 1（因为 Driver 占用了更多核） |

##### 【P1】验证Spark环境参数配置生效(spark.executor.memory)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.memory=2g 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Allocated Memory MB】字段下, 对应任务的值 | 单个 Container 的 Allocated Memory MB 应显著增加（通常显示为 2048MB + Overhead |

##### 【P1】验证Spark环境参数配置生效(spark.executor.instances)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 点击【环境参数配置】, 设置spark.executor.instances=3 后保存 | 规则任务保存成功 |
| 4 | 运行规则任务 | 任务运行成功, 校验结果正常 |
| 5 | 进入Apache Hadoop YARN界面, 检查【Running Containers】字段下, 对应任务的值 | 【Running Containers】 字段应显示为 4 = 3 + 1 (Driver/AM) |

##### 【P1】验证调度属性新增环境参数配置(SparkThrift2.x)

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则任务管理】页面 | 进入成功 |
| 2 | 点击新建监控规则, 依次配置监控对象(SparkThrift2.x), 监控规则后, 点击下一步 | 进入【新建单表校验规则 ❯ 调度属性】配置页面 |
| 3 | 检查调度配置信息 | 新增配置: 环境参数配置 |
| 4 | 点击【环境参数配置】 | 进入【环境参数配置】页面, 可进行编辑 |
| 5 | 取消/确定 | 配置页面关闭 / 配置内容保存成功 |

### 【规则调度设置】任务时长限制(#10220)

##### 【P1】验证编辑不限制「超时时间」为自定义，功能正确

> 前置条件

```
存在规则A为不限制「超时时间」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量」页面 | 页面正常打开 |
| 2 | 选择「规则A」，点击编辑，进入「调度属性」页 | 页面正常打开 |
| 3 | 查看「超时时间」区域 | 显示为「不限制」 |
| 4 | 编辑「超时时间」选择「自定义」 | 弹出时间配置框，可配置小时、分钟 |
| 5 | 配置为：00时05分，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 6 | 临时运行规则，查看实例详情及质量报告 | 运行时间超过5分钟，该任务被自动杀掉，不再运行，未生成质量报告 |
| 7 | 查看任务状态 | 显示为“中途停止” |

##### 【P1】验证运行时长小于「超时时间」功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 正确配置「监控规则」，进入「调度属性」配置页 | 页面正常打开 |
| 4 | 正确配置「调度属性」，「超时时间」选择「自定义」 | 弹出时间配置框，可配置小时、分钟 |
| 5 | 配置为：10时00分，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 6 | 临时运行规则，查看实例详情及质量报告 | 运行时间小于10小时，生成正确实例详情，质量报告展示正确 |

##### 【P1】验证「超时时间」配置内容交互

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务管理-调度属性」页面 | 页面正常打开 |
| 2 | 查看区域配置内容 | 默认选择「不限制」 |
| 3 | 鼠标悬浮“？” | 悬浮提示：“任务运行时长大于超时时间时平台将对其强制杀死。” |
| 4 | 选择「自定义」 | 弹出时间配置框，可配置小时、分钟 |
| 5 | 点击小时下拉框 | 可选择“00～23” |
| 6 | 点击分钟下拉框 | 可选择“00～59” |

### 【质量规则库】内置规则增加规则项(#10191)

##### 【P1】验证【其它历史内置规则】规则状态变更正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则库配置】页面 | 进入成功 |
| 2 | 选择【其它历史内置规则】, 开启所有规则状态 | 开启成功 |
| 3 | 进入【规则集管理】, 新建规则集-监控规则配置页面 | 进入成功 |
| 4 | 点击「添加规则」, 检查下拉框数据 | 历史规则分类正常选择 |
| 5 | 选择完整性校验, 检查校验规则块中可选的内置规则 | 所有内置规则均可选择 |
| 6 | 依次选择有效性校验、唯一性校验、统计性校验, 检查规则块中的可选内置规则 | 所有内置规则均可选择 |
| 7 | 在「规则库配置」中, 关闭完整性校验~统计性校验的内置规则 | 规则状态全部关闭 |
| 8 | 重新进入【规则集管理】, 新建规则集-监控规则配置页面, 检查添加规则后的可选内置规则 | 已关闭的内置规则不再支持选择 |

##### 【P1】验证【内置规则-多字段时间差校验&单字段时间差校验】规则状态变更正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则库配置】页面 | 进入成功 |
| 2 | 选择【内置规则-多字段时间差校验&单字段时间差校验】, 开启规则状态 | 开启成功 |
| 3 | 进入【规则集管理】, 新建规则集-监控规则配置页面 | 进入成功 |
| 4 | 点击【添加规则】 | 新增三个规则分类: 1) 时效性校验2) 合理性校验 |
| 5 | 添加时效性校验后, 检查校验规则配置项 | 1) 支持配置规则: 多字段时间差校验、单字段时间差校验2) 选择该规则包的任务也不支持配置该内置规则 |
| 6 | 返回规则库配置, 关闭【内置规则-多字段时间差校验、单字段时间差校验】规则状态 | 关闭成功 |
| 7 | 重新进入规则集管理, 配置监控规则, 选择时效性校验 | 1) 时效性校验中: 不再支持配置规则(多字段时间差校验、单字段时间差校验)2) 选择该规则包的任务也不支持配置该内置规则 |
| 8 | 返回规则库配置, 筛选出所有【规则分类】为时效性校验的内置规则, 并关闭规则状态 | 关闭成功 |
| 9 | 重新进入规则集管理, 配置监控规则 | 1) 添加规则中不再支持: 时效性校验2) 选择该规则包的任务也不支持配置该规则类型 |

##### 【P1】验证【合理性校验】筛选功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则库配置】页面 | 进入成功 |
| 2 | 规则分类分类筛选: 合理性校验 | 筛选成功, 结果正确 |
| 3 | 规则分类分类筛选: 合理性校验 + 有效性校验 | 组合筛选成功, 结果正确 |
| 4 | 重置后, 确定 | 筛选成功, 结果正确 |

##### 【P1】验证【时效性校验】筛选功能正常

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则库配置】页面 | 进入成功 |
| 2 | 规则分类分类筛选: 时效性校验 | 筛选成功, 结果正确 |
| 3 | 规则分类分类筛选: 时效性校验 + 唯一性校验 | 组合筛选成功, 结果正确 |
| 4 | 重置后, 确定 | 筛选成功, 结果正确 |

##### 【P1】验证重复内置规则隐藏

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据资产】-【数据质量】-【规则库配置】页面 | 进入成功 |
| 2 | 检查内置规则列表 | 1) 规则分类为「有效性校验」，规则名称为「重复值检测」、「null值检测」的规则隐藏，不做展示2) 规则状态默认为关闭状态 |
| 3 | 进入【规则集管理】, 新建规则集-监控规则配置页面, 添加「有效性校验」规则 | 添加成功 |
| 4 | 检查有效性校验块的配置项 | 不再支持选择重复值检测、NULL值检测的规则 |

## v6.4.10

### 【内置规则丰富】一致性，多表数据一致性校验(#10353)

##### 【P1】验证「多表数据一致性比对」区域详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 点击【添加规则】按钮，选择「一致性校验」规则 | 选择成功，页面显示「一致性校验」规则配置区域 |
| 4 | 查看配置区域详情 | 包含： 1）「校验类型」，可选择多表数据一致性比对 2）「选择校验字段」，可选择数据表下所有字段 3）「选择校验表主键」，可选择数据表下所有字段 4）「选择对比表」，选择数据库下所有表，可配置多个对比表 5）「输入分区」，可配置「选择已有分区/动态分区/手动输入分区」 6）「数据预览」，可预览全表数据及分区数据 7）「选择对比表主键」，可选择对比表下所有字段 8）「比对字段设置」，展示「选择校验字段」 9）「强弱规则」，可选择「强/弱规则」 10）「规则描述」，可输入内容 11）「保存」、「取消」、「对比细节设置」按钮 |




##### 【P1】验证「多个对比表」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表1」为「${TABLE}」 「选择对比表1主键」为「id1」 「选择对比表2」为「${TABLE}」 「选择对比表2主键」为「id2」 「比对字段设置」配置为 「校验表-user_name-->对比表1-user_name，对比表2-user_name；校验表-age-->对比表1-age，对比表2-age」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「未选择校验字段」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 不配置「选择校验字段」 「选择校验表主键」选择为「id，name」 「选择对比表」为「${TABLE}」 配置「输入分区-选择已有分区」 「选择对比表主键」为「id，name」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「未选择校验字段」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 不配置「选择校验字段」 「选择校验表主键」选择为「id，name」 「选择对比表」为「${TABLE}」 配置「输入分区-动态输入分区」 「选择对比表主键」为「age，id」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果不通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「设置比对细节」校验通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为「校验表-user_name-->对比表-user_name；校验表-age-->对比表-age」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 配置「对比细节设置」为「数值差异百分比-小于等于80%」、「数值差异绝对值-小于等于80」、「数值对比忽略小数点-忽略小数点后2位」、「字符不区分大小写」、「空值与NULL等价」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果通过，且实例详情展示正确，质量报告展示正确 |

##### 【P1】验证「设置比对细节」校验不通过功能

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为「校验表-user_name-->对比表-user_name；校验表-age-->对比表-age」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 配置「对比细节设置」为「数值差异百分比-小于等于0%」、「数值差异绝对值-小于等于0」、「数值对比忽略小数点-忽略小数点后2位」、「字符不区分大小写」、「空值与NULL等价」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则，查看实例详情及质量报告 | 实例运行结果不通过，且实例详情展示正确，质量报告展示正确 |



##### 【P1】验证「多表数据一致性比对」任务通过结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为「校验表-user_name-->对比表-user_name；校验表-age-->对比表-age」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 包含「一致性校验」-「多表数据一致性比对」配置的详情、比对字段设置详情、比对规则详情（仅展示勾选的） |
| 8 | 点击【表级报告】tab | 包含 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |

##### 【P1】验证「多表数据一致性比对」任务不通过/失败 结果详情正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 「监控规则」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为「校验表-user_name-->对比表-age；校验表-age-->对比表-name」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果符合预期 |
| 6 | 查看不通过的实例详情 | 抽屉式展开详情，页面包含： 任务名称、监控报告tab、表级报告tab |
| 7 | 点击【监控报告】tab | 1）都展示「一致性校验」-「多表数据一致性比对」配置的详情； 2）校验未通过的规则支持查看明细 |
| 8 | 点击【表级报告】tab | 包含： 1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示“--”； 2）表级统计（记录数、报警数），空白时显示“--”； 3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）； 4）最近30次表级统计； 5）最近30次表数据波动图 |
| 9 | 查看运行失败的示例详情 | 1）展示「一致性校验」-「多表数据一致性比对」配置的详情； 2）运行失败的规则支持查看日志 |

##### 【P1】验证「多表数据一致性比对」不通过任务查看明细正确

> 前置条件

```
已存在spark表A
CREATE TABLE IF NOT EXISTS
tableA (
create_date DATE COMMENT '日期类型',
update_datetime TIMESTAMP COMMENT '日期时间类型（替代原DATETIME）',
work_time STRING COMMENT '时间类型（Spark无TIME类型，用STRING存储HH:mm:ss）',
sync_timestamp TIMESTAMP COMMENT '时间戳类型',
date_str_ymd STRING COMMENT '字符串日期(yyyy-MM-dd)，强转DATE',
date_str_ymd_hms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss)，强转TIMESTAMP',
date_str_mdy STRING COMMENT '字符串时间(HH:mm:ss)，强转STRING（Spark无TIME类型）',
date_str_ymd_hms_ms STRING COMMENT '字符串日期时间(yyyy-MM-dd HH:mm:ss.SSS)，强转TIMESTAMP',
date_str_irregular STRING COMMENT '字符串日期(非标准格式，如20260204)，强转DATE',
id INT COMMENT '主键ID',
user_name STRING COMMENT '用户名（Spark中VARCHAR等价于STRING）',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '时效性校验表';

INSERT INTO tableA (
create_date,
update_datetime,
work_time,
sync_timestamp,
date_str_ymd,
date_str_ymd_hms,
date_str_mdy,
date_str_ymd_hms_ms,
date_str_irregular,
id,
user_name,
age,
phone,
email,
salary,
is_active,
address,
score,
total_amount
)
VALUES
(
DATE '2026-02-26',
TIMESTAMP '2026-02-26 09:45:17',
'08:30:00',
CURRENT_TIMESTAMP(),
'2026-02-26',
'2026-02-26 09:45:17',
'18:20:30',
'2026-02-26 09:45:17.123',
'20260226',
1,
'zhangsan',
25,
13800138000,
'zhangsan@example.com',
15000.50,
TRUE,
'北京市海淀区中关村',
95.5,
123456.789
),
(
DATE '2026-01-01',
TIMESTAMP '2026-12-31 23:59:59',
'23:59:59',
TIMESTAMP '2026-02-26 12:00:00',
'2026-01-01',
'2026-12-31 23:59:59',
'00:00:00',
'2026-02-26 12:34:56.789',
'20260101',
2,
'lisi',
30,
13900139000,
'lisi@example.com',
20000.00,
FALSE,
'上海市浦东新区陆家嘴',
88.8,
987654.321
),
(
DATE '1970-01-01',
TIMESTAMP '1970-01-01 00:00:00',
'',
NULL,
'',
'',
'',
'',
'20260204',
3,
'',
0,
0,
'',
0.00,
NULL,
'',
0.0,
0.0
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则任务配置-监控对象」页面 | 页面正常打开 |
| 2 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 3 | 「监控规则」配置如下： 1）（选择校验字段且不配置对比细节：） 「监控规则1」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「user_name；age」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为 「校验表-user_name-->对比表-age；校验表-age-->对比表-user_name」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 2）（选择校验字段且配置对比细节：） 「监控规则2」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 「选择校验字段」选择为「phone 」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「比对字段设置」配置为 「校验表-phone -->对比表-age」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 配置「对比细节设置」为「数值差异百分比-小于等于0%」 3）（不选择校验字段：） 「监控规则3」新增「一致性校验」 「校验类型」选择为「多表数据一致性比对」 不配置「选择校验字段」 「选择校验表主键」选择为「id」 「选择对比表」为「${TABLE}」 「选择对比表主键」为「id」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 不配置「对比细节设置」 | 监控规则配置完成； 进入「调度属性」页面 |
| 4 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 5 | 临时运行规则 | 实例运行结果不通过 |
| 6 | 点击查看不通过明细 | 1）标题显示为“查看“一致性校验-多表数据一致性比对”明细” 2）记录所有不符合规则的数据 3）列表显示，表头为规则校验的「表.主键」、「表.字段」 4）不做标红处理 |
| 7 | 点击【下载明细】按钮 | 支持下载明细，内容正确 |

### 【内置规则丰富】合理性，单表，字段值的计算关系对比(#10451)

##### 【P1】验证「字段值计算对比」关联规则数显示正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 2 | 找到「字段值计算对比」规则，查看「关联规则数」列 | 默认为0 |
| 3 | 切换至「资产-数据质量-规则集管理-新增规则集」页面，添加「合理性校验-字段值计算对比」规则 | 保存成功 |
| 4 | 切换至「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 5 | 找到「字段值计算对比」规则，查看「关联规则数」列和「规则状态」列 | 「关联规则数」显示为1，「规则状态」开关置灰，不可更改 |
| 6 | 删除「规则集管理」-「合理性校验」-「字段值计算对比」规则 | 删除成功 |
| 7 | 查看「规则库配置」-「合理性校验」-「字段值计算对比」 | 「关联规则数」显示为0，「规则状态」开关可更改 |

##### 【P1】验证「字段值计算对比」开/关规则状态功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 2 | 找到「字段值计算对比」规则，查看「规则状态」列 | 默认开启的状态 |
| 3 | 切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则 | 添加成功 |
| 4 | 查看「合理性校验」-「统计函数」下拉项 | 显示「字段值计算对比」项 |
| 5 | 切换至「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 6 | 找到「字段值计算对比」规则，修改「规则状态」为关闭状态 | 修改成功 |
| 7 | 切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则 | 添加成功 |
| 8 | 查看「合理性校验」-「统计函数」下拉项 | 不显示「字段值计算对比」项 |



##### 【P1】验证「字段值计算对比」编辑功能

> 前置条件

```
1、存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

2、平台已存在结果为通过的「合理性校验」-「字段值计算对比」规则「test_rule1」，以下两个子规则都通过
1）子规则一：「合理性校验」-「字段值计算对比」-「计算结果与字段对比」：
「字段」：「 field_int 」
「统计函数」：「 字段值计算对比」
「计算逻辑配置」：「field_tinyint+field_smallint」
「对比方法」：「计算结果与字段对比」
「对比规则」：「 field_int >field_tinyint +field_smallint」
「强弱规则」：「弱规则」
「规则描述」：「测试规则」
2）子规则二：「合理性校验」-「字段值计算对比」-「计算结果值判断」：
「字段」：「 field_int 」
「统计函数」：「 字段值计算对比」
「计算逻辑配置」：「field_tinyint*field_smallint」
「对比方法」：「计算结果值判断」
「结果值」：「 >=100或!=1」
「强弱规则」选择「弱规则」
「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理」页面 | 页面正常打开 |
| 2 | 点击表名为table_test的编辑按钮 | 「监控规则」为「合理性校验」； 1）子规则一：「合理性校验」-「字段值计算对比」-「计算结果与字段对比」： 「字段」：「 field_int 」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint+field_smallint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_int >field_tinyint +field_smallint」 「强弱规则」：「弱规则」 「规则描述」：「测试规则」 2）子规则二：「合理性校验」-「字段值计算对比」-「计算结果值判断」： 「字段」：「 field_int 」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「 >=100或!=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 3）全部置灰显示，不可编辑 |
| 3 | 查看页面回显 | 1）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑 2）「选择数据库」置灰显示「${DATABASE}」，不可编辑 3）「选择数据表」置灰显示「${TABLE}」，不可编辑 4）规则包可编辑 |
| 4 | 点击下一步按钮 | 进入编辑规则集-监控规则页面 |
| 5 | 查看页面回显，并编辑 | 「监控规则」为「合理性校验」； 1）子规则一：「合理性校验」-「字段值计算对比」-「计算结果与字段对比」： 「字段」：「 field_int 」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint+field_smallint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_int >field_tinyint +field_smallint」 「强弱规则」：「弱规则」 「规则描述」：「测试规则」 2）子规则二：「合理性校验」-「字段值计算对比」-「计算结果值判断」： 「字段」：「 field_int 」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「 >=100或!=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 3）编辑子规则二：「结果值」为「 =100且!=1」 |
| 6 | 点击保存按钮 | 正常保存 |
| 7 | 进入「资产-数据质量-规则任务配置」页面 | 页面正常打开 |
| 8 | 点击规则名称「test_rule1」的编辑按钮 | 进入「编辑单表校验规则-监控对象」页 |
| 9 | 查看页面内容回显 | 1）「规则名称」显示「test_rule1」，可编辑 2）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑 3）「选择数据库」置灰显示「${DATABASE}」，不可编辑 4）「选择数据表」置灰显示「${TABLE}」，不可编辑 |
| 10 | 编辑「规则名称」为「test_rule1_new」，点击下一步按钮 | 进入「编辑单表校验规则-监控规则」页 |
| 11 | 查看页面内容回显 | 1、显示规则包引入区域，可更新引入 |
| 12 | 更新引入规则包 | 子规则二的「结果值」更新为「 =100且!=1」 ，其余不变，置灰不可编辑 |
| 13 | 点击下一步按钮 | 监控规则配置完成； 进入「调度属性」页面 |
| 14 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 15 | 临时运行规则，进入校验结果查询页面 | 显示实例中子规则一运行通过，子规则二运行不通过 |


##### 【P1】验证「string类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「string_number」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「>=0或!=100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「string_chinese」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_int-field_tinyint」 「对比方法」：「计算结果值判断」 「结果值」：「=1且!=100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「decimal/numeric类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_decimal」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_float+field_double)/0.00001」 「对比方法」：「计算结果值判断」 「结果值」：「>=0」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_numeric」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_integer-field_double)*field_integer」 「对比方法」：「计算结果值判断」 「结果值」：「=100或=200」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「double类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_double」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_float+field_decimal」 「对比方法」：「计算结果值判断」 「结果值」：「>=0或>=100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_double」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_bigint-field_numeric)*field_bigint」 「对比方法」：「计算结果值判断」 「结果值」：「<10或<1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「float类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_float」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_bigint-field_float」 「对比方法」：「计算结果值判断」 「结果值」：「!=1.5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_float」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_float-string_chinese」 「对比方法」：「计算结果值判断」 「结果值」：「=1.5」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「bigint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_bigint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「>=0或>=100」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_bigint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(string_number-string_chinese)/string_number」 「对比方法」：「计算结果值判断」 「结果值」：「<15且!=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「int/integer类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_int」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_decimal-string_number」 「对比方法」：「计算结果值判断」 「结果值」：「>=0且!=987845154.255489」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_integer」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_integer+string_chinese)/field_integer」 「对比方法」：「计算结果值判断」 「结果值」：「=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「smallint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_smallint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_int*field_bigint」 「对比方法」：「计算结果值判断」 「结果值」：「 >1000或=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_smallint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_bigint-field_int)/field_int」 「对比方法」：「计算结果值判断」 「结果值」：「 <1000且>10」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「tinyint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_tinyint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「 >=100或!=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_tinyint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint+field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「 =100且!=1」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「string类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「string_number」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint*field_tinyint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「string_number<=field_tinyint*field_smallint*field_tinyint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「string_chinese」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_int-field_tinyint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「string_chinese=field_int-field_tinyint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「decimal/numeric类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_decimal」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_float+field_double)/field_double」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_decimal< (field_float+field_double)/field_double」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_numeric」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_integer-field_double)*field_integer」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_numeric=(field_integer-field_double)*field_integer」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「double类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_double」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_float+field_decimal」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_double < field_float+field_decimal」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_double」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_bigint-field_numeric)*field_bigint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_double>(field_bigint-field_numeric)*field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「float类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「field_float」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_bigint-field_float」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_float != field_bigint-field_float」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「field_float」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_float-string_chinese」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_float>field_float-string_chinese」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「bigint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_bigint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_tinyint*field_smallint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「field_bigint>field_tinyint*field_smallint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_bigint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(string_number-string_chinese)/string_number」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_bigint=(string_number-string_chinese)/string_number」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「int/integer类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_int」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_decimal-string_number」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_int>field_decimal-string_numbe」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_integer」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_int+string_chinese)/field_int」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_integer<(field_int+string_chinese)/field_int」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「smallint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_smallint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_int*field_bigint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_smallint != field_int*field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_smallint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_bigint-field_int)/field_bigint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_smallint>(field_bigint - field_int)/field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「tinyint类型」校验功能

> 前置条件

```
存在表A
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_tinyint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「field_smallint/field_int」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_tinyint != field_smallint/field_int」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_tinyint」 「统计函数」：「 字段值计算对比」 「计算逻辑配置」：「(field_smallint+field_integer)/field_smallint」 「对比方法」：「计算结果与字段对比」 「对比规则」：「 field_tinyint>=(field_smallint+field_integer)/field_smallint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

### 【内置规则丰富】合理性，多表，字段大小对比以及字段计算逻辑对比(#10452)

##### 【P1】验证「多表字段值对比」关联规则数显示正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 2 | 找到「多表字段值对比」规则，查看「关联规则数」列 | 默认为0 |
| 3 | 切换至「资产-数据质量-规则集管理-新增规则集」页面，添加「合理性校验-多表字段值对比」规则 | 保存成功 |
| 4 | 切换至「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 5 | 找到「多表字段值对比」规则，查看「关联规则数」列和「规则状态」列 | 「关联规则数」显示为1，「规则状态」开关置灰，不可更改 |
| 6 | 删除「规则集管理」-「合理性校验」-「多表字段值对比」规则 | 删除成功 |
| 7 | 查看「规则库配置」-「合理性校验」-「多表字段值对比」 | 「关联规则数」显示为0，「规则状态」开关可更改 |

##### 【P1】验证「多表字段值对比」开/关规则状态功能正确

> 前置条件

```
无
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 2 | 找到「多表字段值对比」规则，查看「规则状态」列 | 默认开启的状态 |
| 3 | 切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则 | 添加成功 |
| 4 | 查看「合理性校验」-「统计函数」下拉项 | 显示「多表字段值对比」项 |
| 5 | 切换至「资产-数据质量-规则库配置」页面 | 页面正常打开 |
| 6 | 找到「多表字段值对比」规则，修改「规则状态」为关闭状态 | 修改成功 |
| 7 | 切换至「资产-数据质量-规则集管理-新增规则集-监控规则」页面，添加「合理性校验」规则 | 添加成功 |
| 8 | 查看「合理性校验」-「统计函数」下拉项 | 不显示「多表字段值对比」项 |




##### 【P1】验证关联表配置分区校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 4, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

分区表test_fenqu
CREATE TABLE IF NOT EXISTS test_fenqu(
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
)
PARTITIONED BY (dt DATE)
STORED AS ORC;

INSERT INTO test_fenqu PARTITION(dt='2025-11-05') VALUES
(1, 1, 1, 1, 1, 1.1, 1.11, 10.00, 100.00, '001', '张三', 'Zhang', '2024-01-01', TRUE, NULL, 1, 'zhang', 25, 13800138001, 'zhang@test.com', 5000.00, TRUE, '北京', 85.5, 10000.00),
(2, 2, 2, 2, 2, 2.2, 2.22, 20.00, 200.00, '002', '李四', 'Li', '2024-01-02', FALSE, NULL, 2, 'li', 30, 13800138002, 'li@test.com', 6000.00, FALSE, '上海', 90.0, 15000.00),
(3, 3, 3, 3, 3, 3.3, 3.33, 30.00, 300.00, '003', '王五', 'Wang', '2024-01-03', TRUE, NULL, 3, 'wang', 28, 13800138003, 'wang@test.com', 5500.00, TRUE, '深圳', 88.0, 12000.00);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 test_fenqu」，「关联表1主键」：「id」 「计算逻辑配置1」：「A.field_tinyint+test_fenqu.field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 test_fenqu」，「关联表1主键」：「id」 「计算逻辑配置1」：「（A.field_tinyint+test_fenqu.field_smallint）*A.field_tinyint」 「对比方法」：「计算结果值判断」 「结果值」：「>1且=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「选择已有分区」：「dt='2025-11-05'」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「多表字段值对比」主键关联数据不一致时不支持校验

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 「字段」：「 field_int 」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「name」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint+B.field_bigint」 「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例运行结果为运行失败，日志报错主键关联数据不一致 |

##### 【P1】验证「多表字段值对比」编辑功能

> 前置条件

```
1、已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);

2、平台已存在结果为通过的「合理性校验」-「多表字段值对比」规则「test_rule1」，以下两个子规则都通过
1）子规则一：「合理性校验」-「多表字段值对比」-「计算结果对比」： 「字段」：「 field_int 」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint+B.field_bigint」 「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 2）子规则二：「合理性校验」-「多表字段值对比」-「计算结果值判断」： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_float-B.field_float）/A.field_float」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理」页面 | 页面正常打开 |
| 2 | 点击表名为A的编辑按钮 | 「监控规则」为「合理性校验」； 1）子规则一：「合理性校验」-「多表字段值对比」-「计算结果对比」： 「字段」：「 field_int 」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint+B.field_bigint」 「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 2）子规则二：「合理性校验」-「多表字段值对比」-「计算结果值判断」： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_float-B.field_float）/A.field_float」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 3）全部置灰显示，不可编辑 |
| 3 | 查看页面回显 | 1）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑 2）「选择数据库」置灰显示「${DATABASE}」，不可编辑 3）「选择数据表」置灰显示「${TABLE}」，不可编辑 4）规则包可编辑 |
| 4 | 点击下一步按钮 | 进入编辑规则集-监控规则页面 |
| 5 | 查看页面回显，并编辑 | 「监控规则」为「合理性校验」； 1）子规则一：「合理性校验」-「多表字段值对比」-「计算结果对比」： 「字段」：「 field_int 」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint+B.field_bigint」 「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint+B.field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 2）子规则二：「合理性校验」-「多表字段值对比」-「计算结果值判断」： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_float-B.field_float）/A.field_float」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 3）编辑子规则二：「结果值」为「 =100且!=1」 |
| 6 | 点击保存按钮 | 正常保存 |
| 7 | 进入「资产-数据质量-规则任务配置」页面 | 页面正常打开 |
| 8 | 点击规则名称「test_rule1」的编辑按钮 | 进入「编辑单表校验规则-监控对象」页 |
| 9 | 查看页面内容回显 | 1）「规则名称」显示「test_rule1」，可编辑 2）「选择数据源」置灰显示「${DATASOURCE}」，不可编辑 3）「选择数据库」置灰显示「${DATABASE}」，不可编辑 4）「选择数据表」置灰显示「${TABLE}」，不可编辑 |
| 10 | 编辑「规则名称」为「test_rule1_new」，点击下一步按钮 | 进入「编辑单表校验规则-监控规则」页 |
| 11 | 查看页面内容回显 | 1、显示规则包引入区域，可更新引入 |
| 12 | 更新引入规则包 | 子规则二的「结果值」更新为「 =100且!=1」 ，其余不变，置灰不可编辑 |
| 13 | 点击下一步按钮 | 监控规则配置完成； 进入「调度属性」页面 |
| 14 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 15 | 临时运行规则，进入校验结果查询页面 | 显示实例中子规则一运行通过，子规则二运行不通过 |

##### 【P1】验证「string类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 string_number」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.string_number*B.string_number」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 string_chinese」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.string_chinese+B.field_numeric」 「对比方法」：「计算结果值判断」 「结果值」：「>=9999且<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「decimal/numeric类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_decimal」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_decimal*B.field_decimal」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或>10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_numeric」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_numeric+B.field_numeric）*A.field_numeric」 「对比方法」：「计算结果值判断」 「结果值」：「>=1且=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「double类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_double」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_double*B.field_double」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或!=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_double」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_double+B.field_double）*A.field_double」 「对比方法」：「计算结果值判断」 「结果值」：「<10或=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「float类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_float*B.string_chinese」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_float+B.field_float）*A.field_float」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_float*B.field_float」 「对比规则」：「（A.field_float+B.field_float）「对比方法」：「计算结果值判断」 「结果值」：「=1或=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「bigint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_bigint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_bigint*B.field_tinyint」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_bigint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_bigint+B.string_number）*A.field_bigint」 「对比方法」：「计算结果值判断」 「结果值」：「>=10且<20」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「int/integer类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_int」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_int+B.field_tinyint」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_integer」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_integer+B.field_smallint）*A.field_integer」 「对比方法」：「计算结果值判断」 「结果值」：「>1000且<1001」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「smallint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_smallint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_smallint+B.field_int」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<100000000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_smallint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_smallint+B.field_smallint）*A.field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「>=1000000000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「tinyint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果值判断」 「结果值」：「>=1或<=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_tinyint+B.field_smallint）*A.field_tinyint」 「对比方法」：「计算结果值判断」 「结果值」：「>1且=10000」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「string类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-字段值计算对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-字段值计算对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 string_number」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.string_number*B.string_number」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「（A.string_number+B.string_number）/A.string_number」 「对比规则」：「A.string_number*B.string_number>=（A.string_number+B.string_number）/A.string_number」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 string_chinese」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.string_chinese+B.field_numeric」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_numeric*B.string_chinese」 「对比规则」：「A.string_chinese+B.field_numeric=A.field_numeric*B.string_chinese」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-字段值计算对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「decimal/numeric类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_decimal」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_decimal*B.field_decimal」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「（A.field_decimal+B.field_decimal）/A.field_decimal」 「对比规则」：「A.field_decimal*B.field_decimal>=（A.field_decimal+B.field_decimal）/A.field_decimal」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_numeric」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_numeric+B.field_numeric）*A.field_numeric」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_numeric*B.field_numeric」 「对比规则」：「（A.field_numeric+B.field_numeric）*A.field_numeric<A.field_numeric*B.field_numeric」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「double类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_double」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_double*B.field_double」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「（A.field_double+B.field_double）*A.field_double」 「对比规则」：「A.field_double*B.field_double<= （A.field_double+B.field_double）*A.field_double」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_double」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_double+B.field_double）*A.field_double」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_double*B.field_double」 「对比规则」：「（A.field_double+B.field_double）*A.field_double<=A.field_double*B.field_double」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「float类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_float*B.string_chinese」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_smallint+B.field_float-B.string_chinese」 「对比规则」：「A.field_float*B.string_chinese >= A.field_smallint+B.field_float-B.string_chinese」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_float」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_float+B.field_float）*A.field_float」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_float*B.field_float」 「对比规则」：「（A.field_float+B.field_float）*A.field_float<=A.field_float*B.field_float」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「bigint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_bigint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_bigint*B.field_tinyint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_smallint+B.field_bigint」 「对比规则」：「A.field_bigint*B.field_tinyint>=A.field_smallint+B.field_bigint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_bigint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_bigint+B.string_number）*A.field_bigint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_double*B.field_bigint」 「对比规则」：「（A.field_bigint+B.string_number）*A.field_bigint=A.field_double*B.field_bigint」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「int/integer类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_int」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_int+B.field_tinyint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_integer+B.field_int」 「对比规则」：「A.field_int+B.field_tinyint<=A.field_integer+B.field_int」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_integer」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_integer+B.field_smallint）*A.field_integer」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_integer*B.field_integer」 「对比规则」：「（A.field_integer+B.field_smallint）*A.field_integer=A.field_integer*B.field_integer」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「smallint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_smallint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_smallint+B.field_int」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint+B.field_smallint」 「对比规则」：「A.field_smallint+B.field_int<=A.field_bigint+B.field_smallint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_smallint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_smallint+B.field_smallint）*A.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「（A.field_bigint+B.field_smallint）/B.field_smallint」 「对比规则」：「（A.field_smallint+B.field_smallint）*A.field_smallint<=（A.field_bigint+B.field_smallint）/B.field_smallint」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

##### 【P1】验证「tinyint类型」校验功能

> 前置条件

```
已存在表A：
CREATE TABLE IF NOT EXISTS lantu_test.A (
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
id INT COMMENT 'ID',
user_name STRING COMMENT '用户名',
age TINYINT COMMENT '年龄',
phone BIGINT COMMENT '手机号',
email STRING COMMENT '邮箱',
salary DECIMAL(10, 2) COMMENT '薪资',
is_active BOOLEAN COMMENT '是否激活',
address STRING COMMENT '地址',
score FLOAT COMMENT '评分',
total_amount DOUBLE COMMENT '总金额'
) COMMENT '测试表A';
INSERT INTO lantu_test.A VALUES
(
1, 100, 10000, 100000, 1000000, 3.14, 3.1415926535,
12345.67, 98765.4321, '12345', '你好世界', 'Hello World',
DATE('2024-01-15'), TRUE, X'48656C6C6F', 1, '张三', 25, 13812345678,
'zhangsan@example.com', 8500.00, TRUE, '北京市朝阳区', 4.8, 99999.99
),
(
2, 200, 20000, 200000, 2000000, 2.718, 2.718281828,
23456.78, 54321.9876, '67890', '测试数据', 'Test Data',
DATE('2024-02-20'), FALSE, X'576F726C64', 2, '李四', 30, 13987654321,
'lisi@example.com', 12000.00, FALSE, '上海市浦东新区', 4.2, 150000.00
),
(
3, 50, 5000, 50000, 500000, 1.414, 1.414213562,
34567.89, 12345.6789, '99999', '示例数据', 'Sample Data',
DATE('2024-03-10'), TRUE, X'537061726B', 3, '王五', 28, 13711223344,
'wangwu@example.com', 9500.00, TRUE, '广州市天河区', 4.5, 88000.00
);

表B：
CREATE TABLE IF NOT EXISTS lantu_test.B(
--数值型
field_tinyint TINYINT COMMENT 'TINYINT类型',
field_smallint SMALLINT COMMENT 'SMALLINT类型',
field_int INT COMMENT 'INT类型',
field_integer INTEGER COMMENT 'INTEGER类型',
field_bigint BIGINT COMMENT 'BIGINT类型',
field_float FLOAT COMMENT 'FLOAT类型',
field_double DOUBLE COMMENT 'DOUBLE类型',
field_decimal DECIMAL(10, 2) COMMENT 'DECIMAL类型',
field_numeric NUMERIC(15, 4) COMMENT 'NUMERIC类型',
-- STRING类型
string_number STRING COMMENT '数字字符串',
string_chinese STRING COMMENT '中文字符串',
string_english STRING COMMENT '英文字符串',
field_date DATE COMMENT '日期',
field_boolean BOOLEAN COMMENT '布尔类型',
field_binary BINARY COMMENT '二进制类型',
b_id INT COMMENT 'ID',
b_name STRING COMMENT '用户名',
email STRING COMMENT '邮箱',
is_active BOOLEAN COMMENT '是否激活'
) COMMENT '测试表B';
INSERT INTO lantu_test.B VALUES
(
1,100,10000,100000,1000000,3.14,3.1415926535,12345.67,98765.4321,'12345','你好世界','Hello World',DATE('2024-01-15') ,TRUE,X'48656C6C6F',
1,  -- 匹配A表a_id=1
'张三',  -- 匹配A表a_name = '张三'
'zhangsan@example.com',TRUE
),
(
2,200,20000,200000,2000000,2.718,2.718281828,23456.78,54321.9876,'67890','测试数据','Test Data',DATE('2024-02-20') ,FALSE,X'576F726C64',
3,  -- 匹配A表a_id=3
'张四','zhangsan2@example.com',FALSE
),
(    3,50,5000,50000,500000,1.414,1.414213562,34567.89,12345.6789,'99999','示例数据','Sample Data',DATE('2024-03-10') ,TRUE,X'537061726B',
5,'李四',  -- 匹配A表a_name = '李四'
'lisi@example.com',TRUE
);
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入「资产-数据质量-规则集管理-基础信息」页面 | 页面正常打开 |
| 2 | 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 「规则包名称」填写「合理性-多表字段值对比」 | 基础信息配置成功； 进入「监控规则」配置页 |
| 3 | 点击「新增规则包」-「合理性-多表字段值对比」，点击【添加规则-合理性校验】 | 选择成功，页面显示「合理性校验」规则配置区域 |
| 4 | 「监控规则」配置如下： 子规则一： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「A.field_tinyint+B.field_smallint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「A.field_bigint-B.field_tinyint」 「对比规则」：「A.field_tinyint+B.field_smallint>A.field_bigint-B.field_tinyint」 「强弱规则」选择「弱规则」 「规则描述」输入「测试规则」 子规则二： 「字段」：「 field_tinyint」 「统计函数」：「 多表字段值对比」 「校验表主键」：「id」 「关联表1」：「 B」，「关联表1主键」：「 id」 「计算逻辑配置1」：「（A.field_tinyint+B.field_smallint）*A.field_tinyint」 「对比方法」：「计算结果对比」 「计算逻辑配置2」：「（A.field_bigint+B.field_tinyint）/B.field_tinyint」 「对比规则」：「（A.field_tinyint+B.field_smallint）*A.field_tinyint<（A.field_bigint+B.field_tinyint）/B.field_tinyint」 | 监控规则配置完成 |
| 5 | 点击【保存】按钮 | 规则保存成功 |
| 6 | 进入「规则任务管理-监控对象」页面 | 页面正常打开 |
| 7 | 「规则名称」输入「test_rule」 「选择数据源」选择「${DATASOURCE}」 「选择数据库」选择「${DATABASE}」 「选择数据表」选择「${TABLE}」 | 监控对象配置成功； 进入「监控规则」配置页 |
| 8 | 引入规则包「合理性-多表字段值对比」，点击「下一步」按钮 | 引入正确，规则内容置灰，进入「调度属性」 |
| 9 | 配置「调度属性」，保存规则，且「调度属性」中配置「规则报告」为最新结果 | 规则保存成功 |
| 10 | 临时运行规则，查看实例详情 | 实例中子规则一结果通过，子规则二结果不通过，且实例详情展示正确 |

### 【内置规则丰富】完整性，json中key值范围校验(#10460)

##### 【P1】验证 验证质量报告中校验不通过行的各列展示内容正确

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【key范围校验】，字段选择 info，校验方法选择【包含】，校验内容选择 key1 和 key2，点击规则行【保存】，再点击页面底部【保存】完成规则集创建；并通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中规则名称=task_json_key_range_test、数据源=Doris、数据库=qa_test、数据表=test_json_key_range，点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入“key范围校验测试包“，点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功并已执行完成；在【数据质量 → 校验结果查询】页面已生成对应实例记录
3) 存在质检结果为“校验不通过“的记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待页面加载完成 | 数据质量报告页面正常打开，报告列表加载完成 |
| 2 | 找到“task_json_key_range_test“，查看最新一次执行的报告详情 | 报告详情页正常打开，数据加载完成 |
| 3 | 找到质检结果为“校验不通过“的规则行，逐列查看各字段值，并点击操作列的【查看详情】按钮 | 该规则行各列展示正确： 1) 规则类型列=完整性校验 2) 规则名称列=key范围校验 3) 字段类型列=json 4) 质检结果=校验不通过 5) 未通过原因列=key范围校验未通过 6) 详情说明列=不符合规则key范围包含“key1-key2“ 7) 操作列显示【查看详情】按钮，点击后跳转至明细页 |

##### 【P1】验证 验证质量报告中校验通过行的各列展示内容正确

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【key范围校验】，字段选择 info，校验方法选择【包含】，校验内容选择 key1 和 key2，点击规则行【保存】，再点击页面底部【保存】完成规则集创建；并通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中规则名称=task_json_key_range_test、数据源=Doris、数据库=qa_test、数据表=test_json_key_range，点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入“key范围校验测试包“，点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功并已执行完成；在【数据质量 → 校验结果查询】页面已生成对应实例记录
3) 存在质检结果为“校验通过“的记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待页面加载完成 | 数据质量报告页面正常打开，报告列表加载完成 |
| 2 | 找到“task_json_key_range_test“，查看最新一次执行的报告详情 | 报告详情页正常打开，数据加载完成 |
| 3 | 找到质检结果为“校验通过“的规则行，逐列查看各字段值 | 该规则行各列展示正确： 1) 规则类型列=完整性校验 2) 规则名称列=key范围校验 3) 字段类型列=json 4) 质检结果=校验通过 5) 未通过原因列=-- 6) 详情说明列=符合规则key范围包含“key1-key2“ 7) 操作列=-- |



##### 【P1】验证校验失败时支持查看日志

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“故障测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“故障测试包“中点击【新增规则】，统计函数选择【key范围校验】，字段选择 info，校验方法选择【包含】，校验内容选择已配置但随后被删除的 key（如 key_deleted_test），点击规则行【保存】，再点击页面底部【保存】完成规则集创建；并通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中规则名称=task_json_fail_test、数据源=Doris、数据库=qa_test、数据表=test_json_key_range，点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入“故障测试包“，点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功；随后在通用配置中删除 key_deleted_test，再执行任务“task_json_fail_test“，任务执行失败；在【数据质量 → 校验结果查询】页面已生成该任务执行状态为“执行失败“的实例记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待页面加载完成 | 校验结果查询页面正常打开，列表加载完成 |
| 2 | 找到“task_json_fail_test“，找到执行状态为“执行失败“的记录行 | 目标记录可正常定位，执行状态与实际一致 |
| 3 | 点击该记录行操作列的【查看日志】按钮，等待日志内容加载 | 日志弹窗正常打开，显示任务执行失败的错误日志内容，日志内容包含报错时间戳和错误描述信息 |

##### 【P1】验证校验通过时结果查询页不显示明细入口

> 前置条件

```
1) 已在Doris表test_json_key_range中插入数据：
   INSERT INTO test_json_key_range VALUES (20, '{“key1“:“赵六“,“key2“:35}');
   （包含key1和key2）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过规则集管理配置包含key1和key2的key范围校验规则，并在规则任务管理中通过【导入规则包】引用该规则集，创建任务“task_json_key_range_test“并已执行完成；在【数据质量 → 校验结果查询】页面已生成该任务最新实例记录
4) id=20记录质检结果为“校验通过“
注：上述任务创建已完成 Step 3 调度属性配置
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待页面加载完成 | 校验结果查询页面正常打开，列表加载完成 |
| 2 | 找到“task_json_key_range_test“最新执行记录 | 执行记录正常展示，可定位到目标记录 |
| 3 | 找到质检结果为“校验通过“的规则行，查看操作列 | 质检结果为“校验通过“的规则行，操作列显示“--“，不显示【查看明细】按钮，无法进入明细页 |

##### 【P1】验证校验不通过时查看明细：标题、字段标红及全字段展示

> 前置条件

```
1) 已在Doris表test_json_key_range中插入数据：
   INSERT INTO test_json_key_range VALUES (10, '{“key1“:“王五“}');
   （仅含key1，缺key2）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【key范围校验】，字段选择 info，校验方法选择【包含】，校验内容选择 key1 和 key2，点击规则行【保存】，再点击页面底部【保存】完成规则集创建；并通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】，在 Step 1 基础信息中规则名称=task_json_key_range_test、数据源=Doris、数据库=qa_test、数据表=test_json_key_range，点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入“key范围校验测试包“，点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功并已执行完成；在【数据质量 → 校验结果查询】页面已生成该任务最新实例记录
4) id=10记录质检结果为“校验不通过“
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待页面加载完成 | 校验结果查询页面正常打开，列表加载完成 |
| 2 | 找到“task_json_key_range_test“最新执行记录，找到质检结果为“校验不通过“的规则行 | 目标规则行可正常定位，数据展示完整 |
| 3 | 点击该规则行操作列的【查看明细】按钮，等待明细弹窗加载完成 | 成功打开明细页面，页面加载不报错 |
| 4 | 观察明细页面的标题文案、数据列表字段列数、以及id=10记录的“info“字段展示样式 | 1) 明细标题显示“查看“完整性校验-key范围校验“明细“ 2) 数据列表展示原表全部字段（id、info等） 3) id=10记录的“info“字段内容以红色字体或红色背景高亮标红展示 4) 不符合要求的数据（id=10）出现在列表中 |



##### 【P1】验证规则库中新增key范围校验内置规则展示信息正确

> 前置条件

```
1) 当前环境为v6.3岚图定制化分支
2) 数据质量模块规则库功能可用
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则库配置】页面，等待规则库列表加载完成 | 规则库配置页面正常打开，列表加载完成 |
| 2 | 在规则分类筛选中选择“完整性校验“，在列表中查找“key范围校验“规则 | 规则库完整性校验分类下可找到“key范围校验“规则 |
| 3 | 点击“key范围校验“规则行查看规则详情 | 规则详情显示： 1) 规则名称=key范围校验 2) 规则解释=对数据中包含的key范围校验 3) 规则分类=完整性校验 4) 关联范围=字段 5) 规则描述=校验json类型的字段中key名是否完整，对key的范围进行校验 |
| 4 | 返回规则列表，将鼠标悬浮在“key范围校验“的统计函数名称旁的提示图标上，等待tooltip出现 | 悬浮提示内容为“对数据中包含的key范围校验“，与规则库中“规则解释“字段内容一致 |
| 5 | 导出规则库 | 存在key范围校验-对数据中包含的key范围校验-完整性校验 |



##### 【P1】验证对分区表配置key范围校验规则指定分区下数据校验正确

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）、key2（年龄）
2) 已在Hive数据源中执行以下SQL创建分区表并灌数：
   CREATE TABLE hive_json_partition (
     id INT,
     info STRING
   ) PARTITIONED BY (dt STRING);
   ALTER TABLE hive_json_partition ADD PARTITION (dt='20260401');
   ALTER TABLE hive_json_partition ADD PARTITION (dt='20260402');
   INSERT INTO hive_json_partition PARTITION (dt='20260401') VALUES
     (1, '{“key1“:“张三“,“key2“:25}'),
     (2, '{“key1“:“李四“}');
   INSERT INTO hive_json_partition PARTITION (dt='20260402') VALUES
     (3, '{“key1“:“王五“,“key2“:30}');
3) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_partition_test“创建：Step 1 基础信息中关联Hive数据源的hive_json_partition表，并新增规则包“分区测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=info（string类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2、过滤条件=指定分区dt=20260401；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_json_partition_test“创建：Step 1 基础信息中规则名称=task_json_partition_test，并关联同一Hive分区表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_partition_test“的“分区测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_json_partition_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_partition_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 仅校验dt=20260401分区下的数据（id=1和id=2） 3) id=1（含key1和key2）质检结果=校验通过 4) id=2（仅含key1，缺key2）质检结果=校验不通过 5) dt=20260402分区的数据（id=3）不参与本次校验 |

##### 【P1】验证key范围校验规则结合抽样功能正确执行

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）、key2（年龄）
2) 已在Doris表test_json_sampling中插入100条数据，其中50条包含key1和key2，50条仅包含key1：
   CREATE TABLE test_json_sampling (
     id INT,
     info JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3
   PROPERTIES(“replication_num“ = “1“);
   -- 插入100条数据（id=1~50含key1和key2，id=51~100仅含key1）
3) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_sampling_test“创建：Step 1 基础信息中关联Doris数据源的test_json_sampling表，并新增规则包“抽样测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=info、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_json_sampling_test“创建：Step 1 基础信息中规则名称=task_json_sampling_test，并关联同一Doris表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_sampling_test“的“抽样测试包“；点击【下一步】进入 Step 3 调度属性，将抽样行数设置为10后点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_json_sampling_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_sampling_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中抽样行数显示为10 3) 校验结果基于抽样的10条数据进行判定 4) 校验通过和不通过的结果与抽样数据实际内容一致 |


##### 【P1】验证删除已被规则引用的key后执行校验任务不受影响

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key数据：key_exec_1（名称1）、key_exec_2（名称2）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面在规则集“rule_set_key_exec_test“的目标规则包中点击【新增规则】，配置字段=info、统计函数=key范围校验、校验方法=包含、校验内容=key_exec_1和key_exec_2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集保存成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_json_key_exec_test“创建：Step 1 基础信息中规则名称=task_json_key_exec_test，并关联上述规则集对应的数据表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】引用上述规则集中的目标规则包；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
5) 已在Doris表中插入数据：
   INSERT INTO test_json_key_range VALUES
     (40, '{“key_exec_1“:“a“,“key_exec_2“:“b“}');
6) 已在通用配置中删除key_exec_2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_json_key_exec_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_key_exec_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=40 质检结果=校验通过 3) 页面未出现引用已删除 key 的报错信息，规则结果可正常展示 |

##### 【P1】验证删除已被规则引用的key后规则配置回显和编辑功能正常

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key数据：key_del_1（测试名1）、key_del_2（测试名2）、key_del_3（测试名3）
2) 已通过【数据质量 → 规则集管理】在规则集“rule_set_key_del_test“的规则包中配置key范围校验规则：字段=info、校验方法=包含、校验内容=key_del_1-key_del_2-key_del_3，已保存规则集
3) 已通过【数据质量 → 规则任务管理】创建任务“task_json_key_del_test“，通过【导入规则包】引用上述规则集，已完成 Step 3 调度属性配置后点击【保存】
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【通用配置 → json格式校验管理】页面，等待列表加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 找到“key_del_2（测试名2）“，点击操作列的【删除】按钮，在确认弹窗中点击【确定】，等待删除成功提示 | key_del_2删除成功，列表中不再显示key_del_2 |
| 3 | 进入【数据质量 → 规则集管理】页面，找到“rule_set_key_del_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看已配置的key范围校验规则的校验内容回显 | 校验内容回显中key_del_2已被自动移除，剩余key_del_1和key_del_3正常显示 |
| 4 | 点击该规则的【编辑】按钮，打开校验内容下拉框，观察可选key列表 | 校验内容下拉框中不再显示key_del_2，key_del_1和key_del_3正常展示可选，编辑功能正常可用 |


##### 【P1】验证千级key数据量下校验内容选择列表的加载搜索和选择性能

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面批量维护含2000条key的数据：
   第一层级：key_l1_001至key_l1_1000
   第二层级：key_l2_001至key_l2_1000
   通用配置导入文件生成脚本如下:

import openpyxl

wb = openpyxl.Workbook()
# 一层 Sheet
ws1 = wb.active
ws1.title = “一层“
ws1.append([“key“, “中文名称“, “value格式“])
for i in range(1, 1001):
    ws1.append([f“key_l1_{i:03d}“, f“一层key{i}“, ““])

# 二层 Sheet
ws2 = wb.create_sheet(“二层“)
ws2.append([“上一层级的key名“, “key“, “中文名称“, “value格式“])
for i in range(1, 1001):
    parent_key = f“key_l1_{i:03d}“
    ws2.append([parent_key, f“key_l2_{i:03d}“, f“二层key{i}“, ““])

wb.save(“json_key_range_perf_import_2000.xlsx“)
print(“已生成 json_key_range_perf_import_2000.xlsx，共2000条key数据（一层1000+二层1000）“)

2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range（含json字段 info），规则包名称“大数据量性能测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“大数据量性能测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_large_key_perf“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_large_key_perf“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“大数据量性能测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，点击校验内容下拉框，等待列表加载完成 | 校验内容下拉列表在3秒内加载完成，默认展示前200条key数据，页面无卡顿 |
| 3 | 在搜索框中输入“key_l2_999“，等待搜索结果返回 | 搜索结果在2秒内返回，正确显示“key_l2_999“，搜索响应无明显延迟 |
| 4 | 勾选搜索到的“key_l2_999“，清空搜索框，再搜索并勾选“key_l1_500“，点击【确认】 | 两个key均成功选中，校验内容回显“key_l1_500;key_l2_999“，选择操作流畅无卡顿 |

##### 【P1】验证key数量几千个时按层级校验逻辑正确执行

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面批量维护含3000条key的数据：
   第一层级：key_l1_001至key_l1_1000
   第二层级：key_l2_001至key_l2_2000
   通用配置导入文件生成脚本如下:

import openpyxl

wb = openpyxl.Workbook()
# 一层 Sheet
ws1 = wb.active
ws1.title = “一层“
ws1.append([“key“, “中文名称“, “value格式“])
for i in range(1, 1001):
    ws1.append([f“key_l1_{i:03d}“, f“一层key{i}“, ““])

# 二层 Sheet
ws2 = wb.create_sheet(“二层“)
ws2.append([“上一层级的key名“, “key“, “中文名称“, “value格式“])
for i in range(1, 2001):
    parent_key = f“key_l1_{((i - 1) % 1000) + 1:03d}“
    ws2.append([parent_key, f“key_l2_{i:03d}“, f“二层key{i}“, ““])

wb.save(“json_key_range_import_3000.xlsx“)
print(“已生成 json_key_range_import_3000.xlsx，共3000条key数据（一层1000+二层2000）“)

2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已在Doris表中执行以下灌数SQL：
   INSERT INTO test_json_key_range VALUES
     (30, '{“key_l1_001“:“v1“,“key_l2_001“:“v2“}'),
     (31, '{“key_l1_001“:“v3“}'),
     (32, '{“key_other“:“v4“}');
   Doris表大量json数据灌数脚本如下:

lines = []
lines.append(“INSERT INTO test_json_key_range VALUES“)
for i in range(30, 1030):
    keys = [f'“key_l1_{(i % 1000) + 1:03d}“: “v{i}“', f'“key_l2_{(i % 2000) + 1:03d}“: “v{i}“'] if i % 3 != 0 else [f'“key_l1_{(i % 1000) + 1:03d}“: “v{i}“']
    json_str = “{“ + “, “.join(keys) + “}“
    comma = “,“ if i < 1029 else “;“
    lines.append(f“  ({i}, '{json_str}'){comma}“)

with open(“insert_json_key_range_1000.sql“, “w“) as f:
    f.write(“\n“.join(lines))
print(“已生成 insert_json_key_range_1000.sql，共1000条INSERT记录“)

4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_large_key_test“创建：Step 1 基础信息中关联上述Doris表，并新增规则包“大数据量测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=info、统计函数=key范围校验、校验方法=包含、校验内容=key_l1_001和key_l2_001；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“task_json_large_key_test“创建：Step 1 基础信息中规则名称=task_json_large_key_test，并关联同一Doris表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_large_key_test“的“大数据量测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_json_large_key_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_large_key_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=30（含key_l1_001和key_l2_001）=校验通过 3) id=31（缺key_l2_001）=校验不通过 4) id=32（不含任何目标key）=校验不通过 5) 层级匹配逻辑正确，第一层级key不与第二层级key混淆 |


##### 【P1】验证Hive2.x数据源的json字段支持key范围校验

> 前置条件

```
1) 已在Doris3.x数据源中执行以下SQL：
   CREATE TABLE doris_json_test (
     id INT,
     data JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3
   PROPERTIES(“replication_num“ = “1“);
   INSERT INTO doris_json_test VALUES
     (1, '{“key1“:“A“,“key2“:“B“}'),
     (2, '{“key1“:“C“}');
2) 已在【通用配置 → json格式校验管理】页面维护key1、key2
3) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_doris_test“创建：Step 1 基础信息中关联Doris3.x数据源的doris_json_test表，并新增规则包“doris兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（json类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_doris_test“创建：Step 1 基础信息中规则名称=task_doris_test，并关联同一Doris3.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_doris_test“的“doris兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_hive_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_doris_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1（含key1和key2）质检结果=校验通过 3) id=2（缺key2）质检结果=校验不通过 |

##### 【P1】验证Hive2.x数据源的string字段支持key范围校验

> 前置条件

```
1) Hive2.x数据源已配置并连接正常
2) 已在该数据源中执行以下SQL：
   CREATE TABLE hive_json_test (id INT, data STRING);
   INSERT INTO hive_json_test VALUES
     (1, '{“key1“:“M“,“key2“:“N“}'),
     (2, '{“key1“:“P“}');
3) 已在【通用配置 → json格式校验管理】页面维护key1、key2
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_hive_test“创建：Step 1 基础信息中关联Hive2.x数据源的hive_json_test表，并新增规则包“hive兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（string类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“task_hive_test“创建：Step 1 基础信息中规则名称=task_hive_test，并关联同一Hive2.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_hive_test“的“hive兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_hive_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_hive_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1质检结果=校验通过 3) id=2质检结果=校验不通过 |

##### 【P1】验证Doris3.x数据源的json字段支持key范围校验

> 前置条件

```
1) 已在Doris3.x数据源中执行以下SQL：
   CREATE TABLE doris_json_test (
     id INT,
     data JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3
   PROPERTIES(“replication_num“ = “1“);
   INSERT INTO doris_json_test VALUES
     (1, '{“key1“:“A“,“key2“:“B“}'),
     (2, '{“key1“:“C“}');
2) 已在【通用配置 → json格式校验管理】页面维护key1、key2
3) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_doris_test“创建：Step 1 基础信息中关联Doris3.x数据源的doris_json_test表，并新增规则包“doris兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（json类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_doris_test“创建：Step 1 基础信息中规则名称=task_doris_test，并关联同一Doris3.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_doris_test“的“doris兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_doris_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_doris_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1（含key1和key2）质检结果=校验通过 3) id=2（缺key2）质检结果=校验不通过 |

##### 【P1】验证Doris3.x数据源的string字段支持key范围校验

> 前置条件

```
1) 已在Doris3.x数据源中执行以下SQL：
   CREATE TABLE doris_json_test (
     id INT,
     data JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3
   PROPERTIES(“replication_num“ = “1“);
   INSERT INTO doris_json_test VALUES
     (1, '{“key1“:“A“,“key2“:“B“}'),
     (2, '{“key1“:“C“}');
2) 已在【通用配置 → json格式校验管理】页面维护key1、key2
3) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_doris_test“创建：Step 1 基础信息中关联Doris3.x数据源的doris_json_test表，并新增规则包“doris兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（json类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
4) 已通过【数据质量 → 规则任务管理】页面完成任务“task_doris_test“创建：Step 1 基础信息中规则名称=task_doris_test，并关联同一Doris3.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_doris_test“的“doris兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_doris_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_doris_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1（含key1和key2）质检结果=校验通过 3) id=2（缺key2）质检结果=校验不通过 |

##### 【P1】验证SparkThrift2.x数据源的json字段支持key范围校验

> 前置条件

```
1) SparkThrift2.x数据源已配置并连接正常
2) 已在该数据源中执行以下SQL：
   CREATE TABLE spark_json_test (id INT, data STRING);
   INSERT INTO spark_json_test VALUES
     (1, '{“key1“:“X“,“key2“:“Y“}'),
     (2, '{“key1“:“Z“}');
3) 已在【通用配置 → json格式校验管理】页面维护key1、key2
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_spark_test“创建：Step 1 基础信息中关联SparkThrift2.x数据源的spark_json_test表，并新增规则包“spark兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（string类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“task_spark_test“创建：Step 1 基础信息中规则名称=task_spark_test，并关联同一SparkThrift2.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_spark_test“的“spark兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_spark_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_spark_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1质检结果=校验通过 3) id=2质检结果=校验不通过 |

##### 【P1】验证SparkThrift2.x数据源的string字段支持key范围校验

> 前置条件

```
1) SparkThrift2.x数据源已配置并连接正常
2) 已在该数据源中执行以下SQL：
   CREATE TABLE spark_json_test (id INT, data STRING);
   INSERT INTO spark_json_test VALUES
     (1, '{“key1“:“X“,“key2“:“Y“}'),
     (2, '{“key1“:“Z“}');
3) 已在【通用配置 → json格式校验管理】页面维护key1、key2
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_spark_test“创建：Step 1 基础信息中关联SparkThrift2.x数据源的spark_json_test表，并新增规则包“spark兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，配置字段=data（string类型）、统计函数=key范围校验、校验方法=包含、校验内容=key1和key2；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“task_spark_test“创建：Step 1 基础信息中规则名称=task_spark_test，并关联同一SparkThrift2.x表；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集“rule_set_spark_test“的“spark兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到“task_spark_test“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到“task_spark_test“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1质检结果=校验通过 3) id=2质检结果=校验不通过 |



##### 【P1】验证规则配置参数卡片完整展示所有字段

> 前置条件

```
1) 已通过【数据质量 → 规则集管理】在规则集“rule_set_key_range_test“的“key范围校验测试包“中配置并保存以下规则：
   - *字段: info（json类型）
   - *统计函数: key范围校验
   - 过滤条件: id > 0
   - *校验方法: 包含
   - *校验内容: key1-key2;key11-key22
   - 强弱规则: 强规则
   - 规则描述: 测试key范围校验规则
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 找到“key范围校验测试包“中已配置的key范围校验规则，点击规则行展开查看参数详情卡片，逐项核对各参数字段 | 规则配置参数卡片完整展示以下所有字段且内容正确： 1) 规则类型=字段级 2) 字段=info 3) 统计函数=key范围校验 4) 过滤条件=id > 0 5) 校验方法=包含 6) 校验内容=key1-key2;key11-key22 7) 强弱规则=强规则 8) 规则描述=测试key范围校验规则 |


##### 【P1】验证未选择校验方法时保存key范围校验规则提示必填

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
3) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，校验内容勾选“key1（姓名）“ | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 清空校验方法下拉框（若默认有值则手动清除），直接点击【保存】 | 保存失败，校验方法下拉框下方显示红色错误提示“请选择校验方法“，页面不跳转，规则未被保存 |

##### 【P1】验证未选择校验内容时保存key范围校验规则提示必填

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
3) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）、key2（年龄）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，校验方法选择“包含“ | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 不选择任何校验内容（校验内容选择框保持空），直接点击【保存】 | 保存失败，校验内容选择框下方显示红色错误提示“请选择校验内容“，页面不跳转，规则未被保存 |

##### 【P1】验证未选择字段时保存key范围校验规则提示必填

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
3) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“ | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 不选择任何字段，校验方法选择“包含“，校验内容勾选“key1（姓名）“，直接点击【保存】 | 保存失败，字段选择框下方显示红色错误提示“请选择字段“，页面不跳转，规则未被保存 |


##### 【P1】验证string类型字段可成功配置key范围校验规则

> 前置条件

```
1) 已在Doris数据源中准备测试表：
CREATE TABLE qa_test.test_field_type (
  id INT,
  info JSON,
  extra_info VARCHAR(500),
  name VARCHAR(100),
  age INT,
  create_date DATE,
  user_id BIGINT
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_field_type VALUES
  (1, '{“key1“:“test“}', '{“key1“:“str_test“}', '张三', 25, '2026-01-01', 1001);

2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_field_type（含 extra_info（VARCHAR类型，存储JSON字符串）），规则包名称“字段类型测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“字段类型测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 extra_info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_field_type_test“创建
3) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）、key2（年龄）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_field_type_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“字段类型测试包“中点击【新增规则】，统计函数选择“key范围校验“，展开字段选择列表 | 字段下拉列表中string类型字段“extra_info“可正常选择（不置灰） |
| 3 | 在字段下拉框中选择“extra_info“（string类型），在规则配置表单中按顺序配置如下： - *校验方法: 包含 - *校验内容: key1（姓名） - 强弱规则: 强规则 - 规则描述: 无 点击【保存】按钮 | 保存成功，规则配置参数展示区显示字段=extra_info |

##### 【P1】验证json类型字段可成功配置key范围校验规则

> 前置条件

```
1) 已在Doris数据源中准备测试表：
CREATE TABLE qa_test.test_field_type (
  id INT,
  info JSON,
  extra_info VARCHAR(500),
  name VARCHAR(100),
  age INT,
  create_date DATE,
  user_id BIGINT
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_field_type VALUES
  (1, '{“key1“:“test“}', '{“key1“:“str_test“}', '张三', 25, '2026-01-01', 1001);

2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_field_type（含字段 info（JSON类型）、name（VARCHAR类型）、age（INT类型）），规则包名称“字段类型测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“字段类型测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_field_type_test“创建
3) 已在【通用配置 → json格式校验管理】页面维护key1（姓名）、key2（年龄）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_field_type_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“字段类型测试包“中点击【新增规则】，统计函数选择“key范围校验“，展开字段选择列表 | 字段下拉列表中，JSON类型字段“info“可正常选择，INT类型字段“age“置灰不可选 |
| 3 | 选择“info“（JSON类型字段），在规则配置表单中按顺序配置如下： - *校验方法: 包含 - *校验内容: key1（姓名） - 强弱规则: 强规则 - 规则描述: 无 点击【保存】按钮 | 保存成功，规则配置参数展示区显示字段=info、统计函数=key范围校验 |


##### 【P1】验证校验内容标签旁悬浮提示文案正确

> 前置条件

```
1) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“ | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 将鼠标悬浮在“校验内容“标签旁的提示图标上，等待tooltip出现 | tooltip显示文案为“校验内容key信息需要在通用配置模块维护。“，文案完全匹配，无多余空格或乱码 |

##### 【P1】验证校验内容悬浮展示：默认显示前两个key悬浮展示全部

> 前置条件

```
1) 已通过【数据质量 → 规则集管理】在规则集“rule_set_key_range_test“的“key范围校验测试包“中配置key范围校验规则，校验内容共选择了4个key：
   第一层级：key1（姓名）、key2（年龄）
   第二层级：key11（省份）、key22（城市）
2) 规则已保存成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看“key范围校验测试包“中已配置的key范围校验规则行的“校验内容“列 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 观察“校验内容“列在非悬浮状态下的显示内容 | 校验内容列默认仅展示前两个key信息（如“key1-key2...“），超出部分以省略号截断显示 |
| 4 | 将鼠标悬浮在“校验内容“列的文本上，等待tooltip出现 | 鼠标悬浮后，tooltip中完整展示全部4个key信息：“key1-key2;key11-key22“ |

##### 【P1】验证校验内容回显格式为同层级key用横线拼接不同层级用分号分隔

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key数据：
   第一层级：key1（姓名）、key2（年龄）
   第二层级：key11（省份）、key22（城市）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，打开校验内容下拉框，在第一层级勾选“key1（姓名）“和“key2（年龄）“，在第二层级勾选“key11（省份）“和“key22（城市）“，点击【确认】 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 查看规则配置表单中“校验内容“字段的回显内容 | 校验内容回显格式为“key1-key2;key11-key22“，同层级key用“-“连接，不同层级配置组之间用“;“分隔 |
| 4 | 点击【保存】按钮，等待保存成功后再次点击该规则行进入编辑页面，查看已保存的校验内容展示 | 已保存的规则中校验内容回显仍为“key1-key2;key11-key22“，格式不变 |

##### 【P1】验证key数据量超过200条时默认加载前200条及搜索功能

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面批量维护超过200条key数据，前200条为key_001至key_200，第201条起为key_201、key_202等，通用配置导入文件生成脚本如下:

import openpyxl

wb = openpyxl.Workbook()
ws1 = wb.active
ws1.title = “一层“
ws1.append([“key“, “中文名称“, “value格式“])
for i in range(1, 251):
    ws1.append([f“key_{i:03d}“, f“测试key{i}“, ““])

wb.save(“json_key_range_import_250.xlsx“)
print(“已生成 json_key_range_import_250.xlsx，共250条一层key数据“)

2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，点击校验内容下拉框，等待列表加载完成 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 滚动下拉列表到底部，观察可见的key条目总数 | 下拉框中最多显示200条key数据（key_001至key_200），滚动到底部不再追加加载 |
| 4 | 在搜索框中输入“key_201“，等待搜索结果加载 | 搜索结果正确返回“key_201“，不受前200条默认加载限制 |

##### 【P1】验证校验内容下拉框支持输入关键词搜索查询

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护以下key数据：
   第一层级：key1（姓名）、key2（年龄）、key3（性别）
   第二层级：key11（省份）、key22（城市）、key33（区县）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，点击校验内容下拉框，等待下拉列表加载完成 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 在校验内容下拉框内的搜索输入框中输入“key1“ | 下拉列表过滤显示包含“key1“的结果：key1（姓名）、key11（省份），其余key不显示 |
| 4 | 清空搜索框内容，输入“省份“ | 下拉列表过滤显示包含“省份“的结果：key11（省份），其余key不显示 |
| 5 | 清空搜索框内容，输入“xyz_not_exist“ | 下拉列表显示“暂无数据“，不显示任何key选项 |

##### 【P1】验证校验内容支持多选和全选操作

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护以下key数据：
   第一层级：key1（姓名）、key2（年龄）、key3（性别）
   第二层级：key11（省份）、key22（城市）、key33（区县）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】，在 Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range，规则包名称“key范围校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包“key范围校验测试包“中点击【新增规则】，统计函数选择【非空值数】，字段选择 info，点击规则行【保存】，再点击页面底部【保存】完成规则集“rule_set_key_range_test“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_key_range_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key范围校验测试包“中点击【新增规则】，统计函数选择“key范围校验“，字段选择“info“，点击校验内容下拉框，等待下拉列表加载完成 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已有配置回显正确 |
| 3 | 在校验内容下拉框中依次勾选“key1（姓名）“、“key2（年龄）“、“key3（性别）“三个选项 | 勾选3个key后，下拉框内显示已选中3项，各key名前复选框呈选中状态 |
| 4 | 点击下拉框顶部的【全部】选项 | 点击“全部“后，所有6个key（key1、key2、key3、key11、key22、key33）全部被勾选，“全部“选项呈全选状态 |
| 5 | 再次点击【全部】选项 | 所有key全部取消勾选，“全部“选项恢复未选状态 |
| 6 | 重新勾选“key1（姓名）“和“key11（省份）“，点击【确认】按钮，查看校验内容回显 | 确认后，规则配置中校验内容回显格式为“key1;key11“（同层级key用“-“拼接，不同层级配置组用“;“分隔） |

##### 【P1】验证校验方法切换（包含与不包含）规则保存和执行结果差异

> 前置条件

```
1) 已在【通用配置 → json格式校验管理】页面维护key数据：key1（姓名）、key2（年龄）
2) 已在Doris数据源中准备测试表及数据：
CREATE TABLE qa_test.test_json_key_range (
  id INT,
  info JSON,
  extra_info VARCHAR(500)
) DISTRIBUTED BY HASH(id) BUCKETS 3
PROPERTIES(“replication_num“ = “1“);
INSERT INTO qa_test.test_json_key_range VALUES
  (1, '{“key1“:“张三“,“key2“:25}', '{“key1“:“test“}'),
  (2, '{“key1“:“李四“}', '{“key2“:“test2“}'),
  (3, '{“key2“:30}', NULL);
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】完成规则集“rule_set_method_switch“创建：Step 1 基础信息中选择数据源=Doris、数据库=qa_test、数据表=test_json_key_range、规则集描述=无，并新增规则包“method_switch包“；点击【下一步】进入 Step 2 监控规则，确认规则包已创建后点击页面底部【保存】，规则集创建成功
4) 已在Doris表test_json_key_range中插入以下数据：
   INSERT INTO test_json_key_range VALUES
     (1, '{“key1“:“张三“,“key2“:25}'),
     (2, '{“key1“:“李四“}');
5) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】完成任务“task_json_method_switch“创建：Step 1 基础信息中规则名称=task_json_method_switch、数据源=Doris、数据库=qa_test、数据表=test_json_key_range；点击【下一步】进入 Step 2 监控规则，通过【导入规则包】导入规则集管理中已配置的“method_switch包“；点击【下一步】进入 Step 3 调度属性，保持默认配置后点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到“rule_set_method_switch“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“method_switch包“中点击【新增规则】，配置如下： - *统计函数: key范围校验 - *字段: info（json类型） - *校验方法: 包含 - *校验内容: key1（姓名）和 key2（年龄） - 强弱规则: 强规则 - 规则描述: 无 点击【保存】按钮，再点击页面底部【保存】 | 页面提示保存成功，规则列表中显示新增的规则行 |
| 3 | 进入【数据质量 → 规则任务管理】页面，找到“task_json_method_switch“，点击【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 4 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_method_switch“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1（含key1和key2）质检结果=校验通过 3) id=2（仅含key1，缺key2）质检结果=校验不通过，未通过原因=key范围校验未通过 |
| 5 | 返回规则集管理，编辑“rule_set_method_switch“，进入 Step 2 编辑该规则，将校验方法由“包含“改为“不包含“，点击【保存】 | 规则保存成功，校验方法显示为“不包含“ |
| 6 | 返回【数据质量 → 规则任务管理】页面，再次点击“task_json_method_switch“的【立即执行】 | 页面弹出提示信息，提示任务已提交执行 |
| 7 | 进入【数据质量 → 校验结果查询】页面，找到“task_json_method_switch“最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中 id=1（含key1和key2，违反不包含规则）质检结果=校验不通过，详情说明=不符合规则key范围不包含“key1-key2“ 3) id=2（仅含key1，部分包含）质检结果=校验不通过，详情说明=不符合规则key范围不包含“key1-key2“ |

### 【内置规则丰富】有效性，json中key对应的value值格式校验(#10459)

##### 【P1】验证质量报告中「格式-json格式校验」规则行各列字段展示正确（校验通过场景）

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护 key路径「meta-version」，中文名称「版本号」，value格式正则：^v\d+\.\d+$
3) 已执行以下 SQL 创建测试表并灌入合规数据：
   CREATE TABLE quality_test_db.json_report_pass (
     id INT,
     info JSON
   );
   INSERT INTO quality_test_db.json_report_pass VALUES
     (1, '{“meta“:{“version“:“v1.0“}}'),
     (2, '{“meta“:{“version“:“v2.3“}}');
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_report_pass_test“创建：Step 1 基础信息中关联 Doris 数据源 quality_test_db.json_report_pass 表，并新增规则包“报告通过测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=info、统计规则=格式-json格式校验、校验key=meta-version、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“报告通过展示任务“创建：Step 1 基础信息中规则名称=报告通过展示任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_report_pass_test“的“报告通过测试包“；点击【下一步】进入 Step 3 调度属性并点击【保存】；随后在任务列表点击【立即执行】，页面弹出提示信息，提示任务已提交执行，且【数据质量 → 校验结果查询】页面已生成该任务最新实例记录，最新校验结果为「校验通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待页面加载完成 | 数据质量报告页面正常打开，报告列表加载完成 |
| 2 | 找到「报告通过展示任务」最新一次执行的报告详情并打开 | 报告详情页正常打开，数据加载完成 |
| 3 | 找到「格式-json格式校验」规则行，逐列核对各字段内容 | 1) 规则类型列=「有效性校验」 2) 规则名称列=「格式-json格式校验」 3) 字段类型列=「json」 4) 质检结果列=「校验通过」 5) 未通过原因列=「--」 6) 详情说明列=「符合规则key为“meta-version“时的value格式要求」 7) 操作列无内容 |



##### 【P1】验证校验不通过时明细数据下载功能中校验字段标红

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已执行以下 SQL 创建测试表并灌入包含不合规数据的数据：
   CREATE TABLE quality_test_db.json_dl_test (
     id INT,
     payload JSON,
     name VARCHAR(255)
   );
   INSERT INTO quality_test_db.json_dl_test VALUES
     (1, '{“product“:{“code“:“AB123456“,“price“:“100.00“}}', 'valid'),
     (2, '{“product“:{“code“:“invalid_code“,“price“:“abc“}}', 'invalid');
3) 已在「通用配置 → json格式校验管理」中维护：
   - key路径「product-code」，中文名称「产品编码」，value格式正则：^[A-Z]{2}\d{6}$
   - key路径「product-price」，中文名称「产品价格」，value格式正则：^\d+\.\d{2}$
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_dl_test“创建：Step 1 基础信息中关联 Doris 数据源 quality_test_db.json_dl_test 表，并新增规则包“下载明细测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=payload、统计规则=格式-json格式校验、校验key=product-code 和 product-price、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“下载明细测试任务“创建：Step 1 基础信息中规则名称=下载明细测试任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_dl_test“的“下载明细测试包“；点击【下一步】进入 Step 3 调度属性并点击【保存】；随后在任务列表点击【立即执行】，页面弹出提示信息，提示任务已提交执行，且【数据质量 → 校验结果查询】页面已生成该任务最新实例记录，最新校验结果为「校验不通过」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待页面加载完成 | 校验结果查询页面正常打开，列表加载完成 |
| 2 | 找到「下载明细测试任务」最新实例记录并打开实例详情，点击「格式-json格式校验」规则行操作列的【查看详情】，等待明细弹窗加载 | 明细弹窗打开，显示不符合规则的数据行（id=2 的记录） |
| 3 | 在明细弹窗中点击【下载明细数据】按钮，等待文件下载完成 | 文件成功下载，文件格式为 Excel（.xlsx） |
| 4 | 打开下载的 Excel 文件，查看校验字段（payload列）中不符合规则记录的单元格样式 | 文件内容包含全部字段列（id、payload、name）；「payload」列（校验字段）以红色标记展示；其他字段列正常展示 |



##### 【P1】验证规则库中「格式-json格式校验」内置规则展示信息正确

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则库配置】页面，等待内置规则列表加载完成 | 规则库页面正常加载，内置规则列表展示完成 |
| 2 | 在「内置规则」列表的搜索框中输入「格式-json格式校验」，点击搜索 | 搜索结果展示「格式-json格式校验」规则条目，各字段显示： 1) 规则名称=「格式-json格式校验」 2) 规则解释=「格式-json格式校验」 3) 规则分类=「有效性校验」 4) 关联范围=「字段」 5) 规则描述=「校验json类型的字段中key对应的value值是否符合规范要求」 |
| 3 | 导出规则库 | 存在格式校验-格式-json格式校验-有效性校验 |



##### 【P1】验证对分区表配置格式-json格式校验规则后指定分区下的数据校验正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 数据源中心已添加 Hive 2.x 版本数据源「测试数据源_Hive2」并授权给资产平台
3) 已在「通用配置 → json格式校验管理」中维护 key路径「part-code」，中文名称「分区编码」，value格式正则：^P\d{4}$
4) 已在 Hive 数据源的 hive_test_db 数据库中创建分区表并灌入数据：
   CREATE TABLE hive_test_db.json_partition_test (
     id INT,
     part_info STRING
   ) PARTITIONED BY (dt STRING)
   ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';
   ALTER TABLE hive_test_db.json_partition_test ADD PARTITION (dt='2026-04-01');
   ALTER TABLE hive_test_db.json_partition_test ADD PARTITION (dt='2026-04-02');
   INSERT INTO hive_test_db.json_partition_test PARTITION (dt='2026-04-01') VALUES
     (1, '{“part“:{“code“:“P0001“}}'),
     (2, '{“part“:{“code“:“invalid“}}');
   INSERT INTO hive_test_db.json_partition_test PARTITION (dt='2026-04-02') VALUES
     (3, '{“part“:{“code“:“P0003“}}'),
     (4, '{“part“:{“code“:“P0004“}}');
5) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_partition_test“创建：Step 1 基础信息中关联 Hive2.x 数据源的 hive_test_db.json_partition_test 表，并新增规则包“分区校验测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=part_info（string类型）、统计规则=格式-json格式校验、校验key=part-code、强弱规则=强规则、过滤条件=分区字段 dt = '2026-04-01'、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
6) 已通过【数据质量 → 规则任务管理】页面完成任务“分区校验测试任务“创建：Step 1 基础信息中规则名称=分区校验测试任务，并关联同一 Hive 分区表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_partition_test“的“分区校验测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载 |
| 2 | 找到「分区校验测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「分区校验测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 仅校验 dt='2026-04-01' 分区下的数据（id=1 和 id=2） 3) id=1 记录质检结果=「校验通过」，id=2 记录质检结果=「校验不通过」 4) dt='2026-04-02' 分区的数据（id=3、id=4）不参与本次校验 |


##### 【P1】验证配置格式-json格式校验规则时结合抽样功能执行校验结果正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护 key路径「sample-code」，中文名称「样本编码」，value格式正则：^S\d{6}$
3) 已执行以下 SQL 创建测试表并灌入20条数据：
   CREATE TABLE quality_test_db.json_sample_test (
     id INT,
     sample_info JSON
   );
   INSERT INTO quality_test_db.json_sample_test VALUES
     (1, '{“sample“:{“code“:“S000001“}}'),
     (2, '{“sample“:{“code“:“S000002“}}'),
     (3, '{“sample“:{“code“:“S000003“}}'),
     (4, '{“sample“:{“code“:“S000004“}}'),
     (5, '{“sample“:{“code“:“S000005“}}'),
     (6, '{“sample“:{“code“:“S000006“}}'),
     (7, '{“sample“:{“code“:“S000007“}}'),
     (8, '{“sample“:{“code“:“S000008“}}'),
     (9, '{“sample“:{“code“:“S000009“}}'),
     (10, '{“sample“:{“code“:“S000010“}}'),
     (11, '{“sample“:{“code“:“invalid1“}}'),
     (12, '{“sample“:{“code“:“invalid2“}}'),
     (13, '{“sample“:{“code“:“S000013“}}'),
     (14, '{“sample“:{“code“:“S000014“}}'),
     (15, '{“sample“:{“code“:“S000015“}}'),
     (16, '{“sample“:{“code“:“S000016“}}'),
     (17, '{“sample“:{“code“:“S000017“}}'),
     (18, '{“sample“:{“code“:“S000018“}}'),
     (19, '{“sample“:{“code“:“S000019“}}'),
     (20, '{“sample“:{“code“:“S000020“}}');
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_sample_test“创建：Step 1 基础信息中关联 Doris 数据源 quality_test_db.json_sample_test 表，并新增规则包“抽样校验测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=sample_info、统计规则=格式-json格式校验、校验key=sample-code、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“抽样校验测试任务“创建：Step 1 基础信息中规则名称=抽样校验测试任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_sample_test“的“抽样校验测试包“，并在任务配置中设置抽样比例为 50%；点击【下一步】进入 Step 3 调度属性并点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载 |
| 2 | 找到「抽样校验测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「抽样校验测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情中的统计信息显示参与校验的数据量约为总数据量的 50%（约10条） 3) 「格式-json格式校验」规则行的质检结果正常显示本次抽样后的实际校验结果（id=11、id=12 的无效数据被抽中时结果为「校验不通过」，否则为「校验通过」） 4) 详情说明列准确显示校验key为「sample-code」时的 value 格式要求 |


##### 【P1】验证删除已被规则引用的key后value格式预览弹窗和执行校验任务正常

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下key：
   - key路径「preview-key-x」，中文名称「预览键X」，value格式正则：^[0-9]+$
   - key路径「preview-key-y」，中文名称「预览键Y」，value格式正则：^[a-z]+$
3) 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_preview_del (
     id INT,
     preview_info JSON
   );
   INSERT INTO quality_test_db.json_preview_del VALUES
     (1, '{“preview“:{“key“:{“x“:“123“,“y“:“abc“}}}'),
     (2, '{“preview“:{“key“:{“x“:“456“,“y“:“def“}}}');
4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_preview_del_test“创建：Step 1 基础信息中关联 Doris 数据源 quality_test_db.json_preview_del 表，并新增规则包“key删除预览测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=preview_info、统计规则=格式-json格式校验、校验key=preview-key-x 和 preview-key-y、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“key删除预览测试任务“创建：Step 1 基础信息中规则名称=key删除预览测试任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_preview_del_test“的“key删除预览测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
6) 已在「通用配置 → json格式校验管理」中删除「preview-key-x」
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务列表正常加载 |
| 2 | 进入【数据质量 → 规则集管理】页面，找到规则集“rule_set_preview_del_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到「格式-json格式校验」规则行，点击「value格式预览」按钮，等待弹窗加载 | 弹窗正常打开，仅展示「preview-key-y」的格式信息，已删除的「preview-key-x」不在列表中 |
| 3 | 关闭弹窗，返回规则任务列表，找到「key删除预览测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 4 | 进入【数据质量 → 校验结果查询】页面，找到「key删除预览测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例状态显示「已完成」，最新校验结果显示「校验通过」 3) 实例详情中「格式-json格式校验」规则的详情说明仅引用「preview-key-y」，不再展示已删除的「preview-key-x」 4) 页面未出现引用已删除 key 的报错信息 |

##### 【P1】验证删除已被有效性规则引用的key后规则配置页面回显和编辑功能正常

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下key：
   - key路径「del-key-a」，中文名称「待删除键A」，value格式正则：^[A-Z]+$
   - key路径「del-key-b」，中文名称「待删除键B」，value格式正则：^\d+$
3) 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_del_test (
     id INT,
     del_info JSON
   );
   INSERT INTO quality_test_db.json_del_test VALUES
     (1, '{“del“:{“key“:{“a“:“ABC“,“b“:“123“}}}');
4) 已通过【数据质量 → 规则集管理】创建规则集“rule_set_key_del_test“，关联Doris数据源quality_test_db库json_del_test表，规则包名称“key删除测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建，在 Step 2 中配置「格式-json格式校验」规则：字段=del_info、校验key=del-key-a和del-key-b，已保存规则集
5) 已通过【数据质量 → 规则任务管理】页面完成任务“key删除影响测试任务“创建：Step 1 基础信息中规则名称=key删除影响测试任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_key_del_test“的“key删除测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【通用配置 → json格式校验管理】页面，等待列表加载完成 | json格式校验管理页面正常加载，列表中显示「del-key-a」和「del-key-b」 |
| 2 | 找到「del-key-a」行，点击操作列的【删除】按钮，在确认弹窗中点击【确定】，等待删除完成 | 删除成功，列表中不再显示「del-key-a」，仅保留「del-key-b」 |
| 3 | 进入【数据质量 → 规则集管理】页面，找到规则集“rule_set_key_del_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看「格式-json格式校验」规则行的「校验key」回显内容 | 规则配置页面正常加载，「校验key」列回显内容中「del-key-a」已从校验key列表中移除，「del-key-b」正常显示 |
| 4 | 点击该规则行的【编辑】按钮，展开「校验key」下拉框 | 下拉框正常打开，列表中不再显示已删除的「del-key-a」，「del-key-b」显示为已勾选状态 |
| 5 | 点击【保存】按钮 | 规则保存成功，「校验key」列回显「del-key-b」 |


##### 【P1】验证json格式配置中维护上千个key时执行校验与结果展示正常

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护1200条key，其中：
   - key路径「perf-key-0001」至「perf-key-1000」，中文名称「性能键0001」至「性能键1000」，每条均配置value格式正则：^.+$（共1000条已配置value格式）
   - key路径「perf-novalue-1001」至「perf-novalue-1200」，中文名称「无格式键1001」至「无格式键1200」，未配置value格式（共200条未配置value格式）
   通用配置导入文件生成脚本如下:

   import openpyxl

   wb = openpyxl.Workbook()
   ws1 = wb.active
   ws1.title = “一层“
   ws1.append([“key“, “中文名称“, “value格式“])
   for i in range(1, 1001):
       ws1.append([f“perf-key-{i:04d}“, f“性能键{i:04d}“, “^.+$“])
   for i in range(1001, 1201):
       ws1.append([f“perf-novalue-{i}“, f“无格式键{i}“, ““])

   wb.save(“json_value_format_import_1200.xlsx“)
   print(“已生成 json_value_format_import_1200.xlsx，共1200条key数据（1000条配置value格式+200条未配置）“)

3) 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_test_db.json_perf_test (
     id INT,
     big_info JSON
   );
   INSERT INTO quality_test_db.json_perf_test VALUES
     (1, '{“perf-key-0001“:“value_1“,“perf-key-0002“:“value_2“}'),
     (2, '{“perf-key-0001“:“,“perf-key-0002“:“value_2“}');
   Doris表大量json数据灌数脚本如下:

   lines = []
   lines.append(“CREATE TABLE IF NOT EXISTS quality_test_db.json_perf_test (id INT, big_info JSON);“)
   lines.append(“INSERT INTO quality_test_db.json_perf_test VALUES“)
   for i in range(1, 1001):
       keys = [f'“perf-key-{j:04d}“: “value_{j}“' for j in range(max(1, i-2), min(1001, i+3))]
       json_str = “{“ + “, “.join(keys) + “}“
       comma = “,“ if i < 1000 else “;“
       lines.append(f“  ({i + 100}, '{json_str}'){comma}“)

   with open(“insert_json_perf_1000.sql“, “w“) as f:
       f.write(“\n“.join(lines))
   print(“已生成 insert_json_perf_1000.sql，共1000条INSERT记录“)

4) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_perf_test“创建：Step 1 基础信息中关联 Doris 数据源 quality_test_db.json_perf_test 表，并新增规则包“大数据量key校验包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=big_info、统计规则=格式-json格式校验、校验key=perf-key-0001 和 perf-key-0002、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
5) 已通过【数据质量 → 规则任务管理】页面完成任务“大数据量key校验任务“创建：Step 1 基础信息中规则名称=大数据量key校验任务，并关联同一 Doris 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_perf_test“的“大数据量key校验包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到「大数据量key校验任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「大数据量key校验任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例详情可正常打开，不出现超时、空白或报错 3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录因 perf-key-0001 值为空而质检结果=「校验不通过」 4) 详情说明列准确引用校验key「perf-key-0001;perf-key-0002」 |


##### 【P1】验证「格式-json格式校验」规则在Hive 2.x数据源下执行正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 数据源中心已添加 Hive 2.x 版本数据源「测试数据源_Hive2」并授权给资产平台
3) 已在「通用配置 → json格式校验管理」中维护 key路径「score-value」，中文名称「分数值」，value格式正则：^\d{1,3}$
4) 已在 Hive 数据源的 hive_test_db 数据库中创建测试表并灌入数据：
   CREATE TABLE hive_test_db.json_score_test (
     id INT,
     score_info STRING
   ) ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';
   INSERT INTO hive_test_db.json_score_test VALUES
     (1, '{“score“:{“value“:“95“}}'),
     (2, '{“score“:{“value“:“1000“}}');
5) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_hive2_compat“创建：Step 1 基础信息中关联 Hive2.x 数据源的 hive_test_db.json_score_test 表，并新增规则包“Hive2兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=score_info（string类型）、统计规则=格式-json格式校验、校验key=score-value、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
6) 已通过【数据质量 → 规则任务管理】页面完成任务“Hive2兼容性测试任务“创建：Step 1 基础信息中规则名称=Hive2兼容性测试任务，并关联同一 Hive 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_hive2_compat“的“Hive2兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到「Hive2兼容性测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「Hive2兼容性测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例状态显示「已完成」，最新校验结果显示「校验不通过」 3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录因 score.value 值为「1000」而质检结果=「校验不通过」 |

##### 【P1】验证「格式-json格式校验」规则在Doris 3.x数据源下执行正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 数据源中心已添加 Doris 3.x 版本数据源「测试数据源_Doris3」并授权给资产平台
3) 已在「通用配置 → json格式校验管理」中维护 key路径「item-sku」，中文名称「商品SKU」，value格式正则：^SKU\d{8}$
4) 已执行以下 SQL 创建测试表并灌入数据：
   CREATE TABLE quality_doris3_test.json_sku_test (
     id INT,
     item_info JSON
   ) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES (“replication_num“ = “1“);
   INSERT INTO quality_doris3_test.json_sku_test VALUES
     (1, '{“item“:{“sku“:“SKU12345678“}}'),
     (2, '{“item“:{“sku“:“invalid_sku“}}');
5) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_doris3_compat“创建：Step 1 基础信息中关联 Doris3.x 数据源的 quality_doris3_test.json_sku_test 表，并新增规则包“Doris3兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=item_info（json类型）、统计规则=格式-json格式校验、校验key=item-sku、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
6) 已通过【数据质量 → 规则任务管理】页面完成任务“Doris3兼容性测试任务“创建：Step 1 基础信息中规则名称=Doris3兼容性测试任务，并关联同一 Doris3.x 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_doris3_compat“的“Doris3兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到「Doris3兼容性测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「Doris3兼容性测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例状态显示「已完成」，最新校验结果显示「校验不通过」 3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录质检结果=「校验不通过」 |
| 4 | 点击「格式-json格式校验」规则行操作列的【查看详情】按钮，等待明细弹窗加载完成 | 明细列表正确显示 id=2 的不合规记录，「item_info」字段标红展示 |

##### 【P1】验证「格式-json格式校验」规则在SparkThrift 2.x数据源下执行正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 数据源中心已添加 SparkThrift 2.x 版本数据源「测试数据源_Spark2」并授权给资产平台
3) 已在「通用配置 → json格式校验管理」中维护 key路径「event-type」，中文名称「事件类型」，value格式正则：^(click|view|purchase)$
4) 已在 Spark 数据源的 spark_test_db 数据库中创建测试表并灌入数据：
   CREATE TABLE spark_test_db.json_event_test (
     id INT,
     event_data STRING
   );
   INSERT INTO spark_test_db.json_event_test VALUES
     (1, '{“event“:{“type“:“click“}}'),
     (2, '{“event“:{“type“:“unknown“}}');
5) 已通过【数据质量 → 规则集管理】页面完成规则集“rule_set_spark2_compat“创建：Step 1 基础信息中关联 SparkThrift2.x 数据源的 spark_test_db.json_event_test 表，并新增规则包“Spark2兼容性测试包“；点击【下一步】进入 Step 2 监控规则，点击【新增规则】，选择【有效性校验】，配置字段=event_data（string类型）、统计规则=格式-json格式校验、校验key=event-type、强弱规则=强规则、过滤条件=无、规则描述=无；点击规则行的【保存】按钮，再点击页面底部【保存】，规则集创建成功
6) 已通过【数据质量 → 规则任务管理】页面完成任务“Spark2兼容性测试任务“创建：Step 1 基础信息中规则名称=Spark2兼容性测试任务，并关联同一 Spark 表；点击【下一步】进入 Step 2 监控规则，仅通过【导入规则包】导入规则集“rule_set_spark2_compat“的“Spark2兼容性测试包“；点击【下一步】进入 Step 3 调度属性，点击【保存】，任务创建成功
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面正常打开，列表加载完成 |
| 2 | 找到「Spark2兼容性测试任务」，点击【立即执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到「Spark2兼容性测试任务」最新实例记录并打开实例详情 | 1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配 2) 实例状态显示「已完成」，最新校验结果显示「校验不通过」 3) 实例详情中 id=1 记录质检结果=「校验通过」，id=2 记录因 event.type 值为「unknown」而质检结果=「校验不通过」 |



##### 【P1】验证保存后规则配置参数展示区域各字段内容正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护key路径「device-type」，中文名称「设备类型」，value格式正则：^(mobile|pc|tablet)$
3) 已通过【数据质量 → 规则集管理】页面，创建规则集“rule_set_param_display_test“，关联Doris数据源quality_test_db库含json字段（字段名 device_info，类型 json）的数据表，规则包名称“参数展示测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建，在 Step 2 中配置「格式-json格式校验」规则：
   - 字段：device_info
   - 校验key：device-type
   - 强弱规则：强规则
   并已保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_param_display_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看“参数展示测试包“中已配置的「格式-json格式校验」规则行的参数展示区域 | 规则配置参数展示区域各字段内容如下： 1) 规则类型=「字段级」 2) 字段=「device_info」 3) 统计规则=「格式-json格式校验」 4) 校验key=「device-type」 5) 强弱规则=「强规则」 |


##### 【P1】验证未选择校验key时保存规则提示「请选择校验key」

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_required_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“必填校验测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
3) 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_required_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“必填校验测试包“中点击【新增规则】，选择「有效性校验」，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 - *校验key：不选择任何key 直接点击【保存】按钮 | 保存失败；「校验key」输入框下方显示错误提示「请选择校验key」；规则未被添加到列表 |

##### 【P1】验证选择非json或string类型字段时「格式-json格式校验」统计规则选项不可选

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已执行以下 SQL 创建包含 int 类型字段的测试表：
   CREATE TABLE quality_test_db.int_type_test (
     id INT,
     count_val INT,
     note VARCHAR(255)
   );
3) 已在资产平台引入该表，元数据中 count_val 字段类型识别为 int
4) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_int_type_test“，关联Doris数据源quality_test_db库int_type_test表，规则包名称“int类型限制测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
5) 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_int_type_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“int类型限制测试包“中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「count_val（int）」，展开「统计规则」下拉框 | 「统计规则」下拉框中不出现「格式-json格式校验」选项 |


##### 【P1】验证点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key（共15条）：
   - key路径「check-key-01」，中文名称「校验键01」，value格式正则：^[A-Z]{2}\d{4}$
   - key路径「check-key-02」，中文名称「校验键02」，value格式正则：^1[3-9]\d{9}$
   - key路径「check-key-03」至「check-key-15」，中文名称「校验键03」至「校验键15」，各配置不同正则
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_preview_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“value预览测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_preview_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“value预览测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉框，勾选「check-key-01」「check-key-02」「check-key-03」共3个key | 3个key成功勾选 |
| 3 | 点击「value格式预览」按钮，等待弹窗加载完成 | 弹窗正常打开： 1) 弹窗内列表仅展示已勾选的3个key对应的信息，未勾选的「check-key-04」至「check-key-15」不显示 2) 列表包含两列：「key」列和「value格式」列 3) 「check-key-01」对应「^[A-Z]{2}\d{4}$」 4) 「check-key-02」对应「^1[3-9]\d{9}$」 |
| 4 | 关闭弹窗，取消勾选「check-key-03」，再次点击「value格式预览」按钮，等待弹窗加载完成 | 弹窗内列表更新为仅展示「check-key-01」和「check-key-02」共2条记录，「check-key-03」不再显示 |
| 5 | 关闭弹窗，重新勾选「check-key-03」至「check-key-12」共12个key（合计12个），点击「value格式预览」按钮，查看弹窗分页情况 | 1) 弹窗展示分页控件 2) 默认展示第1页数据 3) 可翻页查看剩余key的格式信息 |


##### 【P1】验证校验key输入框悬浮时展示全部key名，默认仅显示前两个

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「field-key1」，中文名称「字段键1」，value格式正则：^.+$
   - key路径「field-key2」，中文名称「字段键2」，value格式正则：^.+$
   - key路径「field-key3」，中文名称「字段键3」，value格式正则：^.+$
   - key路径「field-key4」，中文名称「字段键4」，value格式正则：^.+$
3) 已通过【数据质量 → 规则集管理】页面，创建规则集“rule_set_hover_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“悬浮展示测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建，在 Step 2 中配置「格式-json格式校验」规则，校验key选择了4个key：「field-key1」「field-key2」「field-key3」「field-key4」，并已保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_hover_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，查看“悬浮展示测试包“中已配置的「格式-json格式校验」规则行的“校验key“列 | 规则集编辑页正常打开，Step 2 监控规则页面加载完成，已配置的「格式-json格式校验」规则行展示校验key为「field-key1;field-key2;field-key3;field-key4」 |
| 3 | 观察“校验key“列在非悬浮状态下的显示内容 | 「校验key」字段区域默认仅展示前两个key「field-key1」和「field-key2」，后续key以省略符截断 |
| 4 | 将鼠标悬浮在「校验key」字段区域 | 浮层展示全部4个key名：「field-key1」「field-key2」「field-key3」「field-key4」 |

##### 【P1】验证校验key回显格式及勾选仅对当前层级生效

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key（层级结构）：
   - 一级key「person」下二级key「name」，路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
   - 一级key「person」下二级key「age」，路径「person-age」，中文名称「人员年龄」，value格式正则：^\d{1,3}$
   - 一级key「address」下二级key「city」，路径「address-city」，中文名称「地址城市」，value格式正则：^.{1,20}$
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_layer_key_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“层级key测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_layer_key_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“层级key测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉框，勾选「person-name」和「address-city」，点击【保存】 | 规则保存成功；规则行的「校验key」列回显内容为「person-name;address-city」，分号分隔不同key路径，连字符分隔层级 |
| 3 | 编辑该规则，重新展开「校验key」下拉框，查看已勾选的key是否正确回显 | 1) 「person-name」复选框显示为勾选状态 2) 「address-city」复选框显示为勾选状态 3) 「person-age」复选框显示为未勾选状态 |

##### 【P1】验证校验key数据量超过200条时默认加载前200条展示

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护超过200条配置了value格式的key（共210条，key命名规则为 test-key-001 至 test-key-210，中文名称分别为「测试键001」至「测试键210」，每条均配置value格式正则 ^.+$），通用配置导入文件生成脚本如下:

import openpyxl

wb = openpyxl.Workbook()
ws1 = wb.active
ws1.title = “一层“
ws1.append([“key“, “中文名称“, “value格式“])
for i in range(1, 211):
    ws1.append([f“test-key-{i:03d}“, f“测试键{i:03d}“, “^.+$“])

wb.save(“json_value_format_import_210.xlsx“)
print(“已生成 json_value_format_import_210.xlsx，共210条一层key数据，均配置value格式“)

3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_large_key_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“大数据量key测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_large_key_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“大数据量key测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉框，观察初始加载的key列表 | 「校验key」下拉框初始展示前200条key（test-key-001 至 test-key-200），第201条及以后的key（test-key-201至test-key-210）不在初始列表中显示 |
| 3 | 在搜索框中输入「test-key-205」进行搜索 | 搜索结果中显示「test-key-205」，可正常选中 |

##### 【P1】验证校验key搜索功能正常

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「order-amount」，中文名称「订单金额」，value格式正则：^\d+\.\d{2}$
   - key路径「order-status」，中文名称「订单状态」，value格式正则：^(paid|pending)$
   - key路径「user-name」，中文名称「用户姓名」，value格式正则：^.{1,20}$
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_key_search_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“key搜索测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_key_search_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key搜索测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉框，在搜索框中输入「order」 | 下拉列表过滤展示，仅显示包含「order」的key：「order-amount」和「order-status」；「user-name」不在列表中显示 |
| 3 | 清空搜索框内容，查看下拉列表 | 下拉列表恢复展示全部key，「order-amount」「order-status」「user-name」均重新显示 |

##### 【P1】验证校验key支持多选和全选操作

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下配置了value格式的key：
   - key路径「user-name」，中文名称「用户姓名」，value格式正则：^[\u4e00-\u9fa5a-zA-Z]{1,20}$
   - key路径「user-phone」，中文名称「用户手机号」，value格式正则：^1[3-9]\d{9}$
   - key路径「user-id」，中文名称「用户身份证号」，value格式正则：^\d{18}$
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_multi_select_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“多选全选测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_multi_select_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“多选全选测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉框，分别勾选「user-name」「user-phone」「user-id」三个key | 三个key均成功勾选，复选框显示为选中状态 |
| 3 | 查看输入框的回显内容 | 输入框回显格式为「user-name;user-phone;user-id」，多个key以分号分隔 |
| 4 | 点击下拉框中的「全部」选项 | 列表中所有可选key（已配置value格式的key）全部被勾选，「全部」选项复选框显示为选中状态 |
| 5 | 再次点击「全部」选项取消全选 | 所有key均取消勾选，「全部」选项复选框恢复为未选中状态，输入框回显清空 |

##### 【P1】验证校验key列表中仅配置了value格式的key可被选中，未配置value格式的key不可选中

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护以下数据：
   - key路径「product-name」，中文名称「产品名称」，value格式正则：^.{1,50}$
   - key路径「product-code」，中文名称「产品编码」，value格式正则：^[A-Z]{2}\d{6}$
   - key路径「product-desc」，中文名称「产品描述」，未配置value格式
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_key_select_test“，关联Doris数据源quality_test_db库json_format_test表，规则包名称“key选择测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_key_select_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“key选择测试包“中点击【新增规则】，添加有效性校验规则，按如下配置： - *字段：info（json） - *统计规则：格式-json格式校验 展开「校验key」下拉选择框，查看列表中各key的可选状态 | 「校验key」下拉框列表中： 1) 「product-name」（已配置value格式）显示为可选状态，可点击勾选 2) 「product-code」（已配置value格式）显示为可选状态，可点击勾选 3) 「product-desc」（未配置value格式）显示为不可选状态，置灰禁用 |
| 3 | 点击「product-desc」进行选中操作 | 「product-desc」无法被选中，复选框保持未勾选状态 |
| 4 | 点击勾选「product-name」和「product-code」 | 「product-name」和「product-code」均成功勾选，下拉框输入框内回显「product-name;product-code」 |


##### 【P1】验证「格式-json格式校验」仅支持json和string类型字段，选择其他类型字段时不显示该统计规则选项

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已执行以下 SQL 创建包含多种字段类型的测试表：
   CREATE TABLE quality_test_db.multi_type_test (
     id INT,
     name VARCHAR(255),
     age INT,
     salary DECIMAL(10,2),
     info JSON,
     created_at DATETIME
   );
3) 已在资产平台引入该表，且元数据字段类型识别正确
4) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_field_type_test“，关联Doris数据源quality_test_db库multi_type_test表，规则包名称“字段类型测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
5) 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_field_type_test“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“字段类型测试包“中点击【新增规则】，添加有效性校验规则，分别将「字段」依次选择为「age（int）」「salary（decimal）」「created_at（datetime）」，观察每次选择后「统计规则」下拉框的可选项 | 选择 int、decimal、datetime 类型字段时，「统计规则」下拉框中均不出现「格式-json格式校验」选项 |
| 3 | 将「字段」切换选择为「info（json）」，展开「统计规则」下拉框查看选项 | 选择 json 类型字段后，「统计规则」下拉框中出现「格式-json格式校验」选项 |
| 4 | 将「字段」切换选择为「name（varchar）」，展开「统计规则」下拉框查看选项 | 选择 varchar 类型字段后，「统计规则」下拉框中同样出现「格式-json格式校验」选项 |


##### 【P1】验证「格式-json格式校验」统计规则悬浮提示内容正确

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
3) 已通过【数据质量 → 规则集管理】页面，点击【新建规则集】创建规则集“rule_set_value_fmt_tip“，关联Doris数据源 quality_test_db 库 json_format_test 表，规则包名称“提示测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_value_fmt_tip“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“提示测试包“中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，「统计规则」下拉框选择「格式-json格式校验」，将鼠标悬浮在「格式-json格式校验」选项或其旁边的提示图标上 | 悬浮提示内容显示为：「校验内容为key名对应的value格式是否符合要求，value格式需要在通用配置模块维护。」 |

##### 【P1】验证规则配置页「统计规则」下拉框中「格式-json格式校验」选项位置在自定义正则上方

> 前置条件

```
1) 使用 admin 账号登录系统
2) 已在「通用配置 → json格式校验管理」中维护key路径「person-name」，中文名称「人员姓名」，value格式正则：^[\u4e00-\u9fa5]+$
3) 已通过【数据质量 → 规则集管理】页面创建规则集“rule_set_value_fmt_ui“，关联Doris数据源 quality_test_db 库 json_format_test 表（含字段 info（JSON类型）、name（VARCHAR类型）），规则包名称“value格式校验UI测试包“，点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 payload，点击规则行【保存】，再点击页面底部【保存】完成规则集创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表加载完成 |
| 2 | 找到规则集“rule_set_value_fmt_ui“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“value格式校验UI测试包“中点击【新增规则】，选择「有效性校验」，「字段」下拉框选择「info（json）」，展开「统计规则」下拉框，查看选项列表 | 「统计规则」下拉框中出现「格式-json格式校验」选项，且该选项位于「自定义正则」选项的上方 |

### 【内置规则丰富】有效性，支持设置字段多规则的且或关系(#10461)

##### 【P1】验证仅配置枚举值not in校验不通过时质量报告详情说明展示not in规则描述

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
-- category 字段值为 4 和 5 的数据：id=2(category=4)、id=5(category=5)
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: notin失败包
点击【下一步】进入 Step 2 监控规则，在规则包“notin失败包“中点击【新增规则】，统计函数选择【枚举值】，配置如下：
- *字段: category
- *枚举值: not in '4,5'
- 强弱规则: 强规则
- 过滤条件: 无
- 规则描述: 无
点击【保存】完成规则集“ruleset_15695_enum_notin“创建
4) 已通过【数据质量 → 规则任务管理】创建任务“task_15695_enum_notin_fail“，通过【导入规则包】导入“ruleset_15695_enum_notin“的“notin失败包“，点击【下一步】进入 Step 3 调度属性，保持默认配置后点击【保存】，已执行完成且校验结果为不通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成 | 质量报告页面打开，报告列表加载完成 |
| 2 | 找到任务 task_15695_enum_notin_fail 对应的枚举值规则行，查看详情说明列内容 | 详情说明列中规则描述部分显示「枚举值not in '4,5'」，约定范围外的值数量统计准确，操作列显示【查看详情】链接 |

##### 【P1】验证仅配置枚举值in校验不通过时质量报告详情说明包含越界值数量统计

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
-- category 字段不在枚举值 '1,2,3' 内的数据：id=2(category=4)、id=5(category=5)
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 枚举失败包
点击【下一步】进入 Step 2 监控规则，在规则包“枚举失败包“中点击【新增规则】，统计函数选择【枚举值】，配置如下：
- *字段: category
- *枚举值: in '1,2,3'
- 强弱规则: 强规则
- 过滤条件: 无
- 规则描述: 无
点击【保存】完成规则集“ruleset_15695_enum_fail“创建
4) 已通过【数据质量 → 规则任务管理】创建任务“task_15695_enum_fail“，通过【导入规则包】导入“ruleset_15695_enum_fail“的“枚举失败包“，点击【下一步】进入 Step 3 调度属性，保持默认配置后点击【保存】，已执行完成且校验结果为不通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面，等待报告列表加载完成 | 质量报告页面打开，报告列表加载完成 |
| 2 | 找到任务 task_15695_enum_fail 对应的枚举值规则行，查看详情说明列内容 | 详情说明列显示「字段枚举值存在约定范围外的值，约定范围外的值的数量总计为2个，不符合规则“枚举值in '1,2,3'“」，操作列显示【查看详情】链接 |



##### 【P1】验证取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 规则任务 task_15695_or 已执行完成，或关系下全部记录均满足，校验结果为通过
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待列表加载完成 | 校验结果查询页面打开，列表显示已有任务记录 |
| 2 | 在列表中找到 task_15695_or 最新实例记录，点击【查看详情】打开实例详情 | 实例详情页面打开，规则名称为【取值范围&枚举范围】的规则行数据加载完成 |
| 3 | 在实例详情中查看该规则行的质检结果列、详情说明列和操作列内容 | 实例详情中该规则行显示如下： 1) 质检结果列显示「校验通过」 2) 详情说明列显示「符合规则“取值范围>1“或“枚举值in '1,2,3'“」 3) 操作列显示 --，不显示【查看详情】链接，明细数据不可访问 |

##### 【P1】验证取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 规则任务 task_15695_and 最新实例已执行完成，且关系规则校验结果为不通过
3) task_15695_and 最新实例详情中，取值范围&枚举范围规则行操作列显示【查看详情】链接，对应不通过记录为 id=2、id=4、id=5
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 校验结果查询】页面，等待列表加载完成 | 校验结果查询页面打开，列表显示已有任务记录 |
| 2 | 在列表中找到 task_15695_and 最新实例记录，点击【查看详情】打开实例详情，再点击取值范围&枚举范围规则行操作列【查看详情】链接 | 明细数据页面打开，数据列表显示不通过记录（id=2、id=4、id=5），共 3 条 |
| 3 | 点击【下载明细】按钮，等待文件下载完成 | 浏览器触发文件下载 |
| 4 | 打开下载的明细文件（Excel 格式），查看 score 字段列的单元格格式及颜色标注 | 下载文件展示如下： 1) 文件可正常打开，包含所有字段列（id、score、category） 2) score 字段列中不符合规则记录对应单元格以红色背景或红色字体标红展示 3) 文件中记录数为 3 条（id=2、id=4、id=5），与页面明细列表数量一致 |



##### 【P1】验证 验证规则库中新增取值范围&枚举范围内置规则展示正确

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 账号具有数据质量模块查看权限
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则库配置】页面，等待规则库配置列表加载完成 | 规则库配置页面打开，列表显示规则数据 |
| 2 | 点击页面顶部【内置规则】Tab 页签，在规则分类筛选下拉框中勾选【有效性校验】，点击【确定】按钮，等待列表刷新完成 | 列表按有效性校验分类筛选刷新完成，仅显示规则分类为「有效性校验」的规则条目 |
| 3 | 在规则列表中查找规则名称为【取值范围&枚举范围】的规则条目，查看该行各列内容 | 规则库列表中存在规则名称为【取值范围&枚举范围】的条目，各列显示如下： 1) 规则解释列显示「取值范围和枚举范围的联合校验」 2) 规则分类列显示「有效性校验」 3) 关联范围列显示「字段」 4) 规则描述列显示「校验字段值取值范围和枚举范围是否符合要求，支持配置规则且或关系」 |
| 4 | 导出规则库 | 存在取值范围&枚举范围-取值范围和枚举范围的联合校验-有效性校验 |



##### 【P1】验证执行含取值范围&枚举范围或关系规则的任务后校验通过

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
-- 或关系下：只需满足 score>1 或 category in '1,2,3' 其中之一即通过
-- 全部记录均满足或关系，校验通过
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 或关系校验包
点击【下一步】进入 Step 2 监控规则，在规则包“或关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置如下：
- *字段: score
- *取值范围: >1
- *枚举值: category in '1,2,3'
- *条件关系: 或
- 强弱规则: 强规则
- 过滤条件: 无
- 规则描述: 无
点击【保存】完成规则集“ruleset_15695_or“创建
4) 已通过【数据质量 → 规则任务管理】页面，点击【新建监控规则】创建任务“task_15695_or“，Step 1 关联 Doris 数据源 test_db.quality_test_num 表，Step 2 通过【导入规则包】导入“ruleset_15695_or“的“或关系校验包“，已完成 Step 3 调度属性并保存
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成 | 规则任务管理页面打开，任务列表显示已有任务数据行 |
| 2 | 点击任务 task_15695_or 对应行的【执行】按钮 | 页面弹出提示信息，提示任务已提交执行 |
| 3 | 进入【数据质量 → 校验结果查询】页面，找到 task_15695_or 最新实例记录并打开实例详情 | 实例详情中该规则行显示如下： 1) 质检结果列显示「校验通过」 2) 详情说明列显示「符合规则“取值范围>1“或“枚举值in '1,2,3'“」 3) 操作列显示 --，不显示【查看详情】链接 |



##### 【P1】验证在规则集中已保存的且关系规则编辑切换为或关系后保存成功

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置（选择数据源=Doris，数据库=test_db，数据表=quality_test_num，规则包名称=且关系校验包），点击【下一步】进入 Step 2 监控规则，在规则包“且关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置字段=score、取值范围>1且<10、枚举值 category in '1,2,3'、条件关系=且、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_and“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_and“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到已配置的取值范围&枚举范围规则，将且或关系从【且】切换为【或】单选按钮 | 且或关系单选按钮切换为「或」被选中 |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中且或关系列由「且」变更为「或」 |


##### 【P1】验证取值范围和枚举值均未填写时点击保存提示至少填写一项

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置（选择数据源=Doris，数据库=test_db，数据表=quality_test_num，规则包名称=且关系校验包），点击【下一步】进入 Step 2 监控规则，在规则包“且关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置字段=score、取值范围>1且<10、枚举值 category in '1,2,3'、条件关系=且、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_and“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_and“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“且关系校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 | 规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」 |
| 3 | 在当前规则配置表单中按顺序填写如下： - *字段: score - *取值范围行: 期望值和操作符均不填写，保持为空 - *枚举值行: 不填写，保持为空 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | *字段下拉框显示已选中 score，取值范围和枚举值均为空 |
| 4 | 点击【保存】按钮 | 保存失败，页面展示红色校验错误提示「取值范围和枚举值至少填写一项」，规则未被保存 |

##### 【P1】验证取值范围和枚举值均已填写但关系未选择时点击保存提示校验错误

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置（选择数据源=Doris，数据库=test_db，数据表=quality_test_num，规则包名称=且关系校验包），点击【下一步】进入 Step 2 监控规则，在规则包“且关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置字段=score、取值范围>1且<10、枚举值 category in '1,2,3'、条件关系=且、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_and“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_and“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“且关系校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 | 规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」 |
| 3 | 在当前规则配置表单中按顺序填写如下： - *字段: score - *取值范围行: 期望值输入 1，操作符选择 > - *枚举值行-枚举值类型: 选择 in - *枚举值行-枚举值信息: 依次输入 1、2、3 - *条件关系: 保持默认空选项（不选择且/或） - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | *字段下拉框显示已选中 score，取值范围操作符显示 >、期望值显示 1，枚举值类型显示 in、枚举值信息显示 1、2、3，条件关系未选择 |
| 4 | 点击【保存】按钮 | 保存失败，页面在且或关系设置位置展示红色校验错误提示「请选择规则关系」，规则未被保存 |

##### 【P1】验证枚举值下拉框已选择in但值输入框为空时点击保存提示校验错误

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置（选择数据源=Doris，数据库=test_db，数据表=quality_test_num，规则包名称=且关系校验包），点击【下一步】进入 Step 2 监控规则，在规则包“且关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置字段=score、取值范围>1且<10、枚举值 category in '1,2,3'、条件关系=且、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_and“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_and“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“且关系校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 | 规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」 |
| 3 | 在当前规则配置表单中按顺序填写如下： - *字段: score - *取值范围行: 期望值输入 1，操作符选择 > - *枚举值行-枚举值类型: 选择 in - *枚举值行-枚举值信息: 留空不输入任何值 - *条件关系: 选择【且】 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | *字段下拉框显示已选中 score，取值范围操作符显示 >、期望值显示 1，枚举值类型显示 in、枚举值信息为空，条件关系显示「且」 |
| 4 | 点击【保存】按钮 | 保存失败，页面在枚举值信息输入框位置展示红色校验错误提示「请输入枚举值」，规则未被保存 |

##### 【P1】验证取值范围设置期望值已填写但操作符未选择时点击保存提示校验错误

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置（选择数据源=Doris，数据库=test_db，数据表=quality_test_num，规则包名称=且关系校验包），点击【下一步】进入 Step 2 监控规则，在规则包“且关系校验包“中点击【新增规则】，统计函数选择【取值范围&枚举范围】，配置字段=score、取值范围>1且<10、枚举值 category in '1,2,3'、条件关系=且、强弱规则=强规则，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_and“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面正常打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_and“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“且关系校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】 | 规则集编辑页 Step 2 打开，新增规则配置区域展开，统计函数显示「取值范围&枚举范围」 |
| 3 | 在当前规则配置表单中按顺序填写如下： - *字段: score - *取值范围行-期望值: 输入 5 - *取值范围行-操作符: 保持默认空选项（不选择任何操作符） - *枚举值行-枚举值类型: 选择 in - *枚举值行-枚举值信息: 依次输入 1、2、3 - *条件关系: 选择【且】 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | *字段下拉框显示已选中 score，取值范围期望值显示 5、操作符未选择，枚举值类型显示 in、枚举值信息显示 1、2、3，条件关系显示「且」 |
| 4 | 点击【保存】按钮 | 保存失败，页面在取值范围设置操作符位置展示红色校验错误提示「请选择操作符」，规则未被保存 |


##### 【P1】验证原有枚举值规则同步新增not in选项且可正常保存

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 原枚举值包
点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 id，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_enum_orig“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_enum_orig“，点击操作列的【编辑】按钮，进入 Step 2 监控规则，在“原枚举值包“中点击【新增规则】，在统计函数下拉框中选择原有的【枚举值】规则类型，查看枚举值设置行中下拉框选项 | 枚举值设置下拉框中包含【in】和【not in】两个选项 |
| 3 | 在枚举值设置下拉框中选择【not in】，按顺序填写如下： - *字段: category - *枚举值信息: 依次输入 4、5 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 点击【保存】按钮，再点击页面底部【保存】 | 规则保存成功，规则列表中对应规则的枚举值列显示 not in '4,5' |

##### 【P1】验证在规则集中枚举值选择not in保存成功

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: notin校验包
点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 id，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_notin“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_notin“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“notin校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下： - *字段: category - *取值范围行: 不填写，保持为空 - *枚举值行-枚举值类型: 选择 not in - *枚举值行-枚举值信息: 依次输入 4、5 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | 规则集编辑页 Step 2 打开，规则包名称显示“notin校验包“，关联表显示 test_db.quality_test_num |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则的枚举值设置列显示 not in '4,5' |


##### 【P1】验证在规则集中仅填写枚举值可正常保存

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 仅枚举值包
点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 id，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_enum“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_enum“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“仅枚举值包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下： - *字段: category - *取值范围行: 不填写，保持为空 - *枚举值行-枚举值类型: 选择 in - *枚举值行-枚举值信息: 依次输入 1、2、3 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | 规则集编辑页 Step 2 打开，规则包名称显示“仅枚举值包“，关联表显示 test_db.quality_test_num |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则的枚举值列显示 in '1,2,3'，取值范围列显示 -- |


##### 【P1】验证在规则集中仅填写取值范围可正常保存

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 仅取值范围包
点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 id，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_range“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_range“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“仅取值范围包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下： - *字段: score - *取值范围行: 期望值输入 0，操作符选择 >= - *枚举值行: 不填写，保持为空 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | 规则集编辑页 Step 2 打开，规则包名称显示“仅取值范围包“，关联表显示 test_db.quality_test_num |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中对应规则显示如下： 1) 取值范围列显示 >=0 2) 枚举值设置列显示 -- 3) 且或关系列不显示（仅一项规则时无需关系） |


##### 【P1】验证在规则集中配置取值范围&枚举范围规则或关系时保存成功

> 前置条件

```
1) 使用 admin 账号登录数据资产平台
2) 已在 Doris 数据源中准备测试表及数据：
DROP TABLE IF EXISTS test_db.quality_test_num;
CREATE TABLE test_db.quality_test_num (
  id INT NOT NULL,
  score DOUBLE,
  category VARCHAR(50)
) DISTRIBUTED BY HASH(id) BUCKETS 3 PROPERTIES(“replication_num“=“1“);
INSERT INTO test_db.quality_test_num VALUES
  (1, 5.0, '2'),
  (2, 15.0, '4'),
  (3, 3.0, '1'),
  (4, -1.0, '3'),
  (5, 8.0, '5');
3) 已通过【数据质量 → 规则集管理】页面点击【新建规则集】，完成 Step 1 基础信息配置如下：
- *选择数据源: Doris
- *选择数据库: test_db
- *选择数据表: quality_test_num
- 规则集描述: 无
- *规则包名称: 或关系校验包
点击【下一步】进入 Step 2 监控规则，在规则包中点击【新增规则】，统计函数选择【非空值数】，字段选择 id，点击规则行【保存】，再点击页面底部【保存】完成规则集“ruleset_15695_or“创建
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成 | 规则集管理页面打开，列表显示已有规则集数据行 |
| 2 | 找到“ruleset_15695_or“，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在“或关系校验包“中点击【新增规则】，在统计函数下拉框中选择【取值范围&枚举范围】，按顺序填写如下： - *字段: score - *取值范围行: 期望值输入 1，操作符选择 > - *条件关系: 选择【或】单选按钮 - *枚举值行-枚举值类型: 选择 in - *枚举值行-枚举值信息: 依次输入 1、2、3 - 强弱规则: 强规则 - 过滤条件: 无 - 规则描述: 无 | 规则集编辑页 Step 2 打开，规则包名称显示“或关系校验包“，关联表显示 test_db.quality_test_num |
| 3 | 点击【保存】按钮，再点击页面底部【保存】完成规则集保存 | 规则保存成功，规则列表中新增规则的且或关系列显示「或」 |

### 【数据地图】查询优化(#10473)

##### 【P1】验证标签结果页列表展示业务口径列且位置在创建人前

> 前置条件

```
已登录系统并具备【元数据 → 数据地图】访问权限；标签结果页存在标签「高价值客户」（业务口径：近90天累计订单金额大于10万元的客户标签）和「待回访客户」（业务口径：近30天存在咨询但未成交的客户标签）；列表页已展示创建人列。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【元数据 → 数据地图】页面，切换结果类型到【标签】 | 标签结果页正常加载并展示标签结果列表。 |
| 2 | 查看列表表头顺序与标签“高价值客户”所在行 | 列表新增“业务口径”列，且位于“创建人”列之前；“高价值客户”行展示其对应业务口径文本。 |
| 3 | 打开“高价值客户”详情侧栏或详情页并查看“业务口径”字段 | 详情中的业务口径字段正常展示，且其值与列表中同一标签的业务口径内容一致。 |



##### 【P1】验证指标详情展示业务口径且与列表值一致

> 前置条件

```
已登录系统并具备【元数据 → 数据地图】访问权限；指标结果页存在指标「客户活跃度」（业务口径：用于评估近30天客户登录与下单活跃程度）和「订单履约率」（业务口径：用于衡量订单按时履约情况）；列表页已展示创建人列。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【元数据 → 数据地图】页面，切换结果类型到【指标】 | 指标结果页正常加载。 |
| 2 | 搜索“客户活跃度”后打开该指标的详情侧栏或详情页 | 页面成功打开指标详情区域。 |
| 3 | 查看详情中的“业务口径”字段，并与列表行中的“业务口径”列对比 | 详情中的业务口径字段正常展示，且其值与列表中该指标对应的业务口径内容保持一致。 |

##### 【P1】验证指标结果页列表展示业务口径列且位置在创建人前

> 前置条件

```
已登录系统并具备【元数据 → 数据地图】访问权限；指标结果页存在指标「客户活跃度」（业务口径：用于评估近30天客户登录与下单活跃程度）和「订单履约率」（业务口径：用于衡量订单按时履约情况）；列表页已展示创建人列。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【元数据 → 数据地图】页面，切换结果类型到【指标】 | 指标结果页正常加载并展示结果列表。 |
| 2 | 查看列表表头顺序 | 列表新增“业务口径”列，且该列位于“创建人”列之前，不覆盖原有字段。 |
| 3 | 查看指标“客户活跃度”所在行的业务口径值 | “业务口径”列展示“用于评估近30天客户登录与下单活跃程度”等实际文本，显示内容与该指标配置一致。 |



##### 【P1】验证字段结果页仅选择资产目录时只展示该目录关联字段

> 前置条件

```
已登录系统并具备【元数据 → 数据地图】访问权限；系统已配置资产目录「客户域」「订单域」；「客户域」关联表 customer_info，包含字段 cust_name（客户名称）、cust_cert_type（证件类型）、cust_cert_code（证件号）；「订单域」关联表 order_info，包含字段 order_amount（订单金额）、order_name（订单名称）。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【元数据 → 数据地图】页面，切换结果类型到【字段】 | 字段结果页正常加载。 |
| 2 | 保持搜索框为空，在左侧资产目录树选择「订单域」 | 页面选中「订单域」目录节点，顶部关键字条件保持为空。 |
| 3 | 点击【查询】按钮并查看结果列表 | 结果列表仅展示 order_info 表下的关联字段，如 order_amount、order_name；customer_info 表下字段不展示。 |

### 【数据质量】报告搜索优化(#10474)

##### 【P1】验证多表规则规则名称无匹配时显示空结果

> 前置条件

```
已生成报告页存在报告「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」，可进入【报告详情】页面；
其规则明细包含：
字段规则：1）完整性校验 / 供应商名称非空校验 / supplier_name / STRING / 校验失败；2）有效性校验 / 供应商编码格式校验 / supplier_code / STRING / 校验不通过；3）唯一性校验 / 供应商编码唯一校验 / supplier_code / STRING / 校验通过；4）统计性校验 / 分区记录数波动校验 / dt / STRING / 校验通过。
单表规则：1）完整性校验 / 主键非空校验 / 校验失败；2）统计性校验 / 分区行数波动校验 / 校验不通过；3）唯一性校验 / 主键唯一校验 / 校验通过。
多表规则：1）合理性校验 / 主表与维表金额差异阈值校验 / 校验失败；2）时效性校验 / 主表与维表分区时效对齐校验 / 校验不通过；3）统计性校验 / 主表与维表记录数差异校验 / 校验通过。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 点击「供应商主数据有效性周报」所在行的【报告详情】按钮 | 成功进入「供应商主数据有效性周报」报告详情页。 |
| 4 | 在「多表规则」分区的「规则名称」输入框输入「不存在的多表规则15700」，点击【查询】按钮 | 多表规则表格显示「暂无数据」，当前分区保留查询值「不存在的多表规则15700」。 |

##### 【P1】验证单表规则规则名称无匹配时显示空结果

> 前置条件

```
已生成报告页存在报告「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」，可进入【报告详情】页面；
其规则明细包含：
字段规则：1）完整性校验 / 供应商名称非空校验 / supplier_name / STRING / 校验失败；2）有效性校验 / 供应商编码格式校验 / supplier_code / STRING / 校验不通过；3）唯一性校验 / 供应商编码唯一校验 / supplier_code / STRING / 校验通过；4）统计性校验 / 分区记录数波动校验 / dt / STRING / 校验通过。
单表规则：1）完整性校验 / 主键非空校验 / 校验失败；2）统计性校验 / 分区行数波动校验 / 校验不通过；3）唯一性校验 / 主键唯一校验 / 校验通过。
多表规则：1）合理性校验 / 主表与维表金额差异阈值校验 / 校验失败；2）时效性校验 / 主表与维表分区时效对齐校验 / 校验不通过；3）统计性校验 / 主表与维表记录数差异校验 / 校验通过。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 点击「供应商主数据有效性周报」所在行的【报告详情】按钮 | 成功进入「供应商主数据有效性周报」报告详情页。 |
| 4 | 在「单表规则」分区的「规则名称」输入框输入「不存在的单表规则15700」，点击【查询】按钮 | 单表规则表格显示「暂无数据」，当前分区保留查询值「不存在的单表规则15700」。 |


##### 【P1】验证字段规则规则名称无匹配时显示空结果

> 前置条件

```
已生成报告页存在报告「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」，可进入【报告详情】页面；
其规则明细包含：
字段规则：1）完整性校验 / 供应商名称非空校验 / supplier_name / STRING / 校验失败；2）有效性校验 / 供应商编码格式校验 / supplier_code / STRING / 校验不通过；3）唯一性校验 / 供应商编码唯一校验 / supplier_code / STRING / 校验通过；4）统计性校验 / 分区记录数波动校验 / dt / STRING / 校验通过。
单表规则：1）完整性校验 / 主键非空校验 / 校验失败；2）统计性校验 / 分区行数波动校验 / 校验不通过；3）唯一性校验 / 主键唯一校验 / 校验通过。
多表规则：1）合理性校验 / 主表与维表金额差异阈值校验 / 校验失败；2）时效性校验 / 主表与维表分区时效对齐校验 / 校验不通过；3）统计性校验 / 主表与维表记录数差异校验 / 校验通过。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 点击「供应商主数据有效性周报」所在行的【报告详情】按钮 | 成功进入「供应商主数据有效性周报」报告详情页。 |
| 4 | 在「字段规则」分区的「规则名称」输入框输入「不存在的字段规则15700」，点击【查询】按钮 | 「字段规则」表格显示「暂无数据」，当前分区保留查询值「不存在的字段规则15700」，「单表规则」「多表规则」分区仍保持可见。 |



##### 【P1】验证已生成报告列表页重置后恢复初始查询状态

> 前置条件

```
已生成报告页存在以下报告记录：
1）报告名称「供应商主数据完整性日报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-28 10:15:00」；
2）报告名称「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」；
3）报告名称「车辆订单唯一性日报」，数据表「dwd_vehicle_order_di」，生成时间「2026-03-30 09:20:00」；
4）报告名称「用户标签时效性月报」，数据表「ads_user_tag_snapshot_df」，生成时间「2026-03-31 15:40:00」。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 在「报告名称」输入框输入「供应商主数据」，在「数据表」输入框输入「dwd_supplier_info」，在「生成时间」选择「2026-03-28 00:00:00」至「2026-03-29 23:59:59」，点击【查询】按钮 | 列表仅显示「供应商主数据完整性日报」和「供应商主数据有效性周报」2条记录。 |
| 4 | 点击【重置】按钮 | 「报告名称」「数据表」输入框内容被清空，「生成时间」恢复为进入页面时的初始值。 |
| 5 | 查看列表数据 | 列表恢复展示前置条件中的4条报告记录。 |

##### 【P1】验证已生成报告列表页报告名称无匹配时显示空结果

> 前置条件

```
已生成报告页存在以下报告记录：
1）报告名称「供应商主数据完整性日报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-28 10:15:00」；
2）报告名称「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」；
3）报告名称「车辆订单唯一性日报」，数据表「dwd_vehicle_order_di」，生成时间「2026-03-30 09:20:00」；
4）报告名称「用户标签时效性月报」，数据表「ads_user_tag_snapshot_df」，生成时间「2026-03-31 15:40:00」。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 在「报告名称」输入框输入「不存在的报告名称15700」，点击【查询】按钮 | 列表不返回任何报告记录，列表区域显示「暂无数据」，查询框保留输入值「不存在的报告名称15700」。 |

##### 【P1】验证已生成报告列表页支持报告名称与数据表模糊搜索

> 前置条件

```
已生成报告页存在以下报告记录：
1）报告名称「供应商主数据完整性日报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-28 10:15:00」；
2）报告名称「供应商主数据有效性周报」，数据表「dwd_supplier_info_di」，生成时间「2026-03-29 10:30:00」；
3）报告名称「车辆订单唯一性日报」，数据表「dwd_vehicle_order_di」，生成时间「2026-03-30 09:20:00」；
4）报告名称「用户标签时效性月报」，数据表「ads_user_tag_snapshot_df」，生成时间「2026-03-31 15:40:00」。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 数据质量报告】页面 | 数据质量报告页面正常加载。 |
| 2 | 点击【已生成报告】页签 | 成功切换到「已生成报告」列表页。 |
| 3 | 在「报告名称」输入框输入「唯一性」，点击【查询】按钮 | 列表仅显示报告名称包含「唯一性」的记录，结果为「车辆订单唯一性日报」。 |
| 4 | 点击【重置】按钮 | 查询条件恢复为进入页面时的初始状态，列表重新展示前置条件中的全部报告记录。 |
| 5 | 在「数据表」输入框输入「user_tag_snapshot」，点击【查询】按钮 | 列表仅显示数据表包含「user_tag_snapshot」的记录，结果为「用户标签时效性月报」，数据表显示为「ads_user_tag_snapshot_df」。 |

### 【数据资产】落标检查任务、元数据同步任务支持配置环境参数(#10454)

##### 【P1】验证编辑元数据同步任务支持配置环境参数，功能正确

> 前置条件

```
平台已存在sparkthrift数据源的元数据同步任务A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产-元数据-元数据同步】页面 | 页面正常进入 |
| 2 | 选择同步任务A，点击编辑，进入调度配置页面 | 展示「环境参数配置」按钮 |
| 3 | 点击「环境参数配置」按钮 | 弹出参数配置弹窗，弹窗内为参数编辑框，展示可配置的Spark参数及注释说明 |
| 4 | 修改环境参数内容，点击确定 | 任务保存成功，为同步中状态 |
| 5 | 其余内容正确配置，点击新增并立即执行 | 成功同步，数据地图里对应表详情正确 |
| 6 | 等待同步完成，查看同步详情 | 环境参数配置生效 |
| 7 | 进入yarn地址查看环境参数是否生效 |  |

##### 【P1】验证编辑落标检查任务支持配置环境参数，功能正确

> 前置条件

```
平台已存在落标检查任务A
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产-数据标准-落标检查】页面 | 页面正常进入 |
| 2 | 选择落标任务A，点击编辑 | 进入编辑任务页面 |
| 3 | 进入调度配置页面 | 展示「环境参数配置」按钮 |
| 4 | 点击「环境参数配置」按钮 | 弹出参数配置弹窗，弹窗内为参数编辑框，展示可配置的Spark参数及注释说明 |
| 5 | 修改环境参数内容，点击确定 | 任务保存成功，为检查中状态 |
| 6 | 其余内容正确配置，点击新增并立即执行 | 成功完成检查，任务明细正确 |
| 7 | 等待检查完成，查看任务明细 | 环境参数配置生效 |
| 8 | 进入yarn地址查看环境参数是否生效 |  |

### 【质量总览】总览看板展示(#10453)

##### 【P1】验证【数据质量-总览】-【最近一次更新时间】内容正确更新

> 前置条件

```
当前时间为2026-03-13 15:00:00
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产-数据质量-总览】页面 | 页面正常进入 |
| 2 | 查看【最近一次更新时间】 | 显示为2026-03-13 15:00:00 |
| 3 | 等待30分钟，查看【最近一次更新时间】 | 未变化，显示为2026-03-13 15:00:00 |
| 4 | 等待1小时，查看【最近一次更新时间】 | 变化为2026-03-13 16:00:00 |

##### 【P1】验证历史质量规则的【数据质量-总览】页面展示正确

> 前置条件

```
资产-数据质量存在历史项目test1，且该项目有质量规则任务
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产-数据质量】页面 | 页面正常进入 |
| 2 | 选择项目test1，查看【总览】页面 | 页面详情同前面用例，展示正确 |

##### 【P1】验证不同项目的【数据质量-总览】页面展示正确

> 前置条件

```
资产-数据质量已存在项目test1，项目test2
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【资产-数据质量】页面 | 页面正常进入 |
| 2 | 选择项目test1，查看【总览】页面 | 页面详情展示正确 |
| 3 | 切换项目为项目test2，查看【总览】页面 | 页面详情正确更新，展示正确 |

### 【通用配置】json格式配置(#10458)

##### 【P1】验证大数据量场景key记录下载数量是否存在限制

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已导入或新增大量key记录（建议500条以上第一层级key）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成，分页组件显示总记录数 |
| 2 | 点击列表右上角【导出】按钮, 等待文件下载完成 | 文件下载成功，打开下载的xlsx文件，核对导出的key记录总数与列表中显示的总记录数一致 |


##### 【P1】验证筛选后导出仅包含筛选结果数据

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已存在由用户 exportUser@dtstack.com 创建的key exportKey1
3) 列表中也存在由其他用户创建的数据
4) 使用 exportUser 账号登录系统，在json格式校验管理页面创建key exportKey1 数据后退出，切换回 admin 账号登录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 在创建人筛选器中选择 exportUser@dtstack.com，等待列表筛选结果返回 | 列表仅显示创建人为 exportUser@dtstack.com 的记录 |
| 3 | 点击【导出】按钮，在确认弹窗中点击【确认】，等待文件下载完成 | 下载文件仅包含创建人为 exportUser@dtstack.com 的记录，不包含其他用户的数据 |


##### 【P1】验证导入功能正常(重复则跳过, 2~5层上一层key不存在 -> 报错)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中不存在key为 noParent 的记录
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key       | 中文名称 | value格式 |
   | noParent         | orphanKey2 | 孤儿键   | ^test$    |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 导入失败或部分失败，系统提示上一层级key名 noParent 不存在，orphanKey2 未被导入 |

##### 【P1】验证导入功能正常(重复则跳过, 2~5层上一层key存在+key不存在 -> 新增N层key)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已有1层key为 parentD（无子层级）
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key      | 中文名称 | value格式 |
   | parentD          | newChild2 | 新增子键 | ^[a-z]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，parentD 行无「+」展开图标（无子层级） |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，parentD 行出现「+」展开图标，展开后显示新增的子层级 newChild2，中文名称显示「新增子键」，value格式显示 ^[a-z]+$ |

##### 【P1】验证导入功能正常(重复则跳过, 2~5层上一层key存在+key存在+value不存在 -> 跳过不变)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已有如下数据：
   - 第1层key: parentC
   - 第2层key: childC（父级为 parentC，value格式为空）
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key   | 中文名称 | value格式 |
   | parentC          | childC | 修改子键 | ^[0-9]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，展开 parentC 后 childC 的 value格式显示为空（-） |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，展开 parentC 后 childC 的 value格式仍为空（-），未被更新 |

##### 【P1】验证导入功能正常(重复则跳过, 1层key不存在 -> 新增1层key)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中不存在key为 skipNewKey1 的记录
3) 准备 XLSX 导入文件，一层Sheet内容如下：
   | *key        | 中文名称 | value格式 |
   | skipNewKey1 | 全新键   | ^\d+$     |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，列表中不存在 skipNewKey1 |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，新增 skipNewKey1 出现在列表中，中文名称显示「全新键」，value格式显示 ^\d+$ |

##### 【P1】验证导入功能正常(重复则跳过, 1层key已存在 -> 跳过不变)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已通过【新增】创建1层key为 skipExist1，value格式为 ^[a-z]+$，中文名称为「原始键」
3) 准备 XLSX 导入文件，一层Sheet内容如下：
   | *key       | 中文名称 | value格式 |
   | skipExist1 | 修改键   | ^[A-Z]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，skipExist1 的 value格式显示 ^[a-z]+$，中文名称显示「原始键」 |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，skipExist1 的 value格式仍为 ^[a-z]+$，中文名称仍为「原始键」，未被修改 |

##### 【P1】验证导入功能正常(重复则跳过, 1~5层key存在相同 -> 报错)

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备 XLSX 导入文件，一层Sheet中包含两条相同key名的记录：
   | *key   | 中文名称 | value格式 |
   | dupKey | 重复键一 | ^[a-z]+$  |
   | dupKey | 重复键二 | ^[0-9]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击【导入】按钮，确认重复处理规则为「重复则跳过」（默认值），上传包含同层级重复key的XLSX文件，点击【确定】按钮 | 导入失败，系统报错提示「同一个层级下的key名不可重复」，列表数据不变 |

##### 【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key不存在 -> 报错)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中不存在key为 missingParent 的记录
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key       | 中文名称 | value格式 |
   | missingParent    | orphanKey1 | 孤儿键   | ^test$    |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 导入失败或部分失败，系统提示上一层级key名 missingParent 不存在，orphanKey1 未被导入 |

##### 【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key不存在 -> 新增N层key)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已有1层key为 parentB（无子层级）
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key      | 中文名称 | value格式 |
   | parentB          | newChild1 | 新增子键 | ^[a-z]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，parentB 行无「+」展开图标（无子层级） |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，parentB 行出现「+」展开图标，展开后显示新增的子层级 newChild1，中文名称显示「新增子键」，value格式显示 ^[a-z]+$ |

##### 【P1】验证导入功能正常(重复则覆盖更新, 2~5层上一层key存在+key存在+value不存在 -> 更新N层value)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已有如下数据：
   - 第1层key: parentA
   - 第2层key: childA（父级为 parentA，value格式为空）
3) 准备 XLSX 导入文件，二层Sheet内容如下：
   | *上一层级的key名 | *key   | 中文名称   | value格式 |
   | parentA          | childA | 更新子键   | ^[0-9]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，展开 parentA 后 childA 的 value格式显示为空（-） |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，展开 parentA 后 childA 的 value格式更新为 ^[0-9]+$，中文名称更新为「更新子键」 |

##### 【P1】验证导入功能正常(重复则覆盖更新, 1层key不存在 -> 新增1层key)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中不存在key为 brandNewKey1 的记录
3) 准备 XLSX 导入文件，一层Sheet内容如下：
   | *key         | 中文名称 | value格式 |
   | brandNewKey1 | 全新键   | ^\d+$     |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，列表中不存在 brandNewKey1 |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，新增 brandNewKey1 出现在列表中，中文名称显示「全新键」，value格式显示 ^\d+$ |

##### 【P1】验证导入功能正常(重复则覆盖更新, 1层key已存在 -> 更新1层key)

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已通过【新增】创建1层key为 existKey1，value格式为 ^[a-z]+$，中文名称为「原始键」
3) 准备 XLSX 导入文件，一层Sheet内容如下：
   | *key      | 中文名称 | value格式  |
   | existKey1 | 更新键   | ^[A-Z]+$   |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，existKey1 的 value格式显示 ^[a-z]+$，中文名称显示「原始键」 |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，existKey1 的 value格式更新为 ^[A-Z]+$，中文名称更新为「更新键」 |

##### 【P1】验证导入功能正常(重复则覆盖更新, 1~5层key存在相同 -> 报错)

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备 XLSX 导入文件，一层Sheet中包含两条相同key名的记录：
   | *key   | 中文名称 | value格式 |
   | dupKey | 重复键一 | ^[a-z]+$  |
   | dupKey | 重复键二 | ^[0-9]+$  |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击【导入】按钮，将重复处理规则切换为「重复则覆盖更新」，上传包含同层级重复key的XLSX文件，点击【确定】按钮 | 导入失败，系统报错提示「同一个层级下的key名不可重复」，列表数据不变 |

##### 【P1】验证导入非xlsx格式文件时报错

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备一个非xlsx格式的文件，如 test_import.csv 或 test_import.txt
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击列表右上角【导入】按钮，在导入弹窗的文件上传区域选择 test_import.csv 文件 | 系统拒绝上传或提示文件格式错误，仅支持xlsx格式文件 |

##### 【P1】验证导入文件二层key上一层级key名无法匹配时标红并批注提示

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备 XLSX 导入文件，文件内容如下:
   一层 Sheet:
   | *key      | 中文名称 | value格式 |
   | realKey1  | 真实键   |           |

   二层 Sheet:
   | *上一层级的key名   | *key       | 中文名称 | value格式 |
   | nonExistParentKey  | orphanKey  | 孤儿键   |           |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 点击【导入】按钮，上传二层Sheet中上一层级key为 nonExistParentKey 的XLSX文件，点击【确定】按钮，等待校验完成 | 弹窗提示「导入表格中存在错误数据，请检查后重新导入」，并提供【导出错误文件】入口，无法完成导入 |
| 3 | 点击导出错误文件入口，等待文件下载完成，打开下载的错误文件 | 二层Sheet中「\*上一层级的key名」为 nonExistParentKey 的单元格显示红色标注，批注内容为「上一层级无相同key名匹配」 |

##### 【P1】验证导入文件必填项未填写时标红并批注必填项未填写

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备 XLSX 导入文件，文件内容如下:
   一层 Sheet:
   | *key | 中文名称 | value格式 |
   |      | 缺失键名 | ^\d+$    |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 点击【导入】按钮，上传key列为空的XLSX文件，点击【确定】按钮，等待校验完成 | 弹窗提示「导入表格中存在错误数据，请检查后重新导入」，并提供【导出错误文件】入口，无法完成导入 |
| 3 | 点击导出错误文件入口，等待文件下载完成，打开下载的错误文件 | key列为空的单元格显示红色标注，批注内容为「必填项未填写」 |

##### 【P1】验证导入文件key名超255字符时标红并批注长度超限

> 前置条件

```
1) 使用 admin 账号登录系统
2) 准备 XLSX 导入文件，文件内容如下:
   一层 Sheet:
   | *key                 | 中文名称 | value格式 |
   | bbb...（256个字母b）  | 超限测试 |           |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 点击【导入】按钮，上传包含256字符key的XLSX文件，点击【确定】按钮，等待校验完成 | 弹窗提示「导入表格中存在错误数据，请检查后重新导入」，并提供导出错误文件的入口，无法完成导入 |
| 3 | 点击导出错误文件入口，等待文件下载完成 | 下载文件命名为 json_format_error_YYYYMMDD.xlsx（YYYYMMDD为执行当天日期），打开文件后256字符key所在单元格显示红色标注，批注内容为「长度超限」 |

##### 【P1】验证重复处理规则「重复则跳过」对已存在key不覆盖

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已通过【新增】创建key为 skipKey、value格式为 ^[a-z]+$ 的记录
3) 准备 XLSX 导入文件，文件内容如下:
   一层 Sheet:
   | *key    | 中文名称 | value格式  |
   | skipKey | 跳过键   | ^[A-Z]+$   |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，skipKey 记录的value格式显示 ^[a-z]+$ |
| 2 | 点击【导入】按钮，在导入弹窗中确认重复处理规则为「重复则跳过」（默认值），上传包含key skipKey（value格式为 ^[A-Z]+$）的XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，skipKey 记录的value格式仍为 ^[a-z]+$，未被覆盖 |

##### 【P1】验证重复处理规则「重复则覆盖更新」生效

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已通过【新增】创建key为 existKey、value格式为 ^[a-z]+$ 的记录
3) 准备 XLSX 导入文件，文件内容如下:
   一层 Sheet:
   | *key     | 中文名称 | value格式  |
   | existKey | 已有键   | ^[A-Z]+$   |
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，existKey 记录的value格式显示 ^[a-z]+$ |
| 2 | 点击【导入】按钮，在导入弹窗中将重复处理规则切换为「重复则覆盖更新」，上传包含key existKey（value格式为 ^[A-Z]+$）的XLSX文件，点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，existKey 记录的value格式更新为 ^[A-Z]+$ |

##### 【P1】验证导入模板下载功能

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 点击【导入】按钮，在导入弹窗中点击【下载模板】链接，等待文件下载完成 | 浏览器下载文件，文件命名为 json_format_import_template.xlsx，打开文件后包含5个Sheet（分别对应一层、二层、三层、四层、五层）： 1) 一层Sheet包含「*key」、「中文名称」、「value格式」列 2) 二至五层Sheet各自包含「*上一层级的key名」、「\*key」、「中文名称」、「value格式」列 |


##### 【P1】验证value格式有内容时正则测试控件显示及匹配通过失败场景

> 前置条件

```
1) 使用 admin 账号登录系统
2) 进入json格式校验管理页面
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 点击【新增】按钮，在弹窗中key输入框填写 regexTestKey，value格式输入框保持为空，查看弹窗内容 | 弹窗中不显示「测试数据」输入框和「正则匹配测试」按钮 |
| 3 | 在value格式输入框中填写 ^\d{6}$，查看弹窗变化 | 弹窗动态显示「测试数据」输入框和「正则匹配测试」按钮 |
| 4 | 在「测试数据」输入框中填写 123456，点击【正则匹配测试】按钮 | 显示匹配结果为「匹配成功」 |
| 5 | 清空「测试数据」输入框，填写 abcdef，点击【正则匹配测试】按钮 | 显示匹配结果为「匹配失败」 |
| 6 | 清空value格式输入框内容，查看弹窗变化 | 「测试数据」输入框和「正则匹配测试」按钮隐藏 |


##### 【P1】验证5层层级展开下钻及展开图标显示逻辑

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理列表中已通过逐层【新增子层级】创建5层嵌套数据：
   - 第1层key: rootKey
   - 第2层key: level2Key（父级为 rootKey）
   - 第3层key: level3Key（父级为 level2Key）
   - 第4层key: level4Key（父级为 level3Key）
   - 第5层key: level5Key（父级为 level4Key）
3) 已通过【新增】创建key为 leafKey 的记录（无子层级）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | rootKey 行显示「+」展开图标，leafKey 行不显示「+」图标，列表展示条数按最外层级统计 |
| 2 | 点击 rootKey 行的「+」图标 | 仅展开当前子层级：显示第二层级子节点 level2Key，level2Key 行显示「+」图标（表明还有下级），不会自动展开 level2Key 以下的更深层级 |
| 3 | 点击 level2Key 行的「+」图标 | 仅展开当前子层级：显示第三层级子节点 level3Key，level3Key 行显示「+」图标 |
| 4 | 点击 level3Key 行的「+」图标 | 仅展开当前子层级：显示第四层级子节点 level4Key，level4Key 行显示「+」图标 |
| 5 | 点击 level4Key 行的「+」图标 | level4Key 展开，显示第五层级子节点 level5Key，level5Key 行无「+」图标（已是最末层级，第5层不支持新增子层级） |


##### 【P1】验证数据源类型筛选功能

> 前置条件

```
1) 使用 admin 账号登录系统
2) json格式校验管理列表中已存在由用户 admin@dtstack.com 创建的key记录，以及由用户 testUser01@dtstack.com 创建的key记录
3) 使用 testUser01 账号登录并在json格式校验管理页面创建对应key数据
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 在数据源类型筛选器中选择 SparkThrift，等待筛选结果返回 | 列表仅显示数据源类型为 SparkThrift的记录 |
| 3 | 清空筛选条件 | 列表恢复显示所有记录 |
| 4 | 依次切换Hive、Doris | 筛选功能正常 |

##### 【P1】验证key名模糊搜索功能（含子层级key命中）

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理列表中已通过【新增】创建key为 orderInfo 的第一层级记录
3) 已通过【新增子层级】为 orderInfo 创建子层级key为 orderStatus 的第二层级记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，列表显示所有第一层级数据 |
| 2 | 在搜索框中输入 orderInfo，等待搜索结果返回 | 列表仅显示key包含 orderInfo 的第一层级记录，key名称中不含 orderInfo 的记录均不显示 |
| 3 | 清空搜索框，重新输入 orderStatus（子层级key名），等待搜索结果返回 | 列表展示命中子层级的父级记录 orderInfo，点击「+」后可见 orderStatus 子层级记录 |
| 4 | 清空搜索框，等待列表恢复 | 列表恢复显示所有第一层级数据 |


##### 【P1】验证批量删除多条key（含子层级）

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理列表中已通过【新增】创建key为 batchKey1 的记录，并通过【新增子层级】为其创建子层级key为 batchKey1Child
3) 已通过【新增】创建key为 batchKey2 的记录（无子层级）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 在列表中勾选 batchKey1 和 batchKey2 两行的行选择框 | 两行均显示勾选状态，列表上方出现批量操作栏 |
| 3 | 点击【批量删除】按钮 | 弹出确认弹窗，提示文本为「请确认是否批量删除key信息，若存在子层级key信息会联动删除」 |
| 4 | 点击确认弹窗中的【确认】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，batchKey1、batchKey2 均从列表消失，batchKey1 的子层级 batchKey1Child 也不再存在 |


##### 【P1】验证第5层级不显示新增子层级按钮

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理中已通过逐层【新增子层级】创建5层嵌套层级数据：
   - 第1层key: level1Root
   - 第2层key: level2Node（父级为 level1Root）
   - 第3层key: level3Node（父级为 level2Node）
   - 第4层key: level4Node（父级为 level3Node）
   - 第5层key: level5Key（父级为 level4Node）
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面打开，列表显示已有key数据 |
| 2 | 逐层点击「+」展开，依次展开第1层 level1Root 到第4层 level4Node，找到第5层key为 level5Key 的记录，查看其操作列 | 第5层 level5Key 记录的操作列中，仅显示【编辑】和【删除】按钮，不显示【新增子层级】按钮 |

##### 【P1】验证新增子层级完整流程

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理列表中已通过【新增】创建key为 parentKey 的第一层级记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，列表显示 parentKey 记录 |
| 2 | 在key为 parentKey 的行，点击操作列的【新增子层级】按钮 | 弹出弹窗，标题为「新增子层级」，包含以下字段： 1) key（必填） 2) 中文名称（非必填） 3) value格式（非必填） 弹窗中不包含数据源类型选项 |
| 3 | 在弹窗中填写表单, 内容如下: - *key: childKey - *中文名称: 子层级键 - value格式: ^[0-9]+$ 点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，parentKey 行显示「+」展开图标，点击「+」后展开子层级，可见key为 childKey 的子层级记录： 1) 中文名称显示「子层级键」 2) value格式显示 ^[0-9]+$ |


##### 【P1】验证编辑key名称、value格式、数据源类型并保存生效

> 前置条件

```
1) 使用 admin 账号登录系统
2) 在json格式校验管理列表中已通过【新增】创建key为 editTarget、数据源类型为「sparkthrift2.x」的记录
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面正常加载，列表显示key editTarget 的记录 |
| 2 | 在key为 editTarget 的行，点击操作列的【编辑】按钮 | 弹出编辑弹窗，key输入框显示当前值「editTarget」，value格式、数据源类型显示当前值 |
| 3 | 在编辑弹窗中修改表单, 内容如下: - *key: editTargetV2 - value格式: ^\d{4}$ - 数据源类型: doris3.x 点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，原key editTarget 记录更新为： 1) key显示 editTargetV2 2) value格式显示 ^\d{4}$ 3) 数据源类型显示「doris3.x」 4) 更新人为 admin（当前登录用户） 5) 更新时间字段不为空，且晚于编辑操作前的时间 |


##### 【P1】验证新增key表单中切换数据源类型后清空表单内容

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | json格式校验管理页面正常打开，列表加载完成 |
| 2 | 点击【新增】按钮，在弹窗中填写表单内容如下： - *key: switchTest - 中文名称: 切换测试 - value格式: ^[a-z]+$ - 数据源类型: sparkthrift2.x（默认值） | 各字段显示已填写的内容，数据源类型显示「sparkthrift2.x」 |
| 3 | 将数据源类型下拉框从「sparkthrift2.x」切换为「hive2.x」 | 数据源类型切换为「hive2.x」，表单中其他字段（key、中文名称、value格式）内容被清空，恢复为初始空状态 |

##### 【P1】验证新增key时key字段输入恰好255字符边界值可成功提交

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行 |
| 2 | 点击【新增】按钮，填写表单, 内容如下: - *key: （字母 a 重复255次） - 数据源类型: sparkthrift2.x（保持默认） 点击【确定】按钮，等待接口响应完成 | 弹窗关闭，列表刷新，包含255字符key的记录成功出现在列表中 |

##### 【P1】验证新增key时key字段输入超255字符不可提交

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行 |
| 2 | 点击【新增】按钮，在key输入框中输入256个字符（字母 a 重复256次），点击【确定】按钮 | 表单校验触发，key输入框显示「长度不能超过255字符」，弹窗不关闭，数据未提交 |

##### 【P1】验证新增key时key字段为空不可提交

> 前置条件

```
1) 使用 admin 账号登录系统
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成 | 页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行 |
| 2 | 点击【新增】按钮，弹窗出现后填写表单, 内容如下: - *key: （留空不填） - 数据源类型: sparkthrift2.x（保持默认） 点击【确定】按钮 | 表单校验触发，key输入框下方显示「请输入key」，弹窗不关闭，数据未提交 |