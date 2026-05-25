## 数据质量
### 统计性校验
#### 负值比校验
##### 【P1】验证字段 `amount` 负值比不超过阈值时统计性校验通过
- 业务流步骤：
  1. 在 SparkThrift2.x 建表并写入包含 10% 负值的数据作为基准；
  2. 在规则任务管理新增字段级统计性规则，选择 `amount`、统计函数 `负值比`，设置校验方法为 `<`，期望值 `20`（单位：%）；
  3. 执行任务并在结果页校验该规则为通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_minus_pass;
CREATE TABLE IF NOT EXISTS dq_stat_minus_pass (id INT, amount DECIMAL(10,2))
USING parquet
AS SELECT 1, 10.00 WHERE 1=0;
INSERT INTO dq_stat_minus_pass VALUES (1, 10.00), (2, 5.00), (3, -1.00), (4, 8.00), (5, 0.00), (6, 7.00), (7, -2.00), (8, 6.00), (9, 4.00), (10, 3.00);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) AS minus_cnt FROM dq_stat_minus_pass;
```
- 断言：负值比 = 20%，满足“<20%”的通过边界逻辑，结果应为 `通过`。

##### 【P1】验证字段 `amount` 负值比超过阈值时触发异常告警
- 业务流步骤：
  1. 使用同一规则配置，期望值不变 `<` `20%`；
  2. 替换输入为 30% 负值样本并重跑该任务；
  3. 在结果详情中确认 `负值比校验` 呈现告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_minus_fail;
CREATE TABLE IF NOT EXISTS dq_stat_minus_fail (id INT, amount DECIMAL(10,2))
USING parquet
AS SELECT 1, 10.00 WHERE 1=0;
INSERT INTO dq_stat_minus_fail VALUES (1, -1.00), (2, -2.00), (3, -3.00), (4, 5.00), (5, -4.00), (6, 2.00), (7, 7.00), (8, 8.00), (9, 9.00), (10, 10.00);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) AS minus_cnt FROM dq_stat_minus_fail;
```
- 断言：负值比 = 40%，大于 `20%`，该规则结果应为 `校验未通过`。

#### 零值比校验
##### 【P1】验证字段 `cnt` 零值比低于阈值时统计性校验通过
- 业务流步骤：
  1. 在 `dq_stat_zero_pass` 中生成 10 行含 1 个零值；
  2. 配置 `零值比` 校验方法 `<`，期望值 `20%`；
  3. 执行并校验结果为通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_zero_pass;
CREATE TABLE IF NOT EXISTS dq_stat_zero_pass (id INT, cnt INT)
USING parquet
AS SELECT 1, 1 WHERE 1=0;
INSERT INTO dq_stat_zero_pass VALUES (1,0),(2,1),(3,2),(4,3),(5,4),(6,5),(7,6),(8,7),(9,8),(10,9);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN cnt = 0 THEN 1 ELSE 0 END) AS zero_cnt FROM dq_stat_zero_pass;
```
- 断言：零值比 10%，满足阈值，规则通过。

##### 【P1】验证字段 `cnt` 零值比高于阈值时触发告警
- 业务流步骤：
  1. 同步复用前述规则配置；
  2. 将输入改造为 30% 零值记录；
  3. 重新触发一次同任务并查看告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_zero_fail;
CREATE TABLE IF NOT EXISTS dq_stat_zero_fail (id INT, cnt INT)
USING parquet
AS SELECT 1, 1 WHERE 1=0;
INSERT INTO dq_stat_zero_fail VALUES (1,0),(2,0),(3,0),(4,1),(5,2),(6,3),(7,4),(8,5),(9,6),(10,7);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN cnt = 0 THEN 1 ELSE 0 END) AS zero_cnt FROM dq_stat_zero_fail;
```
- 断言：零值比 30%，超过 `20%`，规则应输出 `校验不通过`。

#### 正值比校验
##### 【P1】验证字段 `sales` 正值比高于阈值时校验通过
- 业务流步骤：
  1. 在样本表中准备 8 个正值、2 个非正值记录；
  2. 配置 `正值比` 校验方法 `>`，期望值 `70%`；
  3. 运行规则并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_plus_pass;
CREATE TABLE IF NOT EXISTS dq_stat_plus_pass (id INT, sales INT)
USING parquet
AS SELECT 1, 1 WHERE 1=0;
INSERT INTO dq_stat_plus_pass VALUES (1,10),(2,20),(3,30),(4,40),(5,50),(6,60),(7,70),(8,80),(9,0),(10,-1);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN sales > 0 THEN 1 ELSE 0 END) AS plus_cnt FROM dq_stat_plus_pass;
```
- 断言：正值比 80%，满足 `>70%`，结果应通过。

##### 【P1】验证字段 `sales` 正值比未达阈值时告警
- 业务流步骤：
  1. 使用同一 `sales` 规则，期望值 `>70%` 不变；
  2. 改写数据为仅 60% 正值；
  3. 重跑并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_plus_fail;
CREATE TABLE IF NOT EXISTS dq_stat_plus_fail (id INT, sales INT)
USING parquet
AS SELECT 1, 1 WHERE 1=0;
INSERT INTO dq_stat_plus_fail VALUES (1,10),(2,20),(3,30),(4,40),(5,50),(6,60),(7,0),(8,-1),(9,0),(10,-2);
SELECT COUNT(*) AS total_cnt, SUM(CASE WHEN sales > 0 THEN 1 ELSE 0 END) AS plus_cnt FROM dq_stat_plus_fail;
```
- 断言：正值比 60%，未达 `>70%`，应输出告警。

#### 字符串最大长度校验
##### 【P1】验证字段 `note` 最大长度校验通过边界值
- 业务流步骤：
  1. 使用长度边界样本（含长度 5 的最大值）；
  2. 配置 `字符串最大长度`，字段 `note`，期望值 `=5`；
  3. 执行规则并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_max_len_pass;
CREATE TABLE IF NOT EXISTS dq_stat_max_len_pass (id INT, note STRING)
USING parquet
AS SELECT 1, 'a' WHERE 1=0;
INSERT INTO dq_stat_max_len_pass VALUES (1,'abcde'),(2,'hello'),(3,'hi'),(4,'x'),(5,''),(6,'abcde');
SELECT COUNT(*) AS total_cnt, MAX(LENGTH(note)) AS max_len FROM dq_stat_max_len_pass;
```
- 断言：最大长度为 `5`，满足 `=5`，通过。

##### 【P1】验证字段 `note` 超过最大长度时告警
- 业务流步骤：
  1. 复用规则配置，保留期望值 `=5`；
  2. 增加一条长度为 6 的数据；
  3. 触发同任务检查异常。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_max_len_fail;
CREATE TABLE IF NOT EXISTS dq_stat_max_len_fail (id INT, note STRING)
USING parquet
AS SELECT 1, 'a' WHERE 1=0;
INSERT INTO dq_stat_max_len_fail VALUES (1,'abcde'),(2,'foobar'),(3,'hello');
SELECT COUNT(*) AS total_cnt, MAX(LENGTH(note)) AS max_len FROM dq_stat_max_len_fail;
```
- 断言：最大长度为 `6`，超过阈值，告警。

#### 字符串最小长度校验
##### 【P1】验证字段 `note` 最小长度校验通过边界值
- 业务流步骤：
  1. 准备样本使最小长度恰为 3；
  2. 配置 `字符串最小长度`，字段 `note`，期望值 `=3`；
  3. 执行并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_min_len_pass;
CREATE TABLE IF NOT EXISTS dq_stat_min_len_pass (id INT, note STRING)
USING parquet
AS SELECT 1, 'a' WHERE 1=0;
INSERT INTO dq_stat_min_len_pass VALUES (1,'abc'),(2,'hello'),(3,'abcd');
SELECT MIN(LENGTH(note)) AS min_len FROM dq_stat_min_len_pass;
```
- 断言：最小长度为 3，满足 `=3`，通过。

##### 【P1】验证字段 `note` 存在低于最小长度时告警
- 业务流步骤：
  1. 复用同规则配置，插入一条空值及长度 1 的记录；
  2. 保持期望值 `=3`；
  3. 重跑并校验失败。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_min_len_fail;
CREATE TABLE IF NOT EXISTS dq_stat_min_len_fail (id INT, note STRING)
USING parquet
AS SELECT 1, 'a' WHERE 1=0;
INSERT INTO dq_stat_min_len_fail VALUES (1,''),(2,'abc');
SELECT MIN(LENGTH(note)) AS min_len FROM dq_stat_min_len_fail;
```
- 断言：最小长度为 0，未满足 `=3`，告警。

#### 最大值校验
##### 【P1】验证字段 `price` 最大值不超阈值时通过
- 业务流步骤：
  1. 建表并插入 100 为边界值；
  2. 配置 `最大值` 校验，期望值 `<= 100`；
  3. 运行规则后查看通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_max_pass;
CREATE TABLE IF NOT EXISTS dq_stat_max_pass (id INT, price DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_max_pass VALUES (1,95.00),(2,100.00),(3,88.80),(4,99.99),(5,100.00);
SELECT MAX(price) AS max_price FROM dq_stat_max_pass;
```
- 断言：最大值 100，满足 `<=100`，通过。

##### 【P1】验证字段 `price` 超过阈值时告警
- 业务流步骤：
  1. 同一 `price` 规则，保持期望值 `<=100`；
  2. 追加一条 `101.00`；
  3. 执行并校验告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_max_fail;
CREATE TABLE IF NOT EXISTS dq_stat_max_fail (id INT, price DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_max_fail VALUES (1,95.00),(2,100.00),(3,101.00),(4,88.80);
SELECT MAX(price) AS max_price FROM dq_stat_max_fail;
```
- 断言：最大值 101，超过阈值，规则应失败。

#### 最小值校验
##### 【P1】验证字段 `price` 最小值符合阈值下限时通过
- 业务流步骤：
  1. 准备最小值为 0 的边界样本；
  2. 配置 `最小值` 校验，期望值 `>=0`；
  3. 运行校验并验证通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_min_pass;
CREATE TABLE IF NOT EXISTS dq_stat_min_pass (id INT, price DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_min_pass VALUES (1,0.00),(2,12.50),(3,5.20),(4,30.00);
SELECT MIN(price) AS min_price FROM dq_stat_min_pass;
```
- 断言：最小值 0，满足 `>=0`，通过。

##### 【P1】验证字段 `price` 低于下限时告警
- 业务流步骤：
  1. 保持 `最小值 >=0` 的规则；
  2. 插入 -0.01；
  3. 再次执行并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_min_fail;
CREATE TABLE IF NOT EXISTS dq_stat_min_fail (id INT, price DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_min_fail VALUES (1,0.00),(2,-0.01),(3,10.00);
SELECT MIN(price) AS min_price FROM dq_stat_min_fail;
```
- 断言：最小值 -0.01，不满足 `>=0`，告警。

#### 平均值校验
##### 【P1】验证字段 `score` 平均值在阈值范围内通过
- 业务流步骤：
  1. 准备平均值边界为 `60.00` 的样本；
  2. 配置 `平均值`，期望值 `BETWEEN 59.99 AND 60.01`（实际执行可映射为 `=` 近似比较）；
  3. 运行并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_avg_pass;
CREATE TABLE IF NOT EXISTS dq_stat_avg_pass (id INT, score DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_avg_pass VALUES (1,60.00),(2,61.00),(3,59.00);
SELECT AVG(score) AS avg_score FROM dq_stat_avg_pass;
```
- 断言：平均值 60，落在期望区间，规则通过。

##### 【P1】验证字段 `score` 平均值偏离阈值时告警
- 业务流步骤：
  1. 保持同一平均值校验配置；
  2. 将样本改为高偏离值（如 90）；
  3. 重跑任务并校验异常。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_avg_fail;
CREATE TABLE IF NOT EXISTS dq_stat_avg_fail (id INT, score DECIMAL(10,2))
USING parquet
AS SELECT 1, 0.00 WHERE 1=0;
INSERT INTO dq_stat_avg_fail VALUES (1,60.00),(2,90.00),(3,90.00);
SELECT AVG(score) AS avg_score FROM dq_stat_avg_fail;
```
- 断言：平均值 80，偏离阈值，规则应不通过。

#### 总和校验
##### 【P1】验证字段 `qty` 总和符合目标值通过
- 业务流步骤：
  1. 准备数量总和边界为 `100` 的样本；
  2. 配置 `总和` 期望值 `=100`；
  3. 执行规则查看通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_sum_pass;
CREATE TABLE IF NOT EXISTS dq_stat_sum_pass (id INT, qty INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_sum_pass VALUES (1,20),(2,30),(3,50);
SELECT SUM(qty) AS sum_qty FROM dq_stat_sum_pass;
```
- 断言：总和 100，满足 `=100`，通过。

##### 【P1】验证字段 `qty` 总和偏离目标值时告警
- 业务流步骤：
  1. 保留同一规则定义；
  2. 调整样本为总和 120；
  3. 复跑规则并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_sum_fail;
CREATE TABLE IF NOT EXISTS dq_stat_sum_fail (id INT, qty INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_sum_fail VALUES (1,40),(2,40),(3,40);
SELECT SUM(qty) AS sum_qty FROM dq_stat_sum_fail;
```
- 断言：总和 120，不等于期望 `100`，该规则不通过。

#### IQR离群点数量校验
##### 【P1】验证字段 `metric` 离群点数量符合阈值时通过
- 业务流步骤：
  1. 构造一个仅有 1 个 IQR 离群点的样本；
  2. 配置 `异常值检测 - IQR离群点数量`，校验方法 `<=1`；
  3. 执行并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_iqr_cnt_pass;
CREATE TABLE IF NOT EXISTS dq_stat_iqr_cnt_pass (id INT, metric INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_iqr_cnt_pass VALUES (1,10),(2,11),(3,9),(4,10),(5,12),(6,11),(7,10),(8,9),(9,10),(10,100);
SELECT COUNT(*) AS total_cnt,
       SUM(CASE WHEN metric < 0 OR metric > 20 THEN 1 ELSE 0 END) AS iqr_outlier_cnt
FROM dq_stat_iqr_cnt_pass;
```
- 断言：离群点数量为 1，满足 `<=1`，通过。

##### 【P1】验证字段 `metric` 离群点数量超阈值时告警
- 业务流步骤：
  1. 保持 `IQR离群点数量` 配置为 `<=1`；
  2. 改为 2 个离群点（如 100 与 -100）；
  3. 重跑并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_iqr_cnt_fail;
CREATE TABLE IF NOT EXISTS dq_stat_iqr_cnt_fail (id INT, metric INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_iqr_cnt_fail VALUES (1,10),(2,11),(3,9),(4,10),(5,12),(6,11),(7,10),(8,9),(9,100),(10,-100);
SELECT COUNT(*) AS total_cnt,
       SUM(CASE WHEN metric < 0 OR metric > 20 THEN 1 ELSE 0 END) AS iqr_outlier_cnt
FROM dq_stat_iqr_cnt_fail;
```
- 断言：离群点数量为 2，超过阈值，规则不通过。

#### IQR离群点占比校验
##### 【P1】验证字段 `metric` 离群点占比满足阈值时通过
- 业务流步骤：
  1. 在 20 行样本中设计 1 个离群点；
  2. 配置 `异常值检测 - IQR离群点占比`，期望值 `<10%`；
  3. 执行任务并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_iqr_pct_pass;
CREATE TABLE IF NOT EXISTS dq_stat_iqr_pct_pass (id INT, metric INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_iqr_pct_pass VALUES
(1,10),(2,11),(3,9),(4,10),(5,12),(6,11),(7,10),(8,9),(9,10),(10,11),
(11,10),(12,9),(13,10),(14,11),(15,12),(16,10),(17,9),(18,10),(19,11),(20,100);
SELECT
  COUNT(*) AS total_cnt,
  SUM(CASE WHEN metric < 5 OR metric > 20 THEN 1 ELSE 0 END) AS iqr_outlier_cnt,
  CAST(SUM(CASE WHEN metric < 5 OR metric > 20 THEN 1 ELSE 0 END) AS DECIMAL(5,2)) / COUNT(*) AS outlier_pct
FROM dq_stat_iqr_pct_pass;
```
- 断言：离群占比 5%，小于 10%，通过。

##### 【P1】验证字段 `metric` 离群点占比超阈值时告警
- 业务流步骤：
  1. 采用同一规则配置 `<10%`；
  2. 将样本改为 3 个离群点（总量 20）；
  3. 触发任务并验证告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_iqr_pct_fail;
CREATE TABLE IF NOT EXISTS dq_stat_iqr_pct_fail (id INT, metric INT)
USING parquet
AS SELECT 1, 0 WHERE 1=0;
INSERT INTO dq_stat_iqr_pct_fail VALUES
(1,10),(2,11),(3,9),(4,10),(5,12),(6,11),(7,10),(8,9),(9,10),(10,11),
(11,10),(12,9),(13,10),(14,11),(15,12),(16,100),(17,-100),(18,150),(19,10),(20,11);
SELECT
  COUNT(*) AS total_cnt,
  SUM(CASE WHEN metric < 5 OR metric > 20 THEN 1 ELSE 0 END) AS iqr_outlier_cnt,
  CAST(SUM(CASE WHEN metric < 5 OR metric > 20 THEN 1 ELSE 0 END) AS DECIMAL(5,2)) / COUNT(*) AS outlier_pct
FROM dq_stat_iqr_pct_fail;
```
- 断言：离群占比 15%，触发 `>10%` 条件，规则告警。

#### Z-score置信区间校验
##### 【P1】验证字段 `metric` Z-score置信区间符合阈值时通过
- 业务流步骤：
  1. 创建近似正态样本，仅一条异常点并不触发高置信异常；
  2. 配置 `异常值检测 - Z-score置信区间`，校验方法 `<=1`；
  3. 执行规则，确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_zscore_pass;
CREATE TABLE IF NOT EXISTS dq_stat_zscore_pass (id INT, metric DOUBLE)
USING parquet
AS SELECT 1, 0.0 WHERE 1=0;
INSERT INTO dq_stat_zscore_pass VALUES
(1,10.0),(2,11.0),(3,10.0),(4,9.5),(5,10.5),(6,10.2),(7,9.8),(8,10.1),(9,10.3),(10,100.0);
SELECT
  COUNT(*) AS total_cnt,
  AVG(metric) AS avg_metric,
  STDDEV(metric) AS sd_metric,
  SUM(CASE WHEN ABS(metric - (SELECT AVG(metric) FROM dq_stat_zscore_pass)) / (SELECT STDDEV(metric) FROM dq_stat_zscore_pass) > 3 THEN 1 ELSE 0 END) AS zscore_outlier_cnt
FROM dq_stat_zscore_pass;
```
- 断言：置信区间异常值计数不超过阈值，规则通过。

##### 【P1】验证字段 `metric` Z-score置信区间超阈值触发告警
- 业务流步骤：
  1. 复用同规则，校验方法 `<=1`；
  2. 增加两条高偏离值形成 2 个 Z-score 异常点；
  3. 重新执行并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_zscore_fail;
CREATE TABLE IF NOT EXISTS dq_stat_zscore_fail (id INT, metric DOUBLE)
USING parquet
AS SELECT 1, 0.0 WHERE 1=0;
INSERT INTO dq_stat_zscore_fail VALUES
(1,10.0),(2,11.0),(3,10.0),(4,9.5),(5,10.5),(6,10.2),(7,9.8),(8,1000.0),(9,-1000.0),(10,10.3);
SELECT
  COUNT(*) AS total_cnt,
  SUM(CASE WHEN ABS(metric - (SELECT AVG(metric) FROM dq_stat_zscore_fail)) / (SELECT STDDEV(metric) FROM dq_stat_zscore_fail) > 3 THEN 1 ELSE 0 END) AS zscore_outlier_cnt
FROM dq_stat_zscore_fail;
```
- 断言：Z-score 异常点计数超过 1，输出 `校验未通过`。

#### 字段值计算对比
##### 【P1】验证字段值计算结果与目标字段一致时通过
- 业务流步骤：
  1. 准备 `a,b,sum_ab` 三列，保证 `sum_ab = a + b` 恒成立；
  2. 配置 `字段值计算对比`，对比方式选“计算结果与字段对比”，表达式 `a + b`，比较规则 `sum_ab`；
  3. 执行并确认通过。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_field_calc_pass;
CREATE TABLE IF NOT EXISTS dq_stat_field_calc_pass (id INT, a INT, b INT, sum_ab INT)
USING parquet
AS SELECT 1, 0, 0, 0 WHERE 1=0;
INSERT INTO dq_stat_field_calc_pass VALUES (1,1,2,3),(2,10,5,15),(3,-3,4,1),(4,8,0,8);
SELECT COUNT(*) AS total_cnt,
       SUM(CASE WHEN a + b != sum_ab THEN 1 ELSE 0 END) AS mismatch_cnt
FROM dq_stat_field_calc_pass;
```
- 断言：`mismatch_cnt = 0`，字段值计算对比通过。

##### 【P1】验证字段值计算结果与目标字段不一致时告警
- 业务流步骤：
  1. 在 `dq_stat_field_calc_fail` 中注入一条错误计算记录；
  2. 使用同一对比规则 `sum_ab = a + b`；
  3. 运行任务并确认告警。 
- 可执行 SQL 前置（SparkThrift2.x）：
```sql
DROP TABLE IF EXISTS dq_stat_field_calc_fail;
CREATE TABLE IF NOT EXISTS dq_stat_field_calc_fail (id INT, a INT, b INT, sum_ab INT)
USING parquet
AS SELECT 1, 0, 0, 0 WHERE 1=0;
INSERT INTO dq_stat_field_calc_fail VALUES (1,1,2,3),(2,10,5,14),(3,-3,4,1),(4,8,0,8);
SELECT COUNT(*) AS total_cnt,
       SUM(CASE WHEN a + b != sum_ab THEN 1 ELSE 0 END) AS mismatch_cnt
FROM dq_stat_field_calc_fail;
```
- 断言：`mismatch_cnt > 0`，触发告警。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
