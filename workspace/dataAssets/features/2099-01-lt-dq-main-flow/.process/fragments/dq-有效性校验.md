## 数据质量
### 有效性校验
#### 枚举值数量校验
##### 【P0】通过枚举值数量校验规则校验枚举值出现数
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_count_pass;
CREATE TABLE ltqc_norm_enum_count_pass (
  id INT,
  status STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_count_pass VALUES
(1, 'ACTIVE'),
(2, 'PAUSE'),
(3, 'CLOSED');
```
> 操作步骤
1. 在规则库新建规则，类型选"有效性-规范性"，小规则选"枚举值数量"。
2. 配置允许的枚举值数量为 3，阈值方向为“允许不超过”。
3. 在规则集中创建任务，绑定数据源表 `ltqc_norm_enum_count_pass`。
4. 运行任务并进入校验结果页。
> 预期结果
1. 任务完成且状态为"通过"。
2. 指标显示枚举值数量=3，未触发告警。
3. 结果明细中仅出现 3 个不同枚举值。

##### 【P1】通过枚举值数量校验规则拦截超限枚举值
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_count_fail;
CREATE TABLE ltqc_norm_enum_count_fail (
  id INT,
  status STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_count_fail VALUES
(1, 'NEW'),
(2, 'ACTIVE'),
(3, 'PAUSE'),
(4, 'CLOSED');
```
> 操作步骤
1. 在规则库新建规则，类型选"有效性-规范性"，小规则选"枚举值数量"。
2. 配置允许的枚举值数量为 3。
3. 在规则集中创建任务并绑定表 `ltqc_norm_enum_count_fail`。
4. 运行任务并查看校验结果。
> 预期结果
1. 任务完成且状态为"未通过"。
2. 指标显示枚举值数量=4，超出阈值。
3. 任务明细可定位到 `status` 列值集为 `NEW,ACTIVE,PAUSE,CLOSED`。

#### 去重值数量校验
##### 【P0】通过去重值数量校验规则识别合规唯一值数量
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_distinct_count_pass;
CREATE TABLE ltqc_norm_distinct_count_pass (
  id INT,
  user_type STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_distinct_count_pass VALUES
(1, 'A'),
(2, 'B'),
(3, 'C'),
(4, 'A');
```
> 操作步骤
1. 在规则库创建小规则"去重值数量"。
2. 配置目标列 `user_type` 的去重值下限/上限为 `2~3`。
3. 将表 `ltqc_norm_distinct_count_pass` 加入任务并运行。
> 预期结果
1. 任务结果为"通过"。
2. 去重值数量=3，落在配置区间内。
3. 规则结果明细可展示 3 个唯一值。

##### 【P1】通过去重值数量校验规则拦截重复值异常
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_distinct_count_fail;
CREATE TABLE ltqc_norm_distinct_count_fail (
  id INT,
  user_type STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_distinct_count_fail VALUES
(1, 'A'),
(2, 'B'),
(3, 'C'),
(4, 'D'),
(5, 'E');
```
> 操作步骤
1. 在规则库新建并保存小规则"去重值数量"。
2. 配置目标列 `user_type` 的去重值上限为 4。
3. 在规则集中创建任务并绑定表 `ltqc_norm_distinct_count_fail`。
4. 运行任务。
> 预期结果
1. 任务状态为"未通过"。
2. 去重值数量=5，超出上限。
3. 校验结果应给出列 `user_type` 触发异常。

#### 枚举值校验
##### 【P0】通过枚举值校验规则过滤允许取值
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_value_pass;
CREATE TABLE ltqc_norm_enum_value_pass (
  id INT,
  source STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_value_pass VALUES
(1, 'ONLINE'),
(2, 'OFFLINE'),
(3, 'ONLINE');
```
> 操作步骤
1. 进入规则库创建"枚举值"规则。
2. 配置列 `source` 的白名单为 `ONLINE,OFFLINE`。
3. 将表 `ltqc_norm_enum_value_pass` 放入规则集任务并执行。
4. 查看规则结果。
> 预期结果
1. 任务执行完成且通过。
2. 结果显示不合格记录数为 0。
3. 采集样本只包含允许枚举值。

##### 【P1】通过枚举值校验规则识别非法枚举
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_value_fail;
CREATE TABLE ltqc_norm_enum_value_fail (
  id INT,
  source STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_value_fail VALUES
(1, 'ONLINE'),
(2, 'BATCH'),
(3, 'OFFLINE');
```
> 操作步骤
1. 在规则库选择"枚举值"规则并保存。
2. 配置白名单同上，但不包含 `BATCH`。
3. 在规则集中新增任务绑定该表并运行。
> 预期结果
1. 任务结果为"未通过"。
2. 明细定位到 `id=2` 的 `source='BATCH'` 触发异常。
3. 不合格记录数至少为 1。

#### 身份证号格式校验
##### 【P0】通过身份证号格式校验规则识别合法身份证
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_personal_id_pass;
CREATE TABLE ltqc_norm_personal_id_pass (
  id INT,
  personal_id STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_personal_id_pass VALUES
(1, '110105199003070012');
```
> 操作步骤
1. 在规则库创建"格式校验-身份证号"规则。
2. 选择列 `personal_id`。
3. 在规则集中组装任务并执行。
> 预期结果
1. 任务完成且通过。
2. 合法身份证号匹配成功，异常数为 0。
3. 结果页未返回格式失败明细。

##### 【P1】通过身份证号格式校验规则识别非法身份证
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_personal_id_fail;
CREATE TABLE ltqc_norm_personal_id_fail (
  id INT,
  personal_id STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_personal_id_fail VALUES
(1, '11010519900307001');
```
> 操作步骤
1. 在规则库新建同类型规则。
2. 绑定列 `personal_id`，提交任务到规则集。
3. 运行任务后查看明细。
> 预期结果
1. 任务状态为"未通过"。
2. 结果异常记录数为 1。
3. 明细指向 `id=1`，标记长度或校验位格式不合法。

#### 手机号格式校验
##### 【P0】通过手机号格式校验规则验证国内11位手机号
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_phone_pass;
CREATE TABLE ltqc_norm_phone_pass (
  id INT,
  phone STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_phone_pass VALUES
(1, '13800138000'),
(2, '15912345678');
```
> 操作步骤
1. 在规则库新建"格式校验-手机号"。
2. 配置目标列 `phone`。
3. 在规则集中建立任务，绑定数据源后启动。
> 预期结果
1. 任务完成且通过。
2. 异常手机号数量为 0。
3. 命中总条数与输入条数一致。

##### 【P1】通过手机号格式校验规则拦截非法号码
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_phone_fail;
CREATE TABLE ltqc_norm_phone_fail (
  id INT,
  phone STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_phone_fail VALUES
(1, '13800138000'),
(2, '12345678');
```
> 操作步骤
1. 复用该规则并设置列 `phone`。
2. 在规则集中创建任务并绑定 `ltqc_norm_phone_fail`。
3. 执行任务。
> 预期结果
1. 任务失败（校验不通过）。
2. 异常记录数为 1。
3. 明细定位到 `id=2`。

#### 邮箱格式校验
##### 【P0】通过邮箱格式校验规则识别标准邮箱地址
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_email_pass;
CREATE TABLE ltqc_norm_email_pass (
  id INT,
  email STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_email_pass VALUES
(1, 'qa_team@example.com'),
(2, 'ops@example.org');
```
> 操作步骤
1. 在规则库创建"格式校验-邮箱"规则。
2. 配置列 `email`。
3. 组规则集任务并执行。
> 预期结果
1. 任务执行通过。
2. 不合格记录为 0。
3. 结果明细显示全部记录为有效。

##### 【P1】通过邮箱格式校验规则识别非标准邮箱
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_email_fail;
CREATE TABLE ltqc_norm_email_fail (
  id INT,
  email STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_email_fail VALUES
(1, 'qa_team@example.com'),
(2, 'invalid-email');
```
> 操作步骤
1. 在规则库保存"邮箱"校验规则。
2. 设置列 `email`。
3. 规则集中创建任务并运行。
> 预期结果
1. 任务失败。
2. 不合格记录数为 1。
3. 明细标出 `id=2`、`invalid-email`。

#### 取值范围校验
##### 【P0】通过取值范围校验规则校验业务值落入区间
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_value_range_pass;
CREATE TABLE ltqc_norm_value_range_pass (
  id INT,
  age INT
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_value_range_pass VALUES
(1, 20),
(2, 30),
(3, 40);
```
> 操作步骤
1. 在规则库新增"取值范围"规则。
2. 配置列 `age` 的最小值=18，最大值=65。
3. 在规则集中创建任务，绑定表后运行。
> 预期结果
1. 任务结果为通过。
2. 异常样本数为 0。
3. 范围边界值 18~65 内校验通过。

##### 【P1】通过取值范围校验规则识别超界数值
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_value_range_fail;
CREATE TABLE ltqc_norm_value_range_fail (
  id INT,
  age INT
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_value_range_fail VALUES
(1, 20),
(2, 17),
(3, 30);
```
> 操作步骤
1. 复用"取值范围"规则并保证范围 18~65 不变。
2. 规则集任务绑定 `ltqc_norm_value_range_fail`。
3. 启动任务并查看报表。
> 预期结果
1. 任务执行未通过。
2. 异常记录数为 1。
3. 明细定位 `id=2` 对应值 17。

#### 字符串长度校验
##### 【P0】通过字符串长度校验规则校验长度边界
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_string_len_pass;
CREATE TABLE ltqc_norm_string_len_pass (
  id INT,
  code STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_string_len_pass VALUES
(1, 'ABCD'),
(2, 'ABCDE'),
(3, 'ABC');
```
> 操作步骤
1. 在规则库创建"字符串长度"规则。
2. 配置列 `code` 长度最小值 2，最大值 5。
3. 规则集创建任务并绑定表后执行。
> 预期结果
1. 任务通过。
2. 所有记录长度均在 2~5 之间。
3. 任务结果中不应有长度异常。

##### 【P1】通过字符串长度校验规则识别超长文本
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_string_len_fail;
CREATE TABLE ltqc_norm_string_len_fail (
  id INT,
  code STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_string_len_fail VALUES
(1, 'AB'),
(2, 'ABCDEFGHI');
```
> 操作步骤
1. 规则库新建并保存最小2最大5的"字符串长度"规则。
2. 在规则集中创建任务，绑定该表。
3. 运行任务查看结果。
> 预期结果
1. 任务为未通过。
2. 异常记录数为 1。
3. 明细定位到 `id=2`，长度 9 超过上限。

#### 数据精度校验
##### 【P0】通过数据精度校验规则识别合规小数位
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_precision_pass;
CREATE TABLE ltqc_norm_precision_pass (
  id INT,
  amount DECIMAL(10,2)
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_precision_pass VALUES
(1, 10.12),
(2, 8.34),
(3, 0.01);
```
> 操作步骤
1. 在规则库新建"数据精度"规则。
2. 配置列 `amount` 精度上限为 2 位小数。
3. 将该表加入规则集中并执行任务。
> 预期结果
1. 任务通过。
2. 结果异常数量为 0。
3. 精度校验通过列出全部样本。

##### 【P1】通过数据精度校验规则识别过深小数位
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_precision_fail;
CREATE TABLE ltqc_norm_precision_fail (
  id INT,
  amount DECIMAL(10,3)
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_precision_fail VALUES
(1, 10.123),
(2, 8.340);
```
> 操作步骤
1. 复用同一精度规则（小数位<=2）。
2. 在规则集中创建任务并绑定 `ltqc_norm_precision_fail`。
3. 运行校验任务。
> 预期结果
1. 任务未通过。
2. 异常记录数为 1 或以上。
3. 明细定位到 `id=1` 的 `amount=10.123`。

#### 规范性空值数校验
##### 【P0】通过规范性空值数校验规则控制空值比例
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_null_standard_pass;
CREATE TABLE ltqc_norm_null_standard_pass (
  id INT,
  city STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_null_standard_pass VALUES
(1, 'beijing'),
(2, NULL),
(3, 'shanghai'),
(4, 'guangzhou');
```
> 操作步骤
1. 在规则库新建"规范性空值数"规则，选择列 `city`。
2. 配置空值数阈值为 ≤1（或比例阈值等同）并保存。
3. 在规则集中加入表 `ltqc_norm_null_standard_pass`，执行任务。
> 预期结果
1. 任务通过。
2. 空值记录数符合阈值。
3. 报表记录 `city` 列空值数为 1。

##### 【P1】通过规范性空值数校验规则拦截超标空值
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_null_standard_fail;
CREATE TABLE ltqc_norm_null_standard_fail (
  id INT,
  city STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_null_standard_fail VALUES
(1, NULL),
(2, 'beijing'),
(3, NULL),
(4, NULL),
(5, 'shanghai');
```
> 操作步骤
1. 维持空值阈值 ≤1（或等价配置）。
2. 在规则集中新建/更新任务并绑定该表。
3. 运行并查看异常统计。
> 预期结果
1. 任务状态为未通过。
2. 空值数量为 3，不符合阈值。
3. 明细可定位到对应 `NULL` 记录数。

#### 规范性重复数校验
##### 【P0】通过规范性重复数校验规则识别低重复率场景
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_repeat_standard_pass;
CREATE TABLE ltqc_norm_repeat_standard_pass (
  id INT,
  order_no STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_repeat_standard_pass VALUES
(1, 'OD2025001'),
(2, 'OD2025002'),
(3, 'OD2025003');
```
> 操作步骤
1. 在规则库创建"规范性重复数"规则，设置重复数阈值为 ≤1。
2. 规则集添加任务，数据源选 `ltqc_norm_repeat_standard_pass`。
3. 启动任务。
> 预期结果
1. 任务通过。
2. 无重复超标的样本。
3. `repeat_count` 指标为 0。

##### 【P1】通过规范性重复数校验规则识别重复超标
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_repeat_standard_fail;
CREATE TABLE ltqc_norm_repeat_standard_fail (
  id INT,
  order_no STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_repeat_standard_fail VALUES
(1, 'OD2025001'),
(2, 'OD2025001'),
(3, 'OD2025002'),
(4, 'OD2025002');
```
> 操作步骤
1. 使用相同规则参数（重复数阈值≤1）。
2. 规则集中绑定该表并执行。
3. 查看任务明细。
> 预期结果
1. 任务不通过。
2. 显示 `OD2025001`、`OD2025002` 的重复样本超出阈值。
3. 异常记录数大于 0。

#### 日期格式校验
##### 【P0】通过日期格式校验规则识别标准日期
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_date_format_pass;
CREATE TABLE ltqc_norm_date_format_pass (
  id INT,
  event_date STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_date_format_pass VALUES
(1, '2026-05-25'),
(2, '2026-12-31');
```
> 操作步骤
1. 在规则库创建"日期格式"规则。
2. 设置格式为 `yyyy-MM-dd`，列 `event_date`。
3. 在规则集中创建任务并执行。
> 预期结果
1. 任务通过。
2. 日期格式匹配成功。
3. 格式异常记录为 0。

##### 【P1】通过日期格式校验规则识别非法日期分隔符
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_date_format_fail;
CREATE TABLE ltqc_norm_date_format_fail (
  id INT,
  event_date STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_date_format_fail VALUES
(1, '2026-05-25'),
(2, '2026/05/25');
```
> 操作步骤
1. 同一规则参数下执行任务。
2. 规则集选择 `ltqc_norm_date_format_fail`。
3. 执行并打开校验结果。
> 预期结果
1. 任务未通过。
2. 至少 1 条记录格式不匹配。
3. 明细定位 `id=2`。

#### 日期时间格式校验
##### 【P0】通过日期时间格式校验规则识别完整时间戳
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_datetime_format_pass;
CREATE TABLE ltqc_norm_datetime_format_pass (
  id INT,
  event_time STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_datetime_format_pass VALUES
(1, '2026-05-25 12:30:00'),
(2, '2026-05-25 23:59:59');
```
> 操作步骤
1. 在规则库新建"日期时间格式"规则。
2. 配置列 `event_time` 格式为 `yyyy-MM-dd HH:mm:ss`。
3. 将表加入规则集并执行。
> 预期结果
1. 任务通过。
2. 结果显示时间字段全部匹配。
3. 异常数=0。

##### 【P1】通过日期时间格式校验规则识别非法日期时间
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_datetime_format_fail;
CREATE TABLE ltqc_norm_datetime_format_fail (
  id INT,
  event_time STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_datetime_format_fail VALUES
(1, '2026-05-25 12:30:00'),
(2, '2026-13-40 25:61:00');
```
> 操作步骤
1. 使用同一规则参数运行该场景。
2. 规则集执行该表并检查结果。
3. 定位失败记录。
> 预期结果
1. 任务未通过。
2. 异常记录数为 1。
3. 明细定位 `id=2`。

#### 自定义格式校验
##### 【P0】通过自定义格式校验规则识别匹配正则表达式
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_custom_format_pass;
CREATE TABLE ltqc_norm_custom_format_pass (
  id INT,
  sku STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_custom_format_pass VALUES
(1, 'AB1234'),
(2, 'XY5678');
```
> 操作步骤
1. 在规则库创建"自定义格式"规则。
2. 配置列 `sku` 的正则为 `^[A-Z]{2}[0-9]{4}$`。
3. 在规则集中建任务，绑定该表后执行。
> 预期结果
1. 任务通过。
2. 所有记录均匹配自定义正则。
3. 异常样本数为 0。

##### 【P1】通过自定义格式校验规则识别不匹配格式
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_custom_format_fail;
CREATE TABLE ltqc_norm_custom_format_fail (
  id INT,
  sku STRING
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_custom_format_fail VALUES
(1, 'AB1234'),
(2, 'abc1234');
```
> 操作步骤
1. 使用同一正则规则。
2. 规则集任务绑定 `ltqc_norm_custom_format_fail`。
3. 执行并读取异常统计。
> 预期结果
1. 任务未通过。
2. 异常记录数为 1。
3. 明细定位到 `id=2`。

#### 枚举值与范围组合校验
##### 【P0】通过枚举值与范围组合规则识别联合约束场景
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_range_pass;
CREATE TABLE ltqc_norm_enum_range_pass (
  id INT,
  biz_type STRING,
  score INT
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_range_pass VALUES
(1, 'A', 80),
(2, 'B', 60),
(3, 'A', 70);
```
> 操作步骤
1. 在规则库新增"枚举值+范围"复合规则。
2. 配置列 `biz_type` 属于 `A,B`，并对 `score` 要求 0~100。
3. 在规则集中创建任务并执行。
> 预期结果
1. 任务通过。
2. 组合规则下的错误记录为 0。
3. 结果中同时满足枚举集合与数值范围。

##### 【P1】通过枚举值与范围组合规则识别范围越界或枚举越界
> 前置条件
```sql
DROP TABLE IF EXISTS ltqc_norm_enum_range_fail;
CREATE TABLE ltqc_norm_enum_range_fail (
  id INT,
  biz_type STRING,
  score INT
)
USING PARQUET;
INSERT INTO TABLE ltqc_norm_enum_range_fail VALUES
(1, 'A', 80),
(2, 'B', 130),
(3, 'C', 60);
```
> 操作步骤
1. 复用该复合规则。
2. 规则集绑定 `ltqc_norm_enum_range_fail` 并执行。
3. 查看明细的失败原因分类。
> 预期结果
1. 任务状态为未通过。
2. 至少有 2 条异常（`id=2` 越界、`id=3` 枚举值越界）。
3. 异常明细可分别展示对应字段差异。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
