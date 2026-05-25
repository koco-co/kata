## 数据质量
### 完整性校验

#### 字段级-空值数

##### 【P0】检测字段空值数为零时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_null_count_pass;
CREATE TABLE test_db.dq_completeness_null_count_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 'x' AS note
UNION ALL SELECT 2 AS id, 'b' AS name, 'y' AS note;
INSERT INTO test_db.dq_completeness_null_count_pass VALUES (3, 'c', 'z');
```
> 操作步骤
1. 进入「数据质量」-「规则库配置」，在规则类型筛选选择「完整性校验」，确认「空值数」规则存在于字段级内置规则清单。
2. 进入「数据质量」-「规则集管理」，新建规则集「dq_completeness_null_count_pass」，选择数据源「SparkThrift2.x」、数据库「test_db」、表「dq_completeness_null_count_pass」。
3. 在「监控规则」添加完整性校验字段级规则：「字段」选择「name」，「统计函数」选择「空值数」，「校验方法」选择「固定值」，「运算符」选择「=」，「期望值」填写「0」，保存并保存规则集。
4. 进入「数据质量」-「规则任务管理」，新建监控规则任务「dq_null_count_pass_task」，选库表「test_db.dq_completeness_null_count_pass」，在规则选择步骤导入步骤2创建的规则集后保存。
5. 在任务列表对该任务执行【立即执行】，进入「校验结果查询」，打开最新实例详情。
6. 点击该实例对应的「质量报告」并进入报告详情。
> 预期结果
1. 规则集/任务创建成功，任务实例状态变更为已完成。
2. 实例详情中该条「完整性校验-字段级-空值数」显示「校验通过」，通过明细数为 3，失败明细为空。
3. 质量报告中的规则项展示「校验通过」，且报告内容包含本次任务名称与执行时间。

##### 【P0】检测字段空值数高于阈值时校验不通过并有明细展示
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_null_count_fail;
CREATE TABLE test_db.dq_completeness_null_count_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, CAST(NULL AS STRING) AS name, 'x' AS note
UNION ALL SELECT 2 AS id, 'a' AS name, 'y' AS note;
INSERT INTO test_db.dq_completeness_null_count_fail VALUES (3, 'b', 'z');
```
> 操作步骤
1. 进入「数据质量」-「规则库配置」，确认「完整性校验」下「空值数」在字段级规则列表可用。
2. 在「规则集管理」创建规则集「dq_completeness_null_count_fail」，选表「test_db.dq_completeness_null_count_fail」。
3. 在规则集中新增完整性校验字段级规则：字段「name」，统计函数「空值数」，校验方法「固定值」，运算符「=」，期望值「0」，保存。
4. 在「规则任务管理」新建任务「dq_null_count_fail_task」，导入上述规则集并提交保存。
5. 对任务执行【立即执行】，在「校验结果查询」打开该任务最新实例。
6. 进入实例详情并点击该失败规则的【查看详情】。
> 预期结果
1. 实例结果中「完整性校验-字段级-空值数」显示「校验不通过」。
2. 详情页展示失败原因与未通过记录（包含 name 为 NULL 的记录）。
3. 质量报告详情展示同一任务名，规则结果为「校验不通过」。

#### 字段级-空值率

##### 【P0】检测字段空值率为零时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_null_percent_pass;
CREATE TABLE test_db.dq_completeness_null_percent_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
INSERT INTO test_db.dq_completeness_null_percent_pass VALUES (4, 'd');
```
> 操作步骤
1. 进入规则库配置确认完整性校验字段级内置规则含「空值率」。
2. 在规则集管理新建规则集「dq_null_percent_pass」，绑定表「test_db.dq_completeness_null_percent_pass」。
3. 新增完整性校验字段级规则：字段「name」，统计函数「空值率」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 保存规则集后，在规则任务管理新建任务「dq_null_percent_pass_task」，导入该规则集。
5. 立即执行任务并打开最新实例。
6. 在实例详情中打开该规则明细。
> 预期结果
1. 该条「完整性校验-字段级-空值率」结果显示「校验通过」。
2. 明细页失败记录数量为 0，报告中该规则通过。

##### 【P0】检测字段空值率异常时校验不通过并展示失败明细
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_null_percent_fail;
CREATE TABLE test_db.dq_completeness_null_percent_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, CAST(NULL AS STRING) AS name
UNION ALL SELECT 2 AS id, CAST(NULL AS STRING) AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
INSERT INTO test_db.dq_completeness_null_percent_fail VALUES (4, 'd');
```
> 操作步骤
1. 在规则库配置核实「空值率」可选。
2. 规则集管理新建规则集「dq_null_percent_fail」，表为「test_db.dq_completeness_null_percent_fail」。
3. 配置完整性字段级规则：字段「name」，统计函数「空值率」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 任务管理新建「dq_null_percent_fail_task」，导入规则集并保存。
5. 执行任务并在校验结果查询查看最新实例。
> 预期结果
1. 该实例中「完整性校验-字段级-空值率」显示「校验不通过」。
2. 明细页可查看空值率为 50% 的失败记录，包含至少 2 条 NULL 行。
3. 质量报告的该规则条目显示「校验不通过」。

#### 字段级-空串数

##### 【P0】检测字段空串数为零时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_empty_count_pass;
CREATE TABLE test_db.dq_completeness_empty_count_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
INSERT INTO test_db.dq_completeness_empty_count_pass VALUES (4, 'd');
```
> 操作步骤
1. 规则库配置页确认「空串数」在「完整性校验」字段级规则中可见。
2. 新建规则集「dq_empty_count_pass」，关联表「test_db.dq_completeness_empty_count_pass」。
3. 新建完整性字段级规则：字段「name」，统计函数「空串数」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 在规则任务管理新建「dq_empty_count_pass_task」，选择该表并导入规则集。
5. 提交后立即执行任务，打开最新实例详情。
> 预期结果
1. 实例中「完整性校验-字段级-空串数」显示「校验通过」。
2. 明细列表无失败记录。
3. 在报告详情中该规则展示通过状态。

##### 【P0】检测字段空串数高于阈值时校验不通过并可下载/查看明细
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_empty_count_fail;
CREATE TABLE test_db.dq_completeness_empty_count_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, '' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, '' AS name
UNION ALL SELECT 4 AS id, 'd' AS name;
```
> 操作步骤
1. 进入规则库配置，确认完整性字段级包含「空串数」。
2. 新建规则集「dq_empty_count_fail」，选择表「test_db.dq_completeness_empty_count_fail」。
3. 配置字段级规则：字段「name」，统计函数「空串数」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 在规则任务管理创建任务「dq_empty_count_fail_task」，导入该规则集。
5. 执行任务后进入校验结果查询并打开详情，点击规则对应查看详情。
> 预期结果
1. 该规则显示「校验不通过」。
2. 明细页出现 name 为空字符串的失败记录（2 条）。
3. 质量报告显示该条规则为「校验不通过」，且可在报告内容中定位该规则。

#### 字段级-空串率

##### 【P0】检测字段空串率为零时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_empty_percent_pass;
CREATE TABLE test_db.dq_completeness_empty_percent_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name
UNION ALL SELECT 4 AS id, 'd' AS name;
```
> 操作步骤
1. 在规则库配置确认「空串率」为完整性字段级可用规则。
2. 规则集管理创建「dq_empty_percent_pass」并绑定「test_db.dq_completeness_empty_percent_pass」。
3. 新增字段级完整性规则：字段「name」，统计函数「空串率」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 规则任务管理创建任务「dq_empty_percent_pass_task」，导入该规则集。
5. 立即执行后进入「校验结果查询」查看实例，打开详情与报告。
> 预期结果
1. 「完整性校验-字段级-空串率」记录为「校验通过」。
2. 明细页失败条目为空。
3. 质量报告展示该规则通过。

##### 【P0】检测字段空串率异常时校验不通过并回显失败原因
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_empty_percent_fail;
CREATE TABLE test_db.dq_completeness_empty_percent_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, '' AS name
UNION ALL SELECT 2 AS id, '' AS name
UNION ALL SELECT 3 AS id, '' AS name
UNION ALL SELECT 4 AS id, 'd' AS name;
```
> 操作步骤
1. 进入规则库配置校验完整性「空串率」规则存在。
2. 在规则集管理创建「dq_empty_percent_fail」，绑定「test_db.dq_completeness_empty_percent_fail」。
3. 新增字段级规则：字段「name」，统计函数「空串率」，校验方法「固定值」，运算符「=」，期望值「0」。
4. 在规则任务管理创建「dq_empty_percent_fail_task」，导入规则集后提交。
5. 执行任务并打开最新实例的该规则详情。
> 预期结果
1. 实例结果中「完整性校验-字段级-空串率」为「校验不通过」。
2. 明细说明包含空串占比偏离 0 的信息。
3. 质量报告该条规则保持「校验不通过」。

#### 字段级-字段值取值范围

##### 【P0】检测字段值范围约束通过并生成通过明细
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_value_range_pass;
CREATE TABLE test_db.dq_completeness_value_range_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 10 AS amount
UNION ALL SELECT 2 AS id, 15 AS amount
UNION ALL SELECT 3 AS id, 20 AS amount;
INSERT INTO test_db.dq_completeness_value_range_pass VALUES (4, 25);
```
> 操作步骤
1. 在规则库配置确认完整性字段级规则包含「字段取值范围校验」。
2. 规则集管理新建规则集「dq_value_range_pass」，绑定「test_db.dq_completeness_value_range_pass」。
3. 在完整性字段级规则中设置：字段「amount」，统计函数「字段值范围」，新增范围条件「>= 10」「<= 100」。
4. 保存规则集后，任务管理新建任务「dq_value_range_pass_task」，导入规则集并保存。
5. 立即执行该任务，打开校验结果，检查该规则详情。
> 预期结果
1. 任务实例中「完整性校验-字段级-字段取值范围校验」显示「校验通过」。
2. 规则明细中显示范围条件完整且无失败记录。
3. 质量报告该条规则展示「校验通过」。

##### 【P0】检测字段值范围约束不满足时校验不通过并展示失败数据
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_value_range_fail;
CREATE TABLE test_db.dq_completeness_value_range_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 10 AS amount
UNION ALL SELECT 2 AS id, 5 AS amount
UNION ALL SELECT 3 AS id, 120 AS amount
UNION ALL SELECT 4 AS id, 30 AS amount;
```
> 操作步骤
1. 在规则库配置页确认「字段取值范围校验」已在完整性字段级规则中启用。
2. 规则集管理创建「dq_value_range_fail」，表指向「test_db.dq_completeness_value_range_fail」。
3. 新建完整性字段级规则，字段「amount」，统计函数「字段值范围」，配置范围「>= 10」「<= 100」，保存规则。
4. 规则任务管理创建任务「dq_value_range_fail_task」，导入该规则集。
5. 立即执行后在结果查询页打开该实例，进入规则明细。
> 预期结果
1. 「完整性校验-字段级-字段取值范围校验」显示「校验不通过」。
2. 明细页可见 value=5 与 value=120 的失败记录。
3. 质量报告展示该规则为「校验不通过」。

#### 单表-表行数

##### 【P0】检测表行数符合固定值时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_line_count_pass;
CREATE TABLE test_db.dq_completeness_line_count_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
```
> 操作步骤
1. 规则库配置确认完整性规则中包含「表行数」。
2. 规则集管理创建「dq_line_count_pass」，绑定表「test_db.dq_completeness_line_count_pass」。
3. 新建完整性规则：表级，规则范围选择单表，统计函数「表行数」，校验方法「固定值」，运算符「=」，期望值「3」，保存。
4. 规则任务管理创建任务「dq_line_count_pass_task」，通过导入该规则集保存。
5. 立即执行任务并在校验结果查询查看最新实例。
> 预期结果
1. 任务实例中「完整性校验-表级-表行数」显示「校验通过」。
2. 明细页无失败记录。
3. 质量报告单表维度规则条目为「校验通过」。

##### 【P0】检测表行数不符时校验不通过并在报告中展示
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_line_count_fail;
CREATE TABLE test_db.dq_completeness_line_count_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name
UNION ALL SELECT 4 AS id, 'd' AS name;
```
> 操作步骤
1. 规则库配置页确认完整性「表行数」可选。
2. 规则集管理新建「dq_line_count_fail」，关联表「test_db.dq_completeness_line_count_fail」。
3. 新建完整性表级规则：统计函数「表行数」，校验方法「固定值」，运算符「=」，期望值「3」。
4. 规则任务管理创建「dq_line_count_fail_task」，导入该规则集后保存。
5. 执行任务并进入最新实例、规则明细。
> 预期结果
1. 实例中「完整性校验-表级-表行数」显示「校验不通过」。
2. 明细页显示实际表行数为 4，与预期 3 不符。
3. 质量报告中该规则条目显示「校验不通过」。

#### 单表-字段数

##### 【P0】检测字段数符合标准时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_col_count_pass;
CREATE TABLE test_db.dq_completeness_col_count_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 'x' AS tag, CAST(1 AS INT) AS score;
```
> 操作步骤
1. 在规则库配置确认完整性字段级清单中的「字段数」可见。
2. 规则集管理创建「dq_col_count_pass」，表指向「test_db.dq_completeness_col_count_pass」。
3. 新建完整性表级规则：表级统计函数「字段数」，校验方法「固定值」，运算符「=」，期望值「4」，保存。
4. 在规则任务管理新建任务「dq_col_count_pass_task」，导入该规则集并提交。
5. 执行任务后在校验结果查询查看该实例与报告。
> 预期结果
1. 实例中「完整性校验-表级-字段数」为「校验通过」。
2. 明细页无该规则失败记录。
3. 质量报告展示该规则通过。

##### 【P0】检测字段数异常变化时校验不通过并展示偏差
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_completeness_col_count_fail;
CREATE TABLE test_db.dq_completeness_col_count_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 'x' AS tag, CAST(1 AS INT) AS score, CAST(TRUE AS BOOLEAN) AS active;
```
> 操作步骤
1. 规则库配置确认「字段数」规则可配置。
2. 规则集管理新建「dq_col_count_fail」并绑定「test_db.dq_completeness_col_count_fail」。
3. 新增完整性表级规则：统计函数「字段数」，校验方法「固定值」，运算符「=」，期望值「4」。
4. 任务管理新建「dq_col_count_fail_task」，导入并执行该规则集。
5. 打开校验结果最新实例并进入质量报告。
> 预期结果
1. 「完整性校验-表级-字段数」显示「校验不通过」。
2. 报告明细显示实际字段数为 5，与 4 不一致。
3. 报告详情页中的该规则状态为「校验不通过」。

#### 多表-多表行数比对

##### 【P0】检测多表行数一致时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_multi_rows_left_pass;
DROP TABLE IF EXISTS test_db.dq_multi_rows_right_pass;
CREATE TABLE test_db.dq_multi_rows_left_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
CREATE TABLE test_db.dq_multi_rows_right_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name;
```
> 操作步骤
1. 进入规则库配置，确认完整性中存在「多表行数比对」规则入口。
2. 规则集管理新建「dq_multi_rows_pass」，选择主表「test_db.dq_multi_rows_left_pass」。
3. 新增完整性规则，规则类型选择「多表」，规则范围选择「多表行数比对」，并设置比对表为「test_db.dq_multi_rows_right_pass」，校验方法固定值「=」，期望值「0」（表示差异值 0）。
4. 保存后在规则任务管理创建任务「dq_multi_rows_pass_task」，导入该规则集。
5. 立即执行任务，进入校验结果查询打开该任务最新实例。
> 预期结果
1. 实例中「完整性校验-多表-多表行数比对」显示「校验通过」。
2. 明细页显示双表行数一致且差异为 0。
3. 质量报告展示该规则通过。

##### 【P0】检测多表行数不一致时校验不通过并能在明细看到差异
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_multi_rows_left_fail;
DROP TABLE IF EXISTS test_db.dq_multi_rows_right_fail;
CREATE TABLE test_db.dq_multi_rows_left_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name
UNION ALL SELECT 3 AS id, 'c' AS name
UNION ALL SELECT 4 AS id, 'd' AS name;
CREATE TABLE test_db.dq_multi_rows_right_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name
UNION ALL SELECT 2 AS id, 'b' AS name;
```
> 操作步骤
1. 规则库配置确认「多表行数比对」可配置。
2. 规则集管理创建「dq_multi_rows_fail」，主表选「test_db.dq_multi_rows_left_fail」。
3. 新增完整性规则：规则类型「多表」-「多表行数比对」，关联表「test_db.dq_multi_rows_right_fail」，校验方法固定值「=」，期望值「0」。
4. 任务管理导入规则集，创建任务「dq_multi_rows_fail_task」后执行。
5. 在校验结果查询打开实例详情并查看规则明细。
> 预期结果
1. 实例中「完整性校验-多表-多表行数比对」显示「校验不通过」。
2. 明细页显示左表/右表行数及差异值不为 0。
3. 质量报告中该规则展示为「校验不通过」。

#### 多表-多表数据内容比对

##### 【P0】检测多表关键字段数据内容一致时校验通过
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_multi_content_left_pass;
DROP TABLE IF EXISTS test_db.dq_multi_content_right_pass;
CREATE TABLE test_db.dq_multi_content_left_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 10 AS amount
UNION ALL SELECT 2 AS id, 'b' AS name, 20 AS amount
UNION ALL SELECT 3 AS id, 'c' AS name, 30 AS amount;
CREATE TABLE test_db.dq_multi_content_right_pass USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 10 AS amount
UNION ALL SELECT 2 AS id, 'b' AS name, 20 AS amount
UNION ALL SELECT 3 AS id, 'c' AS name, 30 AS amount;
```
> 操作步骤
1. 规则库配置中确认完整性下存在「多表数据内容比对」。
2. 规则集管理新建「dq_multi_content_pass」，主表选「test_db.dq_multi_content_left_pass」。
3. 新增完整性规则：规则类型「多表」，规则范围「多表数据内容比对」，关联字段设置主键「id」，校验字段「name,amount」，比较表选「test_db.dq_multi_content_right_pass」，保存。
4. 任务管理导入规则集并创建「dq_multi_content_pass_task」。
5. 立即执行任务，打开校验结果查询与对应实例详情。
> 预期结果
1. 实例详情中「完整性校验-多表-多表数据内容比对」显示「校验通过」。
2. 失败明细为空，且主键行数一致。
3. 质量报告中该规则展示通过状态。

##### 【P0】检测多表字段内容不一致时校验不通过并展示对账明细
> 前置条件
- 已登录数据资产平台
- 已准备测试数据（含 SQL 代码块）
```sql
DROP TABLE IF EXISTS test_db.dq_multi_content_left_fail;
DROP TABLE IF EXISTS test_db.dq_multi_content_right_fail;
CREATE TABLE test_db.dq_multi_content_left_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 10 AS amount
UNION ALL SELECT 2 AS id, 'b' AS name, 20 AS amount
UNION ALL SELECT 3 AS id, 'c' AS name, 30 AS amount;
CREATE TABLE test_db.dq_multi_content_right_fail USING SPARKTHRIFT2X AS
SELECT 1 AS id, 'a' AS name, 10 AS amount
UNION ALL SELECT 2 AS id, 'b2' AS name, 20 AS amount
UNION ALL SELECT 3 AS id, 'c' AS name, 30 AS amount;
```
> 操作步骤
1. 规则库配置确认完整性「多表数据内容比对」条目可选。
2. 在规则集管理创建「dq_multi_content_fail」，主表为「test_db.dq_multi_content_left_fail」。
3. 配置完整性多表内容比对规则：字段「name,amount」，关联键「id」，目标表「test_db.dq_multi_content_right_fail」，保存。
4. 任务管理导入该规则集，创建并立即执行任务「dq_multi_content_fail_task」。
5. 在校验结果查询查看最新实例详情，并打开「查看详情」入口。
> 预期结果
1. 「完整性校验-多表-多表数据内容比对」显示「校验不通过」。
2. 明细页展示 id=2 的 name 对应值不一致并高亮失败记录。
3. 质量报告该规则条目显示「校验不通过」，并可定位到失败明细。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
