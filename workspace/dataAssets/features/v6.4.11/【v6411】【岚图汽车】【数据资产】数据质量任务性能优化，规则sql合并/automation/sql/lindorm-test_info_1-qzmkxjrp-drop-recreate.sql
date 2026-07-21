-- v6.4.11 Lindorm SparkThrift 表重建 SQL
-- 目标库: dtstack_smoke; 批次后缀: qzmkxjrp; 分区: 2026-07-19
-- 本文件会删除并重建本批次 36 张主表 + 10 张 _cmp 对比表。
-- 请确认目标表名和库名无误后，在 SparkSQL 环境一次性执行。

-- 1. 删除旧表
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_72;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_71;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_70;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_69;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_68;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_67;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_66;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_65;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_64;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_63;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_62;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_61;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_60;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_59;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_58;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_57;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_56;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_55;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_54;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_53;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_52;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_51;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_50;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_49;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_48;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_47;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_46_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_46;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_45_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_45;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_44_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_44;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_43_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_43;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_42_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_42;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_41_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_41;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_40_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_40;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_39_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_39;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_38_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_38;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_37_cmp;
DROP TABLE IF EXISTS dtstack_smoke.test_info_1_qzmkxjrp_37;

-- 2. 重建表并写入 T-1 数据
-- v6.4.11 岚图汽车数据质量任务性能优化，规则 SQL 合并
-- 目标: SparkThrift2.x §37–§72（36 条）；Doris §01–§36 不在本次回归范围
--
-- 执行前将 dtstack_smoke 替换为环境文件 datasources.sparkthrift.sql.database，
-- 将 qzmkxjrp 替换为 Playwright 使用的同一 8 位小写字母后缀。
-- 分区字段 dt 统一使用上海时区执行日的 T-1（${bizDate}）。
-- 本文件只提供人工建表 SQL；Playwright 通过 V6411_UI_SKIP_BASE_TABLE_CREATE=1
-- 同时跳过底表创建和元数据同步。

-- §37 主表（源用例 37；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_37 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_37
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §37 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_37_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_37_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §38 主表（源用例 38；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_38 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_38
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §38 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_38_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_38_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §39 主表（源用例 39；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_39 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_39
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §39 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_39_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_39_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §40 主表（源用例 40；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_40 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_40
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §40 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_40_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_40_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §41 主表（源用例 41；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_41 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_41
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §41 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_41_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_41_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §42 主表（源用例 42；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_42 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_42
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §42 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_42_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_42_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §43 主表（源用例 43；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_43 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_43
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §43 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_43_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_43_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §44 主表（源用例 44；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_44 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_44
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §44 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_44_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_44_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §45 主表（源用例 45；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_45 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_45
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §45 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_45_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_45_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §46 主表（源用例 46；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_46 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_46
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §46 对比表（同结构、同数据；显式完整 DDL）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_46_cmp (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_46_cmp
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §47 主表（源用例 47；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_47 ( 
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_47
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §48 主表（源用例 48；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_48 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_48
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §49 主表（源用例 49；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_49 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_49
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §50 主表（源用例 50；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_50 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_50
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §51 主表（源用例 51；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_51 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_51
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §52 主表（源用例 52；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_52 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_52
PARTITION (dt)
SELECT 10 AS id, 25 AS age, '10000' AS string_num, '脏数据001' AS name, '明细校验地址001' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -30) AS buy_date, '有效性不通过明细001' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10001' AS string_num, '脏数据002' AS name, '明细校验地址002' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -31) AS buy_date, '有效性不通过明细002' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10002' AS string_num, '脏数据003' AS name, '明细校验地址003' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -32) AS buy_date, '有效性不通过明细003' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10003' AS string_num, '脏数据004' AS name, '明细校验地址004' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -33) AS buy_date, '有效性不通过明细004' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10004' AS string_num, '脏数据005' AS name, '明细校验地址005' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -34) AS buy_date, '有效性不通过明细005' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10005' AS string_num, '脏数据006' AS name, '明细校验地址006' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -35) AS buy_date, '有效性不通过明细006' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10006' AS string_num, '脏数据007' AS name, '明细校验地址007' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -36) AS buy_date, '有效性不通过明细007' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10007' AS string_num, '脏数据008' AS name, '明细校验地址008' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -37) AS buy_date, '有效性不通过明细008' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10008' AS string_num, '脏数据009' AS name, '明细校验地址009' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -38) AS buy_date, '有效性不通过明细009' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10009' AS string_num, '脏数据010' AS name, '明细校验地址010' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -39) AS buy_date, '有效性不通过明细010' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10010' AS string_num, '脏数据011' AS name, '明细校验地址011' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -40) AS buy_date, '有效性不通过明细011' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10011' AS string_num, '脏数据012' AS name, '明细校验地址012' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -41) AS buy_date, '有效性不通过明细012' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10012' AS string_num, '脏数据013' AS name, '明细校验地址013' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -42) AS buy_date, '有效性不通过明细013' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10013' AS string_num, '脏数据014' AS name, '明细校验地址014' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -43) AS buy_date, '有效性不通过明细014' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10014' AS string_num, '脏数据015' AS name, '明细校验地址015' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -44) AS buy_date, '有效性不通过明细015' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10015' AS string_num, '脏数据016' AS name, '明细校验地址016' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -45) AS buy_date, '有效性不通过明细016' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10016' AS string_num, '脏数据017' AS name, '明细校验地址017' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -46) AS buy_date, '有效性不通过明细017' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10017' AS string_num, '脏数据018' AS name, '明细校验地址018' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -47) AS buy_date, '有效性不通过明细018' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10018' AS string_num, '脏数据019' AS name, '明细校验地址019' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -48) AS buy_date, '有效性不通过明细019' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10019' AS string_num, '脏数据020' AS name, '明细校验地址020' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -49) AS buy_date, '有效性不通过明细020' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10020' AS string_num, '脏数据021' AS name, '明细校验地址021' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -50) AS buy_date, '有效性不通过明细021' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10021' AS string_num, '脏数据022' AS name, '明细校验地址022' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -51) AS buy_date, '有效性不通过明细022' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10022' AS string_num, '脏数据023' AS name, '明细校验地址023' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -52) AS buy_date, '有效性不通过明细023' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10023' AS string_num, '脏数据024' AS name, '明细校验地址024' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -53) AS buy_date, '有效性不通过明细024' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10024' AS string_num, '脏数据025' AS name, '明细校验地址025' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -54) AS buy_date, '有效性不通过明细025' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10025' AS string_num, '脏数据026' AS name, '明细校验地址026' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -55) AS buy_date, '有效性不通过明细026' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10026' AS string_num, '脏数据027' AS name, '明细校验地址027' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -56) AS buy_date, '有效性不通过明细027' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10027' AS string_num, '脏数据028' AS name, '明细校验地址028' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -57) AS buy_date, '有效性不通过明细028' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10028' AS string_num, '脏数据029' AS name, '明细校验地址029' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -58) AS buy_date, '有效性不通过明细029' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10029' AS string_num, '脏数据030' AS name, '明细校验地址030' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -59) AS buy_date, '有效性不通过明细030' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10030' AS string_num, '脏数据031' AS name, '明细校验地址031' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -30) AS buy_date, '有效性不通过明细031' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10031' AS string_num, '脏数据032' AS name, '明细校验地址032' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -31) AS buy_date, '有效性不通过明细032' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10032' AS string_num, '脏数据033' AS name, '明细校验地址033' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -32) AS buy_date, '有效性不通过明细033' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10033' AS string_num, '脏数据034' AS name, '明细校验地址034' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -33) AS buy_date, '有效性不通过明细034' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10034' AS string_num, '脏数据035' AS name, '明细校验地址035' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -34) AS buy_date, '有效性不通过明细035' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10035' AS string_num, '脏数据036' AS name, '明细校验地址036' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -35) AS buy_date, '有效性不通过明细036' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10036' AS string_num, '脏数据037' AS name, '明细校验地址037' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -36) AS buy_date, '有效性不通过明细037' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10037' AS string_num, '脏数据038' AS name, '明细校验地址038' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -37) AS buy_date, '有效性不通过明细038' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10038' AS string_num, '脏数据039' AS name, '明细校验地址039' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -38) AS buy_date, '有效性不通过明细039' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10039' AS string_num, '脏数据040' AS name, '明细校验地址040' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -39) AS buy_date, '有效性不通过明细040' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10040' AS string_num, '脏数据041' AS name, '明细校验地址041' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -40) AS buy_date, '有效性不通过明细041' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10041' AS string_num, '脏数据042' AS name, '明细校验地址042' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -41) AS buy_date, '有效性不通过明细042' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10042' AS string_num, '脏数据043' AS name, '明细校验地址043' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -42) AS buy_date, '有效性不通过明细043' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10043' AS string_num, '脏数据044' AS name, '明细校验地址044' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -43) AS buy_date, '有效性不通过明细044' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10044' AS string_num, '脏数据045' AS name, '明细校验地址045' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -44) AS buy_date, '有效性不通过明细045' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10045' AS string_num, '脏数据046' AS name, '明细校验地址046' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -45) AS buy_date, '有效性不通过明细046' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10046' AS string_num, '脏数据047' AS name, '明细校验地址047' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -46) AS buy_date, '有效性不通过明细047' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10047' AS string_num, '脏数据048' AS name, '明细校验地址048' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -47) AS buy_date, '有效性不通过明细048' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10048' AS string_num, '脏数据049' AS name, '明细校验地址049' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -48) AS buy_date, '有效性不通过明细049' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10049' AS string_num, '脏数据050' AS name, '明细校验地址050' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -49) AS buy_date, '有效性不通过明细050' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10050' AS string_num, '脏数据051' AS name, '明细校验地址051' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -50) AS buy_date, '有效性不通过明细051' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10051' AS string_num, '脏数据052' AS name, '明细校验地址052' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -51) AS buy_date, '有效性不通过明细052' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10052' AS string_num, '脏数据053' AS name, '明细校验地址053' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -52) AS buy_date, '有效性不通过明细053' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10053' AS string_num, '脏数据054' AS name, '明细校验地址054' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -53) AS buy_date, '有效性不通过明细054' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10054' AS string_num, '脏数据055' AS name, '明细校验地址055' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -54) AS buy_date, '有效性不通过明细055' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10055' AS string_num, '脏数据056' AS name, '明细校验地址056' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -55) AS buy_date, '有效性不通过明细056' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10056' AS string_num, '脏数据057' AS name, '明细校验地址057' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -56) AS buy_date, '有效性不通过明细057' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10057' AS string_num, '脏数据058' AS name, '明细校验地址058' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -57) AS buy_date, '有效性不通过明细058' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10058' AS string_num, '脏数据059' AS name, '明细校验地址059' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -58) AS buy_date, '有效性不通过明细059' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10059' AS string_num, '脏数据060' AS name, '明细校验地址060' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -59) AS buy_date, '有效性不通过明细060' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10060' AS string_num, '脏数据061' AS name, '明细校验地址061' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -30) AS buy_date, '有效性不通过明细061' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10061' AS string_num, '脏数据062' AS name, '明细校验地址062' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -31) AS buy_date, '有效性不通过明细062' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10062' AS string_num, '脏数据063' AS name, '明细校验地址063' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -32) AS buy_date, '有效性不通过明细063' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10063' AS string_num, '脏数据064' AS name, '明细校验地址064' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -33) AS buy_date, '有效性不通过明细064' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10064' AS string_num, '脏数据065' AS name, '明细校验地址065' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -34) AS buy_date, '有效性不通过明细065' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10065' AS string_num, '脏数据066' AS name, '明细校验地址066' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -35) AS buy_date, '有效性不通过明细066' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10066' AS string_num, '脏数据067' AS name, '明细校验地址067' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -36) AS buy_date, '有效性不通过明细067' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10067' AS string_num, '脏数据068' AS name, '明细校验地址068' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -37) AS buy_date, '有效性不通过明细068' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10068' AS string_num, '脏数据069' AS name, '明细校验地址069' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -38) AS buy_date, '有效性不通过明细069' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10069' AS string_num, '脏数据070' AS name, '明细校验地址070' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -39) AS buy_date, '有效性不通过明细070' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10070' AS string_num, '脏数据071' AS name, '明细校验地址071' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -40) AS buy_date, '有效性不通过明细071' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10071' AS string_num, '脏数据072' AS name, '明细校验地址072' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -41) AS buy_date, '有效性不通过明细072' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10072' AS string_num, '脏数据073' AS name, '明细校验地址073' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -42) AS buy_date, '有效性不通过明细073' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10073' AS string_num, '脏数据074' AS name, '明细校验地址074' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -43) AS buy_date, '有效性不通过明细074' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10074' AS string_num, '脏数据075' AS name, '明细校验地址075' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -44) AS buy_date, '有效性不通过明细075' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10075' AS string_num, '脏数据076' AS name, '明细校验地址076' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -45) AS buy_date, '有效性不通过明细076' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10076' AS string_num, '脏数据077' AS name, '明细校验地址077' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -46) AS buy_date, '有效性不通过明细077' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10077' AS string_num, '脏数据078' AS name, '明细校验地址078' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -47) AS buy_date, '有效性不通过明细078' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10078' AS string_num, '脏数据079' AS name, '明细校验地址079' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -48) AS buy_date, '有效性不通过明细079' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10079' AS string_num, '脏数据080' AS name, '明细校验地址080' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -49) AS buy_date, '有效性不通过明细080' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10080' AS string_num, '脏数据081' AS name, '明细校验地址081' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -50) AS buy_date, '有效性不通过明细081' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10081' AS string_num, '脏数据082' AS name, '明细校验地址082' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -51) AS buy_date, '有效性不通过明细082' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10082' AS string_num, '脏数据083' AS name, '明细校验地址083' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -52) AS buy_date, '有效性不通过明细083' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10083' AS string_num, '脏数据084' AS name, '明细校验地址084' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -53) AS buy_date, '有效性不通过明细084' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10084' AS string_num, '脏数据085' AS name, '明细校验地址085' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -54) AS buy_date, '有效性不通过明细085' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10085' AS string_num, '脏数据086' AS name, '明细校验地址086' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -55) AS buy_date, '有效性不通过明细086' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10086' AS string_num, '脏数据087' AS name, '明细校验地址087' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -56) AS buy_date, '有效性不通过明细087' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10087' AS string_num, '脏数据088' AS name, '明细校验地址088' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -57) AS buy_date, '有效性不通过明细088' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10088' AS string_num, '脏数据089' AS name, '明细校验地址089' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -58) AS buy_date, '有效性不通过明细089' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10089' AS string_num, '脏数据090' AS name, '明细校验地址090' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -59) AS buy_date, '有效性不通过明细090' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10090' AS string_num, '脏数据091' AS name, '明细校验地址091' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -30) AS buy_date, '有效性不通过明细091' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10091' AS string_num, '脏数据092' AS name, '明细校验地址092' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -31) AS buy_date, '有效性不通过明细092' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10092' AS string_num, '脏数据093' AS name, '明细校验地址093' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -32) AS buy_date, '有效性不通过明细093' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10093' AS string_num, '脏数据094' AS name, '明细校验地址094' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -33) AS buy_date, '有效性不通过明细094' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10094' AS string_num, '脏数据095' AS name, '明细校验地址095' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -34) AS buy_date, '有效性不通过明细095' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10095' AS string_num, '脏数据096' AS name, '明细校验地址096' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -35) AS buy_date, '有效性不通过明细096' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10096' AS string_num, '脏数据097' AS name, '明细校验地址097' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -36) AS buy_date, '有效性不通过明细097' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10097' AS string_num, '脏数据098' AS name, '明细校验地址098' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -37) AS buy_date, '有效性不通过明细098' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10098' AS string_num, '脏数据099' AS name, '明细校验地址099' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -38) AS buy_date, '有效性不通过明细099' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10099' AS string_num, '脏数据100' AS name, '明细校验地址100' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -39) AS buy_date, '有效性不通过明细100' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10100' AS string_num, '脏数据101' AS name, '明细校验地址101' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -40) AS buy_date, '有效性不通过明细101' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10101' AS string_num, '脏数据102' AS name, '明细校验地址102' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -41) AS buy_date, '有效性不通过明细102' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10102' AS string_num, '脏数据103' AS name, '明细校验地址103' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -42) AS buy_date, '有效性不通过明细103' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10103' AS string_num, '脏数据104' AS name, '明细校验地址104' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -43) AS buy_date, '有效性不通过明细104' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10104' AS string_num, '脏数据105' AS name, '明细校验地址105' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -44) AS buy_date, '有效性不通过明细105' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10105' AS string_num, '脏数据106' AS name, '明细校验地址106' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -45) AS buy_date, '有效性不通过明细106' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10106' AS string_num, '脏数据107' AS name, '明细校验地址107' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -46) AS buy_date, '有效性不通过明细107' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10107' AS string_num, '脏数据108' AS name, '明细校验地址108' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -47) AS buy_date, '有效性不通过明细108' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10108' AS string_num, '脏数据109' AS name, '明细校验地址109' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -48) AS buy_date, '有效性不通过明细109' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10109' AS string_num, '脏数据110' AS name, '明细校验地址110' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -49) AS buy_date, '有效性不通过明细110' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10110' AS string_num, '脏数据111' AS name, '明细校验地址111' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -50) AS buy_date, '有效性不通过明细111' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10111' AS string_num, '脏数据112' AS name, '明细校验地址112' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -51) AS buy_date, '有效性不通过明细112' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10112' AS string_num, '脏数据113' AS name, '明细校验地址113' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -52) AS buy_date, '有效性不通过明细113' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10113' AS string_num, '脏数据114' AS name, '明细校验地址114' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -53) AS buy_date, '有效性不通过明细114' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10114' AS string_num, '脏数据115' AS name, '明细校验地址115' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -54) AS buy_date, '有效性不通过明细115' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10115' AS string_num, '脏数据116' AS name, '明细校验地址116' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -55) AS buy_date, '有效性不通过明细116' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10116' AS string_num, '脏数据117' AS name, '明细校验地址117' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -56) AS buy_date, '有效性不通过明细117' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10117' AS string_num, '脏数据118' AS name, '明细校验地址118' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -57) AS buy_date, '有效性不通过明细118' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10118' AS string_num, '脏数据119' AS name, '明细校验地址119' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -58) AS buy_date, '有效性不通过明细119' AS date_detail, '2026-07-19' AS dt
UNION ALL
SELECT 10 AS id, 25 AS age, '10119' AS string_num, '脏数据120' AS name, '明细校验地址120' AS address, '9' AS money, DATE_ADD(CURRENT_DATE(), -59) AS buy_date, '有效性不通过明细120' AS date_detail, '2026-07-19' AS dt;

-- §53 主表（源用例 53；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_53 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_53
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §54 主表（源用例 54；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_54 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_54
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §55 主表（源用例 55；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_55 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_55
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §56 主表（源用例 56；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_56 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_56
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §57 主表（源用例 57；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_57 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_57
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §58 主表（源用例 58；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_58 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_58
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §59 主表（源用例 59；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_59 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_59
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §60 主表（源用例 60；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_60 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_60
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §61 主表（源用例 61；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_61 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_61
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §62 主表（源用例 62；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_62 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_62
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §63 主表（源用例 63；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_63 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_63
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §64 主表（源用例 64；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_64 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_64
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §65 主表（源用例 65；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_65 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_65
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §66 主表（源用例 66；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_66 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_66
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §67 主表（源用例 67；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_67 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_67
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §68 主表（源用例 68；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_68 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_68
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §69 主表（源用例 69；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_69 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_69
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §70 主表（源用例 70；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_70 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_70
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §71 主表（源用例 71；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_71 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_71
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;

-- §72 主表（源用例 72；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE dtstack_smoke.test_info_1_qzmkxjrp_72 (
id INT COMMENT '用户ID',
age INT COMMENT '年龄',
string_num STRING COMMENT 'string类型的编号',
name STRING COMMENT '姓名',
address STRING COMMENT '地址',
money STRING COMMENT '金额',
buy_date DATE COMMENT '购买日期',
date_detail STRING COMMENT '日期详情'
)
COMMENT '测试信息表'
PARTITIONED BY (
dt STRING COMMENT '分区日期，格式：yyyy-MM-dd'
)
STORED AS ORC;

INSERT INTO TABLE dtstack_smoke.test_info_1_qzmkxjrp_72
PARTITION (dt)
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
DATE_ADD(CURRENT_DATE(), -30 + user_idx) AS buy_date,
CASE user_idx
WHEN 0 THEN '订单已完成' WHEN 1 THEN '待发货' WHEN 2 THEN '已取消'
WHEN 3 THEN '配送中' WHEN 4 THEN '已完成' ELSE '退款中'
END AS date_detail,
'2026-07-19' AS dt
FROM (
SELECT 0 AS user_idx UNION ALL SELECT 1 UNION ALL SELECT 2
UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) users;


