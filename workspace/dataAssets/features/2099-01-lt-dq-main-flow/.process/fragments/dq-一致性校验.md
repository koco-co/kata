## 数据质量
### 一致性校验
#### 多表行数比对
##### 【P1】配置一致性校验中的多表行数比对，校验源表与目标表记录数一致
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表，字段、数据类型一致。
  - 两表均存在 3 条记录。

```sql
DROP TABLE IF EXISTS ltqc_src_rows_cnt_ok;
CREATE TABLE ltqc_src_rows_cnt_ok (
  id BIGINT,
  order_id STRING,
  amount DECIMAL(10,2)
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_rows_cnt_ok VALUES
  (1, 'O-001', 100.00),
  (2, 'O-002', 200.00),
  (3, 'O-003', 300.00);

DROP TABLE IF EXISTS ltqc_tgt_rows_cnt_ok;
CREATE TABLE ltqc_tgt_rows_cnt_ok (
  id BIGINT,
  order_id STRING,
  amount DECIMAL(10,2)
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_rows_cnt_ok VALUES
  (1, 'O-001', 100.00),
  (2, 'O-002', 200.00),
  (3, 'O-003', 300.00);
```
- 业务流步骤
  1. 进入数据质量项目，进入「一致性校验」模块，新增规则「多表行数比对」。
  2. 配置主表为 `ltqc_src_rows_cnt_ok`，对比表为 `ltqc_tgt_rows_cnt_ok`，主键字段 `id`。
  3. 设置阈值为 `Diverse = 0`、`DiverseRatio = 0`。
  4. 运行规则。
- 预期结果
  - 任务结果为通过，差异行数为 0，命中告警为 0。

##### 【P2】配置一致性校验中的多表行数比对，校验源表与目标表记录数不一致失败
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表。
  - 源表 2 条，目标表 4 条。

```sql
DROP TABLE IF EXISTS ltqc_src_rows_cnt_ng;
CREATE TABLE ltqc_src_rows_cnt_ng (
  id BIGINT,
  order_id STRING,
  amount DECIMAL(10,2)
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_rows_cnt_ng VALUES
  (1, 'O-001', 100.00),
  (2, 'O-002', 200.00);

DROP TABLE IF EXISTS ltqc_tgt_rows_cnt_ng;
CREATE TABLE ltqc_tgt_rows_cnt_ng (
  id BIGINT,
  order_id STRING,
  amount DECIMAL(10,2)
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_rows_cnt_ng VALUES
  (1, 'O-001', 100.00),
  (2, 'O-002', 200.00),
  (3, 'O-003', 300.00),
  (4, 'O-004', 400.00);
```
- 业务流步骤
  1. 新增规则「多表行数比对」。
  2. 配置主表为 `ltqc_src_rows_cnt_ng`，对比表为 `ltqc_tgt_rows_cnt_ng`，主键字段 `id`。
  3. 将阈值保留为 `Diverse = 0`、`DiverseRatio = 0`。
  4. 运行规则。
- 预期结果
  - 任务结果为不通过，提示目标表与源表行数不一致，告警条数大于 0。

#### 多表数据内容对比
##### 【P1】配置多表数据内容对比，校验主键关联字段值一致
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表，按主键和同名字段建立对比。
  - 两表数据内容完全一致。

```sql
DROP TABLE IF EXISTS ltqc_src_content_ok;
CREATE TABLE ltqc_src_content_ok (
  id BIGINT,
  region STRING,
  metric BIGINT
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_content_ok VALUES
  (101, 'beijing', 1200),
  (102, 'shanghai', 1300),
  (103, 'shenzhen', 1400);

DROP TABLE IF EXISTS ltqc_tgt_content_ok;
CREATE TABLE ltqc_tgt_content_ok (
  id BIGINT,
  region STRING,
  metric BIGINT
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_content_ok VALUES
  (101, 'beijing', 1200),
  (102, 'shanghai', 1300),
  (103, 'shenzhen', 1400);
```
- 业务流步骤
  1. 在「一致性校验」中新建规则「多表数据内容对比」。
  2. 配置主表 `ltqc_src_content_ok`、对比表 `ltqc_tgt_content_ok`，主键字段 `id`，比对字段 `region, metric`。
  3. 运行规则。
- 预期结果
  - 任务结果为通过，未检测到字段差异。

##### 【P2】配置多表数据内容对比，校验主键关联字段值不一致失败
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表。
  - 同一主键下存在字段值不一致。

```sql
DROP TABLE IF EXISTS ltqc_src_content_ng;
CREATE TABLE ltqc_src_content_ng (
  id BIGINT,
  region STRING,
  metric BIGINT
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_content_ng VALUES
  (101, 'beijing', 1200),
  (102, 'shanghai', 1300),
  (103, 'shenzhen', 1400);

DROP TABLE IF EXISTS ltqc_tgt_content_ng;
CREATE TABLE ltqc_tgt_content_ng (
  id BIGINT,
  region STRING,
  metric BIGINT
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_content_ng VALUES
  (101, 'beijing', 1200),
  (102, 'shanghai', 9999),
  (103, 'shenzhen', 1400);
```
- 业务流步骤
  1. 在「一致性校验」中新建规则「多表数据内容对比」。
  2. 配置主表 `ltqc_src_content_ng`、对比表 `ltqc_tgt_content_ng`，主键字段 `id`，比对字段 `region, metric`。
  3. 运行规则。
- 预期结果
  - 任务结果为不通过，`id=102` 的 `metric` 命中不一致告警。

#### 多表数据一致性
##### 【P1】配置多表数据一致性并设定字段规则，验证源表与目标表一致
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表。
  - 名称大小写差异仅在非区分大小写策略下应视为一致，金额差异在允许阈值内。

```sql
DROP TABLE IF EXISTS ltqc_src_uniformity_ok;
CREATE TABLE ltqc_src_uniformity_ok (
  id BIGINT,
  user_name STRING,
  score DECIMAL(10,2),
  comment STRING
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_uniformity_ok VALUES
  (1, 'alice', 100.10, NULL),
  (2, 'bob',  200.30, 'ok');

DROP TABLE IF EXISTS ltqc_tgt_uniformity_ok;
CREATE TABLE ltqc_tgt_uniformity_ok (
  id BIGINT,
  user_name STRING,
  score DECIMAL(10,2),
  comment STRING
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_uniformity_ok VALUES
  (1, 'ALICE', 100.09, NULL),
  (2, 'bob',  201.00, 'ok');
```
- 业务流步骤
  1. 在「一致性校验」中新建规则「多表数据一致性」。
  2. 配置主表 `ltqc_src_uniformity_ok`，对比表 `ltqc_tgt_uniformity_ok`，主键字段 `id`。
  3. 在字段规则里设置：
     - `matchCase = false`（名称字段不区分大小写）
     - `matchNull = true`（空值可互配）
     - `decimalRetain = 2`
     - `diverseAbsolute = 1`。
  4. 运行规则。
- 预期结果
  - 任务结果为通过，未产生不一致告警。

##### 【P2】配置多表数据一致性并收紧字段规则，验证源表与目标表出现差异失败
- 前置条件
  - 在 `SparkThrift2.x` 创建源表与目标表。
  - 同一主键下金额差异超过绝对阈值且存在大小写敏感不匹配。

```sql
DROP TABLE IF EXISTS ltqc_src_uniformity_ng;
CREATE TABLE ltqc_src_uniformity_ng (
  id BIGINT,
  user_name STRING,
  score DECIMAL(10,2),
  comment STRING
)
STORED AS ORC;
INSERT INTO TABLE ltqc_src_uniformity_ng VALUES
  (1, 'alice', 100.10, 'A'),
  (2, 'Bob',  300.30, 'OK');

DROP TABLE IF EXISTS ltqc_tgt_uniformity_ng;
CREATE TABLE ltqc_tgt_uniformity_ng (
  id BIGINT,
  user_name STRING,
  score DECIMAL(10,2),
  comment STRING
)
STORED AS ORC;
INSERT INTO TABLE ltqc_tgt_uniformity_ng VALUES
  (1, 'Alice', 101.80, 'A'),
  (2, 'BOB',  300.30, 'OK');
```
- 业务流步骤
  1. 在「一致性校验」中新建规则「多表数据一致性」。
  2. 配置主表 `ltqc_src_uniformity_ng`，对比表 `ltqc_tgt_uniformity_ng`，主键字段 `id`。
  3. 在字段规则里设置：
     - `matchCase = true`（名称字段区分大小写）
     - `matchNull = true`
     - `diverseAbsolute = 1`
     - `diverseRatio = 0`
  4. 运行规则。
- 预期结果
  - 任务结果为不通过，`id=1` 名称大小写不一致且 `score` 差异超过 1，产生不一致告警。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
