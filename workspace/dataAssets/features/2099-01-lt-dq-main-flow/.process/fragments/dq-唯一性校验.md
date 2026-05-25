## 数据质量
### 唯一性校验
#### 单字段-重复数
##### 【P1】单字段数据无重复值时，重复数规则应返回 0 并通过
1. 业务步骤：在数据质量项目中创建 UNIQUENESS 规则，选择小规则 `REPEAT_COUNT`，指标字段为 `order_id`。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_repeat_count_ok;
   CREATE TABLE dq_uniq_repeat_count_ok (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_repeat_count_ok VALUES
     ('A001','U01'),
     ('A002','U02'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U05');

   -- 可执行 SQL（重复数）
   SELECT SUM(cnt - 1) AS repeat_count
   FROM (
     SELECT order_id, COUNT(*) AS cnt
     FROM dq_uniq_repeat_count_ok
     GROUP BY order_id
   ) t
   WHERE cnt > 1;
   ```
3. 预期：`repeat_count=0`，规则通过。

##### 【P2】单字段存在重复值时，重复数规则应返回重复总数并支持明细展开
1. 业务步骤：保持同样规则并执行，检查明细面板。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_repeat_count_bad;
   CREATE TABLE dq_uniq_repeat_count_bad (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_repeat_count_bad VALUES
     ('A001','U01'),
     ('A002','U02'),
     ('A001','U03'),
     ('A003','U04'),
     ('A002','U05');

   -- 可执行 SQL（重复数）
   SELECT SUM(cnt - 1) AS repeat_count
   FROM (
     SELECT order_id, COUNT(*) AS cnt
     FROM dq_uniq_repeat_count_bad
     GROUP BY order_id
   ) t
   WHERE cnt > 1;

   -- 可执行明细 SQL
   SELECT order_id, COUNT(*) AS hit_cnt
   FROM dq_uniq_repeat_count_bad
   GROUP BY order_id
   HAVING hit_cnt > 1
   ORDER BY hit_cnt DESC;
   ```
3. 预期：重复总数为 `2`，明细返回 `A001`,`A002` 两条。

#### 单字段-重复率
##### 【P1】单字段重复率在阈值内时，重复率规则应通过
1. 业务步骤：配置 `REPEAT_PERCENT`，字段为 `order_id`，阈值设 `20`（表示 20%）。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_repeat_percent_ok;
   CREATE TABLE dq_uniq_repeat_percent_ok (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_repeat_percent_ok VALUES
     ('A001','U01'),
     ('A002','U02'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U05'),
     ('A006','U06');

   -- 可执行 SQL（重复率）
   WITH c AS (
     SELECT COUNT(*) AS total_cnt,
            SUM(cnt - 1) AS repeat_rows
     FROM (
       SELECT COUNT(*) AS cnt
       FROM dq_uniq_repeat_percent_ok
       GROUP BY order_id
     ) x
   )
   SELECT
     CASE WHEN total_cnt = 0 THEN 0.0 ELSE repeat_rows * 1.0 / total_cnt * 100 END AS repeat_percent,
     total_cnt,
     repeat_rows
   FROM c;
   ```
3. 预期：重复率为 `0.00%`，小于阈值，规则通过。

##### 【P2】单字段重复率超过阈值时，规则应失败并展示重复明细
1. 业务步骤：同样配置 `REPEAT_PERCENT`，阈值保留 `10`，字段 `order_id`。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_repeat_percent_bad;
   CREATE TABLE dq_uniq_repeat_percent_bad (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_repeat_percent_bad VALUES
     ('A001','U01'),
     ('A001','U02'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U05'),
     ('A001','U06');

   -- 可执行 SQL（重复率）
   WITH c AS (
     SELECT COUNT(*) AS total_cnt,
            SUM(cnt - 1) AS repeat_rows
     FROM (
       SELECT COUNT(*) AS cnt
       FROM dq_uniq_repeat_percent_bad
       GROUP BY order_id
     ) x
   )
   SELECT
     CASE WHEN total_cnt = 0 THEN 0.0 ELSE repeat_rows * 1.0 / total_cnt * 100 END AS repeat_percent,
     total_cnt,
     repeat_rows
   FROM c;

   -- 可执行明细 SQL
   SELECT order_id, COUNT(*) AS hit_cnt
   FROM dq_uniq_repeat_percent_bad
   GROUP BY order_id
   HAVING COUNT(*) > 1
   ORDER BY hit_cnt DESC;
   ```
3. 预期：重复率为 `50.00%`（6 行中重复 3 行），高于阈值，规则失败。

#### 单字段-唯一值数
##### 【P1】单字段唯一值数满足预期时，唯一值数规则应通过
1. 业务步骤：配置 `UNIQUE_COUNT`，字段为 `user_id`，期望值设 `5`。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_unique_count_ok;
   CREATE TABLE dq_uniq_unique_count_ok (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_unique_count_ok VALUES
     ('A001','U01'),
     ('A002','U02'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U05');

   -- 可执行 SQL（唯一值数）
   SELECT COUNT(DISTINCT user_id) AS unique_count
   FROM dq_uniq_unique_count_ok;
   ```
3. 预期：`unique_count=5`，规则通过。

##### 【P2】单字段唯一值数不足时，唯一值数规则应失败并列出重复值明细
1. 业务步骤：保持 `UNIQUE_COUNT=5`，字段 `user_id` 执行并打开明细。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_unique_count_bad;
   CREATE TABLE dq_uniq_unique_count_bad (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_unique_count_bad VALUES
     ('A001','U01'),
     ('A002','U01'),
     ('A003','U02'),
     ('A004','U03'),
     ('A005','U03');

   -- 可执行 SQL（唯一值数）
   SELECT COUNT(DISTINCT user_id) AS unique_count,
          COUNT(*) AS total_count
   FROM dq_uniq_unique_count_bad;

   -- 可执行明细 SQL
   SELECT user_id, COUNT(*) AS hit_cnt, COLLECT_LIST(order_id) AS sample_orders
   FROM dq_uniq_unique_count_bad
   GROUP BY user_id
   HAVING COUNT(*) > 1
   ORDER BY hit_cnt DESC;
   ```
3. 预期：`unique_count=3` 小于 5，规则失败并展示重复值 `U01`,`U03` 明细。

#### 单字段-唯一值占比
##### 【P1】单字段唯一值占比达到阈值时，唯一值占比规则应通过
1. 业务步骤：配置 `UNIQUE_PERCENT`，字段为 `user_id`，阈值设 `80`（表示 80%）。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_unique_percent_ok;
   CREATE TABLE dq_uniq_unique_percent_ok (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_unique_percent_ok VALUES
     ('A001','U01'),
     ('A002','U02'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U05'),
     ('A006','U05');

   -- 可执行 SQL（唯一值占比）
   WITH c AS (
     SELECT COUNT(*) AS total_cnt,
            COUNT(DISTINCT user_id) AS unique_cnt
     FROM dq_uniq_unique_percent_ok
   )
   SELECT
     CASE WHEN total_cnt = 0 THEN 0.0 ELSE unique_cnt * 1.0 / total_cnt * 100 END AS unique_percent,
     unique_cnt,
     total_cnt
   FROM c;
   ```
3. 预期：`unique_percent=83.33%`，大于 80，规则通过。

##### 【P2】单字段唯一值占比低于阈值时，唯一值占比规则应失败并给出重复明细
1. 业务步骤：同样配置 `UNIQUE_PERCENT=90`，字段 `user_id`。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_uniq_unique_percent_bad;
   CREATE TABLE dq_uniq_unique_percent_bad (
     order_id STRING,
     user_id STRING
   ) USING parquet;

   INSERT INTO dq_uniq_unique_percent_bad VALUES
     ('A001','U01'),
     ('A002','U01'),
     ('A003','U03'),
     ('A004','U04'),
     ('A005','U04'),
     ('A006','U04');

   -- 可执行 SQL（唯一值占比）
   WITH c AS (
     SELECT COUNT(*) AS total_cnt,
            COUNT(DISTINCT user_id) AS unique_cnt
     FROM dq_uniq_unique_percent_bad
   )
   SELECT
     CASE WHEN total_cnt = 0 THEN 0.0 ELSE unique_cnt * 1.0 / total_cnt * 100 END AS unique_percent,
     unique_cnt,
     total_cnt
   FROM c;

   -- 可执行明细 SQL
   SELECT user_id, COUNT(*) AS hit_cnt
   FROM dq_uniq_unique_percent_bad
   GROUP BY user_id
   HAVING COUNT(*) > 1
   ORDER BY hit_cnt DESC;
   ```
3. 预期：`unique_percent=50.00%`，低于 90，规则失败，明细中应展示 `U01`,`U04`。

#### 多表-唯一性判断（UNIQUE_MULTI_TABLE）
##### 【P1】多表字段值配置为唯一时，不同表间字段值无交集应通过
1. 业务步骤：在 UNIQUENESS 下配置 `MULTI_TABLE_COLUMN_SINGLE`，校验类型为 `SingleVerifyType.SINGLE`（唯一），字段 `biz_id`，选表 `order_main` 与 `order_ext`。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_multi_main_ok;
   DROP TABLE IF EXISTS dq_multi_ext_ok;

   CREATE TABLE dq_multi_main_ok (biz_id STRING, user_id STRING) USING parquet;
   CREATE TABLE dq_multi_ext_ok (biz_id STRING, user_id STRING) USING parquet;

   INSERT INTO dq_multi_main_ok VALUES
     ('B001','U01'),
     ('B002','U02');

   INSERT INTO dq_multi_ext_ok VALUES
     ('B003','U03'),
     ('B004','U04');

   -- 可执行 SQL（多表重复值检出）
   WITH unioned AS (
     SELECT biz_id, src FROM (
       SELECT biz_id, 'order_main' AS src FROM dq_multi_main_ok
       UNION ALL
       SELECT biz_id, 'order_ext' AS src FROM dq_multi_ext_ok
     ) u
   )
   SELECT biz_id, COUNT(*) AS hit_cnt
   FROM unioned
   GROUP BY biz_id
   HAVING COUNT(*) > 1;
   ```
3. 预期：返回空集，规则通过。

##### 【P2】多表字段值配置为唯一时，跨表重复值存在应失败并可定位明细
1. 业务步骤：保持校验类型为 `SingleVerifyType.SINGLE`，字段 `biz_id` 执行并查看明细。
2. SQL 前置（SparkThrift2.x）：
   ```sql
   DROP TABLE IF EXISTS dq_multi_main_bad;
   DROP TABLE IF EXISTS dq_multi_ext_bad;

   CREATE TABLE dq_multi_main_bad (biz_id STRING, user_id STRING) USING parquet;
   CREATE TABLE dq_multi_ext_bad (biz_id STRING, user_id STRING) USING parquet;

   INSERT INTO dq_multi_main_bad VALUES
     ('B001','U01'),
     ('B002','U02');

   INSERT INTO dq_multi_ext_bad VALUES
     ('B002','U03'),
     ('B003','U04');

   -- 可执行 SQL（多表重复值明细）
   WITH unioned AS (
     SELECT biz_id, src, user_id FROM (
       SELECT biz_id, 'order_main' AS src, user_id FROM dq_multi_main_bad
       UNION ALL
       SELECT biz_id, 'order_ext' AS src, user_id FROM dq_multi_ext_bad
     ) u
   )
   SELECT biz_id, COUNT(*) AS hit_cnt, COLLECT_LIST(src) AS source_tables
   FROM unioned
   GROUP BY biz_id
   HAVING COUNT(*) > 1;
   ```
3. 预期：返回 `biz_id='B002'`，`hit_cnt=2`，规则失败，明细可区分来源表。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
