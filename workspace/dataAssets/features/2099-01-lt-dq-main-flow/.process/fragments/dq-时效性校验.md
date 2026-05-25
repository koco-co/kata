## 数据质量
### 时效性校验
> 小规则清单（源码推导）：
> - 周期性校验-单字段时间差（`FunctionType.SINGLE_FIELD_TIME_DIFFERECE = 42`，前端函数名 `STATISTICS_FUNC.SINGLE_FIELD_COMPARE`）
> - 及时性校验-多字段时间差（`FunctionType.TIME_MULTI_FIELD_DIFFERENCE = 44`，前端函数名 `STATISTICS_FUNC.MULTIPLE_FIELD_COMPARE`）
> - `FunctionType.DATA_TRENDS = 43` 在后端 `FunctionType` 中存在枚举，但当前时效性规则前端展示映射 `RULE_TYPE_TIMELINESS_TEXT` 中仅包含 `42/44`，本轮按现网规则按 `TIMELINESS` 大类仅做 2 个小规则。
> - 时效性字段类型约束（`TIMELINESS_COLUMN_SUPPORT_TYPES`）：`STRING`、`ALL`

#### 周期性校验-单字段时间差
##### 【P1】验证「周期性校验-单字段时间差」阈值内的数据通过校验
> 前置条件
> - 已登录数据质量模块，SparkThrift2.x 数据源为活跃源。
> - 已创建用于测试的数据库表 `qa_auto.timeliness_single_field_pass`。
> - 时效性字段类型约束为 `TIMELINESS_COLUMN_SUPPORT_TYPES = ["string", "all"]`，本例字段类型使用 `STRING`。

```sql
DROP TABLE IF EXISTS qa_auto.timeliness_single_field_pass;
CREATE TABLE qa_auto.timeliness_single_field_pass (
  id STRING,
  biz_time STRING
) USING PARQUET;
INSERT INTO qa_auto.timeliness_single_field_pass VALUES
('1', '2026-06-01 10:00:00'),
('2', '2026-06-01 10:00:20'),
('3', '2026-06-01 10:00:40');
```

> 操作步骤
> 1. 打开「规则库配置」页，筛选「规则类型」=`时效性校验`，确认统计函数可选值中包含「周期性校验（单字段时间差）」。
> 2. 进入「规则集管理」，新建规则集「timeliness-single-pass-set」，选择数据表 `qa_auto.timeliness_single_field_pass`，新增一条时效性规则：字段=`biz_time`、函数=`周期性校验（单字段时间差）`、排序字段=`biz_time`、过滤条件=`id >= '1'`、时间差=`<= 30 秒`、强弱规则=`弱规则`、规则描述=`timeliness single pass`。
> 3. 保存规则集后进入「规则任务管理」，新建规则任务「timeliness-single-pass-task」，选择该规则集并点击「立即运行」。
> 4. 进入「校验结果查询」，打开该任务最近一次实例，点击「数据质量报告」。
> 5. 在报告的规则明细中筛选到「周期性校验（单字段时间差）」该规则。

> 预期结果
> 1. 报告中该条规则显示「校验通过」，失败数为 0，规则明细中未出现不通过记录。
> 2. 三条记录 `id = 1~3` 均通过，因为相邻两条 `biz_time` 差值均为 20 秒，满足 `<= 30 秒` 的限制。
> 3. 任务实例状态为「执行成功」，可在实例详情中查看规则类型、规则名称、字段名称与阈值信息。

##### 【P1】验证「周期性校验-单字段时间差」超阈值时不通过
> 前置条件
> - 已登录数据质量模块，SparkThrift2.x 数据源为活跃源。
> - 已创建用于测试的数据库表 `qa_auto.timeliness_single_field_fail`。
> - 时效性字段类型约束为 `TIMELINESS_COLUMN_SUPPORT_TYPES = ["string", "all"]`，本例字段类型使用 `STRING`。

```sql
DROP TABLE IF EXISTS qa_auto.timeliness_single_field_fail;
CREATE TABLE qa_auto.timeliness_single_field_fail (
  id STRING,
  biz_time STRING
) USING PARQUET;
INSERT INTO qa_auto.timeliness_single_field_fail VALUES
('1', '2026-06-01 10:00:00'),
('2', '2026-06-01 10:00:20'),
('3', '2026-06-01 10:02:00');
```

> 操作步骤
> 1. 在「规则库配置」确认可配置「时效性校验」与「周期性校验（单字段时间差）」。
> 2. 进入「规则集管理」，新建规则集「timeliness-single-fail-set」，选择表 `qa_auto.timeliness_single_field_fail`，新增规则：字段=`biz_time`、函数=`周期性校验（单字段时间差）`、排序字段=`biz_time`、过滤条件=`id >= '1'`、时间差=`<= 30 秒`。
> 3. 进入「规则任务管理」，新建并启动任务「timeliness-single-fail-task」，使用上一步规则集。
> 4. 在「校验结果查询」打开该实例并进入「数据质量报告」。
> 5. 查看该规则明细并打开失败记录详情。

> 预期结果
> 1. 报表显示该规则「校验不通过」，失败计数为 1。
> 2. 明细高亮标记 `id = 3`，其与前一行 `biz_time` 的时间差为 100 秒，超出 `<= 30 秒` 的阈值。
> 3. 失败原因和规则配置可在实例详情/明细中完整展示，失败原因与阈值不一致一致。

#### 及时性校验-多字段时间差
##### 【P2】验证「及时性校验-多字段时间差」阈值内的数据通过校验
> 前置条件
> - 已登录数据质量模块，SparkThrift2.x 数据源为活跃源。
> - 已创建用于测试的数据库表 `qa_auto.timeliness_multi_field_pass`。
> - 对比字段与主字段均满足 `TIMELINESS_COLUMN_SUPPORT_TYPES = ["string", "all"]`，本例使用 `STRING`。

```sql
DROP TABLE IF EXISTS qa_auto.timeliness_multi_field_pass;
CREATE TABLE qa_auto.timeliness_multi_field_pass (
  id STRING,
  start_time STRING,
  end_time STRING
) USING PARQUET;
INSERT INTO qa_auto.timeliness_multi_field_pass VALUES
('1', '2026-06-01 10:00:00', '2026-06-01 10:00:20'),
('2', '2026-06-01 10:05:00', '2026-06-01 10:05:10'),
('3', '2026-06-01 10:10:00', '2026-06-01 10:10:45');
```

> 操作步骤
> 1. 在「规则库配置」确认「时效性校验」下可选「及时性校验（多字段时间差校验）」并展示对比字段组配置区域。
> 2. 进入「规则集管理」，新建规则集「timeliness-multi-pass-set」，选择表 `qa_auto.timeliness_multi_field_pass`，新增规则：字段=`id`、函数=`及时性校验（多字段时间差校验）`、过滤条件=`id >= '1'`、对比字段组1=`start_time ; end_time`、时间差=`<= 60 秒`、大小关系=`start_time < end_time`、强弱规则=`弱规则`、描述=`timeliness multi pass`。
> 3. 保存后到「规则任务管理」，新建任务「timeliness-multi-pass-task」，导入该规则集并立即运行。
> 4. 打开「校验结果查询」最近实例，进入该实例的「数据质量报告」。
> 5. 在报告明细中校验该规则条目是否为通过状态。

> 预期结果
> 1. 报表中「及时性校验（多字段时间差校验）」规则状态为「校验通过」，失败数为 0。
> 2. `id=1/2/3` 三条数据均满足 `start_time` 到 `end_time` 的差值 ≤ 60 秒，且 `start_time < end_time` 为真。
> 3. 实例详情页面能读取并展示规则配置中的对比字段组、阈值与关系。

##### 【P2】验证「及时性校验-多字段时间差」超阈值时不通过
> 前置条件
> - 已登录数据质量模块，SparkThrift2.x 数据源为活跃源。
> - 已创建用于测试的数据库表 `qa_auto.timeliness_multi_field_fail`。
> - 对比字段与主字段均满足 `TIMELINESS_COLUMN_SUPPORT_TYPES = ["string", "all"]`。

```sql
DROP TABLE IF EXISTS qa_auto.timeliness_multi_field_fail;
CREATE TABLE qa_auto.timeliness_multi_field_fail (
  id STRING,
  start_time STRING,
  end_time STRING
) USING PARQUET;
INSERT INTO qa_auto.timeliness_multi_field_fail VALUES
('1', '2026-06-01 10:00:00', '2026-06-01 10:00:20'),
('2', '2026-06-01 10:05:00', '2026-06-01 10:06:40');
```

> 操作步骤
> 1. 在「规则库配置」页选择时效性规则并确认「及时性校验（多字段时间差校验）」。
> 2. 进入「规则集管理」，新建规则集「timeliness-multi-fail-set」，表选择 `qa_auto.timeliness_multi_field_fail`，新增规则：字段=`id`、函数=`及时性校验（多字段时间差校验）`、过滤条件=`id >= '1'`、对比字段组1=`start_time ; end_time`、时间差=`<= 60 秒`、大小关系=`start_time < end_time`。
> 3. 进入「规则任务管理」创建任务「timeliness-multi-fail-task」，绑定该规则集并立即执行。
> 4. 在「校验结果查询」打开任务实例并跳转到「数据质量报告」。
> 5. 打开失败记录详情核对超时样本。

> 预期结果
> 1. 报告显示该规则「校验不通过」，失败条目数为 1。
> 2. `id = 2` 命中失败，`start_time` 到 `end_time` 差值为 100 秒，超出 `<= 60 秒` 阈值，详情页可定位该记录。
> 3. 规则明细仍可看到通过与不通过混合样本，不通过原因与阈值不一致一致。

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
