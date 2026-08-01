-- v6.4.11 岚图汽车数据质量任务性能优化，规则 SQL 合并
-- 目标: Doris3.x §01–§36（36 条）；SparkThrift §37–§72 由 lindorm-test_info_1.sql 提供
-- Doris 数据源由环境文件 datasources.doris.name 决定
--
-- 执行前将 ${SchemaA} 替换为环境文件 datasources.doris.database，
-- 将 ${RunSuffix} 替换为 Playwright 使用的同一 8 位小写字母后缀。
-- 分区字段 dt 使用与 Spark 批次一致的 T-1 日期 2026-07-19。
-- 本文件只提供人工建表 SQL；Playwright 正式回归使用
-- playwright.skip_precondition_setup=true 同时跳过 Doris 底表创建和元数据同步。

-- §01 主表（源用例 1；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_01 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_01 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_01
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §01 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_01_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_01_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_01_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §02 主表（源用例 2；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_02 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_02 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_02
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §02 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_02_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_02_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_02_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §03 主表（源用例 3；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_03 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_03 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_03
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §03 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_03_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_03_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_03_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §04 主表（源用例 4；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_04 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_04 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_04
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §04 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_04_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_04_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_04_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §05 主表（源用例 5；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_05 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_05 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_05
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §05 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_05_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_05_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_05_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §06 主表（源用例 6；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_06 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_06 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_06
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §06 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_06_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_06_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_06_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §07 主表（源用例 7；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_07 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_07 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_07
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §07 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_07_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_07_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_07_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §08 主表（源用例 8；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_08 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_08 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_08
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §08 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_08_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_08_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_08_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §09 主表（源用例 9；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_09 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_09 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_09
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §09 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_09_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_09_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_09_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §10 主表（源用例 10；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_10 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_10 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_10
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §10 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_10_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_10_cmp ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_10_cmp
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §11 主表（源用例 11；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_11 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_11 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_11
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §12 主表（源用例 12；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_12 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_12 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_12
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §13 主表（源用例 13；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_13 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_13 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_13
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §14 主表（源用例 14；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_14 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_14 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_14
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §15 主表（源用例 15；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_15 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_15 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_15
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §16 主表（源用例 16；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_16 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_16 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_16
SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
       25 AS age,
       CAST(10000 + number AS STRING) AS string_num,
       CONCAT('脏数据', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS name,
       CONCAT('明细校验地址', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS address,
       '9' AS money,
       DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AS buy_date,
       CONCAT('有效性不通过明细', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS date_detail,
       '2026-07-19' AS dt
FROM numbers("number" = "10000");

-- §17 主表（源用例 17；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_17 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_17 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_17
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §18 主表（源用例 18；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_18 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_18 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_18
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §19 主表（源用例 19；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_19 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_19 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_19
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §20 主表（源用例 20；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_20 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_20 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_20
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §21 主表（源用例 21；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_21 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_21 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_21
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §22 主表（源用例 22；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_22 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_22 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_22
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §23 主表（源用例 23；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_23 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_23 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_23
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §24 主表（源用例 24；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_24 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_24 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_24
SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
       NULL AS age,
       '' AS string_num,
       '' AS name,
       '' AS address,
       NULL AS money,
       NULL AS buy_date,
       '' AS date_detail,
       '2026-07-19' AS dt
FROM numbers("number" = "10000");

-- §25 主表（源用例 25；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_25 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_25 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_25
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §26 主表（源用例 26；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_26 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_26 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_26
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §27 主表（源用例 27；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_27 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_27 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_27
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §28 主表（源用例 28；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_28 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_28 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_28
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §29 主表（源用例 29；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_29 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_29 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_29
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §30 主表（源用例 30；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_30 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_30 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_30
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §31 主表（源用例 31；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_31 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_31 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_31
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §32 主表（源用例 32；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_32 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_32 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_32
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §33 主表（源用例 33；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_33 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_33 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_33
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §34 主表（源用例 34；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_34 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_34 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_34
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §35 主表（源用例 35；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_35 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_35 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_35
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

-- §36 主表（源用例 36；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE ${SchemaA}.test_info_1_${RunSuffix}_36 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情',
dt DATE COMMENT '分区日期，格式：yyyy-MM-dd'
)
COMMENT '测试信息表'
PARTITION BY RANGE(dt) ()
DISTRIBUTED BY HASH(id) BUCKETS 10
PROPERTIES (
"replication_num" = "1",
"compression" = "LZ4"
);
ALTER TABLE ${SchemaA}.test_info_1_${RunSuffix}_36 ADD PARTITION p20260719 VALUES [('2026-07-19'), ('2026-07-20'));
INSERT INTO ${SchemaA}.test_info_1_${RunSuffix}_36
SELECT
1 + user_idx AS id,
CASE user_idx
WHEN 0 THEN 25 WHEN 1 THEN 30 WHEN 2 THEN 28
WHEN 3 THEN 35 WHEN 4 THEN 22 ELSE 29
END AS age,
CASE user_idx
WHEN 0 THEN '001' WHEN 1 THEN '002' WHEN 2 THEN '003'
WHEN 3 THEN '004' WHEN 4 THEN '005' ELSE '006'
END AS string_num,
CASE user_idx
WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五'
WHEN 3 THEN '赵六' WHEN 4 THEN '小明' ELSE '小红'
END AS name,
CASE user_idx
WHEN 0 THEN '北京市朝阳区' WHEN 1 THEN '上海市浦东新区' WHEN 2 THEN '广州市天河区'
WHEN 3 THEN '深圳市南山区' WHEN 4 THEN '杭州市西湖区' ELSE '成都市武侯区'
END AS address,
CASE user_idx
WHEN 0 THEN '5000.00' WHEN 1 THEN '6800.50' WHEN 2 THEN '4200.00'
WHEN 3 THEN '9500.00' WHEN 4 THEN '3100.00' ELSE '5600.00'
END AS money,
DATE_ADD(CURRENT_DATE(), INTERVAL -30 + user_idx DAY) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
DATE('2026-07-19') AS dt
FROM (
SELECT 0 AS user_idx UNION ALL
SELECT 1 UNION ALL
SELECT 2 UNION ALL
SELECT 3 UNION ALL
SELECT 4 UNION ALL
SELECT 5
) users;

