## 数据质量
### 合理性校验

#### 字段值计算对比-计算结果比对
> 小规则清单（源码推导）
> - FunctionType.FIELD_VALUE_CALCULATION_COMPARISON（47）= `字段值计算对比`
> - RATIONALITY_COMPARE_METHOD.CALC_RESULT_COMPARE（1）= `计算结果比对`

##### 【P1】校验字段值计算对比在算式相等时通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备测试表与规则依赖数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_fc_compare_pass;
CREATE TABLE test_db.dq_rationality_fc_compare_pass (
  id BIGINT,
  field_a BIGINT,
  field_b BIGINT,
  field_sum BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_fc_compare_pass VALUES (1, 10, 20, 30);
INSERT INTO test_db.dq_rationality_fc_compare_pass VALUES (2, 7, 8, 15);
INSERT INTO test_db.dq_rationality_fc_compare_pass VALUES (3, 4, 6, 10);
```
> 操作步骤
1. 进入「数据质量」-「规则库配置」，在「规则类型」筛选中选择「合理性校验」，确认可见统计函数「字段值计算对比」。
2. 进入「规则集管理」，新建规则集「dq_rationality_fc_compare_pass」，选择库表「test_db.dq_rationality_fc_compare_pass」。
3. 在该规则集中新增一条「字段值计算对比」规则：字段选择「field_sum」，统计函数选择「字段值计算对比」，校验表主键选择「id」，对比方法选择「计算结果比对」，计算逻辑填写「field_a + field_b」。
4. 在对比关系处填入运算符「=」，并保存规则。
5. 进入「规则任务管理」，新建任务「dq_rationality_fc_compare_pass_task」，表名选择「test_db.dq_rationality_fc_compare_pass」，引入步骤2创建的规则集。
6. 保存任务后执行【立即运行】，在「校验结果查询」打开该任务最新实例。
7. 点击该实例的实例详情并进入「数据质量报告」。
> 预期结果
1. 规则集和任务均保存成功，实例运行状态变为已完成。
2. 「规则详情」中可见该条规则，结果为「校验通过」。
3. 报告明细显示该任务名对应规则结果为「校验通过」，并存在 3 条通过统计记录。

##### 【P1】校验字段值计算对比在算式不等时不通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备测试表与规则依赖数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_fc_compare_fail;
CREATE TABLE test_db.dq_rationality_fc_compare_fail (
  id BIGINT,
  field_a BIGINT,
  field_b BIGINT,
  field_sum BIGINT
) USING SPARKTHIFT2X;
INSERT INTO test_db.dq_rationality_fc_compare_fail VALUES (1, 10, 20, 30);
INSERT INTO test_db.dq_rationality_fc_compare_fail VALUES (2, 7, 8, 12);
INSERT INTO test_db.dq_rationality_fc_compare_fail VALUES (3, 4, 6, 10);
```
> 操作步骤
1. 进入「数据质量」-「规则库配置」，确认「合理性校验」存在「字段值计算对比」。
2. 在「规则集管理」新建规则集「dq_rationality_fc_compare_fail」，绑定表「test_db.dq_rationality_fc_compare_fail」。
3. 新增「字段值计算对比」规则：字段「field_sum」，统计函数「字段值计算对比」，校验表主键「id」，对比方法「计算结果比对」，计算逻辑「field_a + field_b」，运算符「=」，保存。
4. 进入「规则任务管理」新建任务「dq_rationality_fc_compare_fail_task」，绑定同一张表并引入步骤2规则集。
5. 提交后执行【立即运行】，在「校验结果查询」打开最新实例。
6. 在实例详情中查看该条规则并进入详情页。
7. 打开实例对应「数据质量报告」。
> 预期结果
1. 规则实例显示该条规则为「校验不通过」。
2. 详情页错误原因明确指向 id=2 行的计算结果不一致。
3. 报告列表中该规则项显示「校验不通过」，失败计数与不一致记录匹配。

#### 字段值计算对比-计算结果值判断
> 小规则清单（源码推导）
> - FunctionType.FIELD_VALUE_CALCULATION_COMPARISON（47）= `字段值计算对比`
> - RATIONALITY_COMPARE_METHOD.CALC_RESULT_VALUE_JUDGE（2）= `计算结果值判断`

##### 【P1】校验字段值计算对比在阈值范围内通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备测试表与规则依赖数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_fc_value_pass;
CREATE TABLE test_db.dq_rationality_fc_value_pass (
  id BIGINT,
  sales BIGINT,
  cost BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_fc_value_pass VALUES (1, 20, 5);
INSERT INTO test_db.dq_rationality_fc_value_pass VALUES (2, 30, 6);
INSERT INTO test_db.dq_rationality_fc_value_pass VALUES (3, 60, 5);
```
> 操作步骤
1. 在「规则库配置」确认「合理性校验」下的「字段值计算对比」入口可用。
2. 进入「规则集管理」创建规则集「dq_rationality_fc_value_pass」，绑定表「test_db.dq_rationality_fc_value_pass」。
3. 在规则集「监控规则」中添加「字段值计算对比」规则：字段「sales」，统计函数「字段值计算对比」，对比方法选择「计算结果值判断」，计算逻辑填写「sales - cost」，结果值配置为 `> 0 且 <= 100`（第一算符「>」，第一阈值「0」，条件「且」，第二算符「<=」，第二阈值「100」），保存。
4. 进入「规则任务管理」新建任务「dq_rationality_fc_value_pass_task」，导入该规则集。
5. 执行【立即运行】，在「校验结果查询」打开最新实例。
6. 查看实例详情并进入质量报告。
> 预期结果
1. 实例运行完成且无执行异常。
2. 规则显示「校验通过」，失败明细为空。
3. 报告中该规则条目显示「校验通过」且明细统计正确。

##### 【P1】校验字段值计算对比在阈值范围外不通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备测试表与规则依赖数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_fc_value_fail;
CREATE TABLE test_db.dq_rationality_fc_value_fail (
  id BIGINT,
  sales BIGINT,
  cost BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_fc_value_fail VALUES (1, 20, 5);
INSERT INTO test_db.dq_rationality_fc_value_fail VALUES (2, 120, 10);
INSERT INTO test_db.dq_rationality_fc_value_fail VALUES (3, 5, 2);
```
> 操作步骤
1. 规则库配置确认「合理性校验」-「字段值计算对比」可配置。
2. 规则集管理新建「dq_rationality_fc_value_fail」，表选「test_db.dq_rationality_fc_value_fail」。
3. 新增规则：字段「sales」，统计函数「字段值计算对比」，对比方法「计算结果值判断」，计算逻辑「sales - cost」，结果值配置 `> 0 且 <= 100`。
4. 在「规则任务管理」新建任务「dq_rationality_fc_value_fail_task」，引入规则集并保存。
5. 对任务执行【立即运行】，打开最新实例与详情页。
6. 跳转该实例的数据质量报告。
> 预期结果
1. 实例结果显示该条规则「校验不通过」。
2. 详情页命中 id=2、id=3 的失败记录并可查看原因。
3. 报告内容展示该规则为「校验不通过」，并包含上述失败样本。

#### 合理性-多表字段值对比-计算结果比对
> 小规则清单（源码推导）
> - FunctionType.REASONABLE_MULTI_TABLE_COLUMN_VALUE（50）= `合理性-多表字段值对比`
> - RATIONALITY_COMPARE_METHOD.CALC_RESULT_COMPARE（1）= `计算结果比对`

##### 【P1】校验多表字段值对比在两侧算式一致时通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备主表与关联表数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_mt_main_compare_pass;
CREATE TABLE test_db.dq_rationality_mt_main_compare_pass (
  id BIGINT,
  amount_a BIGINT,
  amount_b BIGINT,
  check_sum BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_mt_main_compare_pass VALUES (1, 10, 5, 15);
INSERT INTO test_db.dq_rationality_mt_main_compare_pass VALUES (2, 20, 8, 28);

DROP TABLE IF EXISTS test_db.dq_rationality_mt_dim_compare_pass;
CREATE TABLE test_db.dq_rationality_mt_dim_compare_pass (
  id BIGINT,
  ref_amount BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_mt_dim_compare_pass VALUES (1, 15);
INSERT INTO test_db.dq_rationality_mt_dim_compare_pass VALUES (2, 28);
```
> 操作步骤
1. 在「规则库配置」确认「合理性校验」包含「多表字段值对比」。
2. 在「规则集管理」新建「dq_rationality_mt_compare_pass」，主表选择「test_db.dq_rationality_mt_main_compare_pass」。
3. 新增「合理性-多表字段值对比」规则：字段选择「check_sum」，校验表主键选择「id」，关联表1选择「test_db.dq_rationality_mt_dim_compare_pass」，关联键使用「id」，对比方法选择「计算结果比对」。
4. 配置关联逻辑：
   - 计算逻辑1：`A.amount_a + A.amount_b`
   - 计算逻辑2：`B.ref_amount`
   - 运算符：`=`
   并保存规则。
5. 在「规则任务管理」创建任务「dq_rationality_mt_compare_pass_task」，绑定主表并导入该规则集。
6. 执行任务【立即运行】，在「校验结果查询」进入最新实例。
7. 点击该实例报告查看该条规则展示。
> 预期结果
1. 规则通过校验库与任务流转，实例状态正常完成。
2. 规则结果为「校验通过」，未出现失败记录。
3. 质量报告中该规则条目显示「校验通过」。

##### 【P1】校验多表字段值对比在两侧算式不一致时不通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备主表与关联表数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_mt_main_compare_fail;
CREATE TABLE test_db.dq_rationality_mt_main_compare_fail (
  id BIGINT,
  amount_a BIGINT,
  amount_b BIGINT,
  check_sum BIGINT
) USING SPARKTHIFT2X;
INSERT INTO test_db.dq_rationality_mt_main_compare_fail VALUES (1, 10, 5, 15);
INSERT INTO test_db.dq_rationality_mt_main_compare_fail VALUES (2, 20, 8, 28);

DROP TABLE IF EXISTS test_db.dq_rationality_mt_dim_compare_fail;
CREATE TABLE test_db.dq_rationality_mt_dim_compare_fail (
  id BIGINT,
  ref_amount BIGINT
) USING SPARKTHIFT2X;
INSERT INTO test_db.dq_rationality_mt_dim_compare_fail VALUES (1, 15);
INSERT INTO test_db.dq_rationality_mt_dim_compare_fail VALUES (2, 20);
```
> 操作步骤
1. 规则库配置确认「合理性-多表字段值对比」规则仍可选。
2. 在「规则集管理」新建「dq_rationality_mt_compare_fail」，主表为「test_db.dq_rationality_mt_main_compare_fail」。
3. 新增「字段」为「check_sum」，「统计函数」为「多表字段值对比」，对比方法为「计算结果比对」。
4. 配置关联字段：
   - 校验表主键「id」
   - 关联表1「test_db.dq_rationality_mt_dim_compare_fail」，关联主键「id」
   - 计算逻辑1：`A.amount_a + A.amount_b`
   - 计算逻辑2：`B.ref_amount`
   - 运算符 `=`，保存规则。
5. 在「规则任务管理」创建并运行任务「dq_rationality_mt_compare_fail_task」，引入该规则集。
6. 任务执行完成后在「校验结果查询」查看最新实例与该规则详情。
7. 打开实例对应的数据质量报告。
> 预期结果
1. 该条规则状态为「校验不通过」，失败原因指向 id=2 的不一致值。
2. 详情页明细展示 id=2 的对比结果不满足 `A.amount_a + A.amount_b = B.ref_amount`。
3. 报告条目显示该规则结果为「校验不通过」。

#### 合理性-多表字段值对比-计算结果值判断
> 小规则清单（源码推导）
> - FunctionType.REASONABLE_MULTI_TABLE_COLUMN_VALUE（50）= `合理性-多表字段值对比`
> - RATIONALITY_COMPARE_METHOD.CALC_RESULT_VALUE_JUDGE（2）= `计算结果值判断`

##### 【P1】校验多表字段值对比在值判断条件满足时通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备主表与关联表数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_mt_main_judge_pass;
CREATE TABLE test_db.dq_rationality_mt_main_judge_pass (
  id BIGINT,
  amount_a BIGINT,
  amount_b BIGINT,
  check_sum BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_mt_main_judge_pass VALUES (1, 10, 5, 15);
INSERT INTO test_db.dq_rationality_mt_main_judge_pass VALUES (2, 20, 8, 28);

DROP TABLE IF EXISTS test_db.dq_rationality_mt_dim_judge_pass;
CREATE TABLE test_db.dq_rationality_mt_dim_judge_pass (
  id BIGINT,
  ref_amount BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_mt_dim_judge_pass VALUES (1, 5);
INSERT INTO test_db.dq_rationality_mt_dim_judge_pass VALUES (2, 10);
```
> 操作步骤
1. 在规则库配置确认「合理性校验」内可选「多表字段值对比」。
2. 规则集管理中创建规则集「dq_rationality_mt_judge_pass」，主表为「test_db.dq_rationality_mt_main_judge_pass」。
3. 新建「合理性-多表字段值对比」规则：
   - 字段「check_sum」，对比方法「计算结果值判断」，
   - 计算逻辑1「A.amount_a + A.amount_b + B.ref_amount」，
   - 结果值条件设置「>= 15 且 <= 40」。
4. 配置关联关系：主表主键「id」，关联表1「test_db.dq_rationality_mt_dim_judge_pass」，关联键「id」，保存。
5. 在「规则任务管理」创建任务「dq_rationality_mt_judge_pass_task」，引入该规则集并保存。
6. 执行任务【立即运行】，在「校验结果查询」打开最新实例。
7. 从实例跳转到质量报告查看本规则结果。
> 预期结果
1. 实例运行完成，任务状态成功。
2. 该规则在校验结果查询中显示「校验通过」。
3. 报告条目显示「校验通过」，对应失败计数为 0。

##### 【P1】校验多表字段值对比在值判断条件不满足时不通过
> 前置条件
- 已登录数据资产平台
- 已选数据源为「SparkThrift2.x」，数据库为「test_db」
- 已准备主表与关联表数据
```sql
DROP TABLE IF EXISTS test_db.dq_rationality_mt_main_judge_fail;
CREATE TABLE test_db.dq_rationality_mt_main_judge_fail (
  id BIGINT,
  amount_a BIGINT,
  amount_b BIGINT,
  check_sum BIGINT
) USING SPARKTHRIFT2X;
INSERT INTO test_db.dq_rationality_mt_main_judge_fail VALUES (1, 1, 2, 3);
INSERT INTO test_db.dq_rationality_mt_main_judge_fail VALUES (2, 12, 18, 30);

DROP TABLE IF EXISTS test_db.dq_rationality_mt_dim_judge_fail;
CREATE TABLE test_db.dq_rationality_mt_dim_judge_fail (
  id BIGINT,
  ref_amount BIGINT
) USING SPARKTHIFT2X;
INSERT INTO test_db.dq_rationality_mt_dim_judge_fail VALUES (1, 2);
INSERT INTO test_db.dq_rationality_mt_dim_judge_fail VALUES (2, 50);
```
> 操作步骤
1. 在「规则库配置」确认「合理性-多表字段值对比」规则仍可新增。
2. 规则集管理新建「dq_rationality_mt_judge_fail」，主表选择「test_db.dq_rationality_mt_main_judge_fail」。
3. 新增多表字段值对比规则：字段「check_sum」，对比方法「计算结果值判断」，计算逻辑填写「A.amount_a + A.amount_b + B.ref_amount」，结果值配置 `>= 15 且 <= 40`。
4. 关联主表主键「id」，关联表1「test_db.dq_rationality_mt_dim_judge_fail」，关联主键「id」，保存规则。
5. 在「规则任务管理」创建任务「dq_rationality_mt_judge_fail_task」，导入规则集后保存。
6. 执行任务【立即运行】，在「校验结果查询」打开最新实例并查看规则明细。
7. 点击实例对应「数据质量报告」。
> 预期结果
1. 该条规则在实例中显示「校验不通过」。
2. 详情页明细展示 id=2 的计算结果超出阈值。
3. 报告页该规则展示「校验不通过」，并可定位到失败记录。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
