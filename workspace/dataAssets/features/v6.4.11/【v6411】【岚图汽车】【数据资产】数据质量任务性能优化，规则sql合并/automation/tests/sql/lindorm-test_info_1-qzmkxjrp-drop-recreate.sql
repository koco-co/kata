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
-- 本文件只提供人工建表 SQL；Playwright 正式回归使用
-- playwright.skip_precondition_setup=true 同时跳过底表创建和元数据同步。

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
SELECT CAST(1 + (sequence % 99) AS INT) AS id,
       25 AS age,
       CAST(10000 + sequence AS STRING) AS string_num,
       CONCAT('脏数据', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS name,
       CONCAT('明细校验地址', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS address,
       '9' AS money,
       DATE_ADD(CURRENT_DATE(), -30 - CAST(sequence % 30 AS INT)) AS buy_date,
       CONCAT('有效性不通过明细', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS date_detail,
       '2026-07-19' AS dt
FROM range(10000) AS dirty(sequence);

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
SELECT CAST(1 + (sequence % 99) AS INT) AS id,
       NULL AS age,
       '' AS string_num,
       '' AS name,
       '' AS address,
       NULL AS money,
       NULL AS buy_date,
       '' AS date_detail,
       '2026-07-19' AS dt
FROM range(10000) AS dirty(sequence);

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


