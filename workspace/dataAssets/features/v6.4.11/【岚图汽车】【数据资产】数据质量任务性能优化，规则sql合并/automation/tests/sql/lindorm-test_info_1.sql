-- v6.4.11 岚图汽车数据质量任务性能优化，规则 SQL 合并
-- 目标: SparkThrift2.x §37–§72（36 条）；Doris §01–§36 不在本次回归范围
--
-- 执行前将 {{DATABASE}} 替换为环境文件 datasources.sparkthrift.sql.database，
-- 将 {{SUFFIX}} 替换为 Playwright 使用的同一 8 位小写字母后缀。
-- 分区字段 dt 统一使用上海时区执行日的 T-1（${bizDate}）。
-- 本文件只提供人工建表 SQL；Playwright 正式回归使用
-- playwright.skip_precondition_setup=true 同时跳过底表创建和元数据同步。

-- §37 主表（源用例 37；无独立 DDL 时按 donor 映射复用结构）
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_37 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_37
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_37_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_37_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_38 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_38
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_38_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_38_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_39 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_39
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_39_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_39_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_40 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_40
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_40_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_40_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_41 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_41
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_41_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_41_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_42 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_42
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_42_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_42_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_43 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_43
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_43_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_43_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_44 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_44
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_44_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_44_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_45 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_45
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_45_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_45_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_46 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_46
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_46_cmp (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_46_cmp
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_47 ( 
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_47
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_48 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_48
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_49 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_49
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_50 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_50
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_51 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_51
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_52 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_52
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_53 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_53
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_54 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_54
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_55 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_55
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_56 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_56
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_57 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_57
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_58 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_58
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_59 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_59
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_60 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_60
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_61 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_61
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_62 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_62
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_63 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_63
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_64 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_64
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_65 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_65
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_66 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_66
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_67 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_67
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_68 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_68
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_69 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_69
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_70 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_70
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_71 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_71
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
CREATE TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_72 (
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

INSERT INTO TABLE {{DATABASE}}.test_info_1_{{SUFFIX}}_72
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

