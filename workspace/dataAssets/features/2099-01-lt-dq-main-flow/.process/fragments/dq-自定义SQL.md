## 数据质量
### 自定义 SQL 校验
#### SQL 规则配置与参数化

##### 【P0】使用合法 SQL 成功保存自定义SQL模版并生成参数

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源中可执行如下 SQL，并保持当前数据源中可见：

DROP TABLE IF EXISTS qa_auto_dq_customsql_template_ok;
CREATE TABLE qa_auto_dq_customsql_template_ok (
  id INT,
  order_no STRING,
  is_certific INT,
  p_dt STRING,
  region STRING
) USING ORC;

INSERT INTO qa_auto_dq_customsql_template_ok VALUES
(1, 'ORDER_001', 1, '2026-05-20', 'NW'),
(2, 'ORDER_002', 0, '2026-05-20', 'NW'),
(3, 'ORDER_003', 1, '2026-05-20', 'SW'),
(4, 'ORDER_004', 0, '2026-05-19', 'SW'),
(5, 'ORDER_005', 1, '2026-05-20', 'SW');
SELECT * FROM qa_auto_dq_customsql_template_ok;

自定义 SQL 示例：
SELECT COUNT(1)
FROM ${table}
WHERE ${partition} = '2026-05-20' AND is_certific = 0;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入「数据质量 → 规则库配置 → 自定义SQL模版」，点击「新增自定义sql模版」 | 页面进入模版创建态，显示「规则名称 / 规则分类 / 关联范围 / 规则描述」与「SQL 配置」区域 |
| 2 | 在基本信息区域输入规则名称、选择「完整性」，选择「表级」，填写规则描述后点击下一步 | 字段必填项校验通过，按钮可继续 |
| 3 | 在「Sql面板」输入示例 SQL 并确认参数自动识别为 `${table}` 与 `${partition}` | 参数列表展示两行，包含参数 `${table}`、`${partition}`，类型可编辑且不为空 |
| 4 | `table` 类型选择「当前校验表」、`partition` 类型选择「当前校验表字段」并填写参数名称/说明 | 参数配置保存成功，输入边界约束提示正常 |
| 5 | 填写「校验方法=固定值」「期望值=2」「强弱规则=弱规则」，点击「保存」 | 模版保存成功，返回列表后可通过规则名称检索到该记录 |

##### 【P1】保存语法错误 SQL 的自定义SQL模版并阻断提交

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源先执行以下建表/数据写入，作为场景背景：

DROP TABLE IF EXISTS qa_auto_dq_customsql_template_bad;
CREATE TABLE qa_auto_dq_customsql_template_bad (
  id INT,
  order_no STRING,
  status INT
) USING ORC;
INSERT INTO qa_auto_dq_customsql_template_bad VALUES (1, 'A001', 1), (2, 'A002', 0);

SQL 负样例（仅用于表单）:
SELECT COUNT(1) FROM ${table} WHERE status IN (0,1
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入「数据质量 → 规则库配置 → 自定义SQL模版」并打开新增页 | 表单字段渲染正常 |
| 2 | 按规则基础信息填写完整后，在 SQL 区域输入语法错误 SQL | 语法错误提示词与高亮位置可见 |
| 3 | 点击「保存」 | 系统阻断提交并提示 SQL 语法不合法，模板不进入列表 |
| 4 | 点击「取消」并返回列表，再输入合法 SQL 重试 | 非法草稿不入库，可重入并进入步骤 1 的正常提交流程 |

##### 【P1】校验模板参数列表排除全局参数，保留自定义 SQL 占位符

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
控制台已创建全局参数：threshold_limit=20。
SparkThrift2.x 数据源中执行：

DROP TABLE IF EXISTS qa_auto_dq_customsql_template_params;
CREATE TABLE qa_auto_dq_customsql_template_params (
  id INT,
  event_dt STRING,
  error_flag INT
) USING ORC;
INSERT INTO qa_auto_dq_customsql_template_params VALUES
(1, '2026-05-20', 0),
(2, '2026-05-20', 1),
(3, '2026-05-19', 1);

自定义 SQL 示例：
SELECT COUNT(1)
FROM ${table}
WHERE ${partition} = '2026-05-20' AND error_flag > ${threshold_limit};
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入「数据质量 → 规则库配置 → 自定义SQL模版」并新增模版，输入上述 SQL | SQL 编辑框可输入完整 SQL，参数解析开始 |
| 2 | 查看参数列表 | 列表中显示 `${table}` 与 `${partition}`，不显示 `${threshold_limit}` 的参数行 |
| 3 | 将 `threshold_limit` 保持全局参数状态后保存 | 模版保存成功，全局参数未被当作自定义参数显示，边界场景通过 |

#### 规则库生命周期与链路执行

##### 【P0】检索自定义SQL模版并在规则任务链路中引用校验通过

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源执行：

DROP TABLE IF EXISTS qa_auto_dq_customsql_flow_pass;
CREATE TABLE qa_auto_dq_customsql_flow_pass (
  id INT,
  device_id STRING,
  defect_count INT,
  p_dt STRING
) USING ORC;
INSERT INTO qa_auto_dq_customsql_flow_pass VALUES
(1, 'D001', 0, '2026-05-20'),
(2, 'D002', 1, '2026-05-20'),
(3, 'D003', 2, '2026-05-20'),
(4, 'D004', 0, '2026-05-19');

对应自定义SQL：
SELECT COUNT(1)
FROM ${table}
WHERE ${partition} = '2026-05-20' AND defect_count > 0;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 在「规则库配置 → 自定义SQL模版」搜索模版名「qa_flow_pass」，确认规则信息可见 | 规则列表仅展示命中记录，名称、分类、规则描述与关联范围正确 |
| 2 | 点击命中的模版进入详情再返回列表，点击「编辑」并将规则描述更新为「spark pass」后保存 | 保存成功，列表与详情中的规则描述同步更新 |
| 3 | 进入「规则集管理」新建规则集并绑定数据源 SparkThrift2.x、数据库 `pw_test`、数据表 `qa_auto_dq_customsql_flow_pass`，新增规则包 | 规则包创建成功 |
| 4 | 进入「规则任务管理」新建监控规则，关联该规则集并导入上一步规则包，选择规则类型「自定义SQL」，引用步骤2保存的模版并选择字段值 `defect_count`、`p_dt` 作为参数 | 规则参数回显成功，引用链路建立 |
| 5 | 切换到调度属性页，实例生成方式选择「立即生成」，提交任务 | 任务保存成功并进入任务列表 |
| 6 | 在任务列表执行该任务后打开本次最新实例，进入「校验结果查询」 | 结果状态为「校验通过」，不通过列表为空，详情 SQL 展示参数替换为 `qa_auto_dq_customsql_flow_pass` 和 `p_dt = '2026-05-20'` |

##### 【P1】修改阈值触发自定义SQL告警并在明细中定位异常

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源执行：

DROP TABLE IF EXISTS qa_auto_dq_customsql_flow_fail;
CREATE TABLE qa_auto_dq_customsql_flow_fail (
  id INT,
  device_id STRING,
  defect_count INT,
  p_dt STRING
) USING ORC;
INSERT INTO qa_auto_dq_customsql_flow_fail VALUES
(1, 'D001', 0, '2026-05-20'),
(2, 'D002', 1, '2026-05-20'),
(3, 'D003', 2, '2026-05-20');

对应自定义SQL：
SELECT COUNT(1)
FROM ${table}
WHERE ${partition} = '2026-05-20' AND defect_count > 0;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 在「规则库配置 → 自定义SQL模版」搜索并打开该任务所用模版，确认 SQL 与参数 `${table}`、`${partition}` 正常保存 | 模版可复用，参数列表不为空 |
| 2 | 在「规则集管理」创建规则集（数据源 SparkThrift2.x，表 `qa_auto_dq_customsql_flow_fail`）并关联上述规则包 | 规则集状态为可引用 |
| 3 | 在「规则任务管理」新建监控规则并导入该规则包，引用模版后将校验方式设置为「固定值=1」 | 保存成功，任务版本与引用参数可读 |
| 4 | 立即执行任务并打开本次实例详情 | 本次结果为「校验未通过」，不通过数量为 2（返回值 2 > 1） |
| 5 | 点击「查看明细」并按字段过滤 | 明细列表展示两条 `defect_count` 大于 0 的原始记录，列中异常字段标红 |

##### 【P0】删除未被任务引用的自定义SQL模版不影响链路历史

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源先建表并保持可用：

DROP TABLE IF EXISTS qa_auto_dq_customsql_t_delete;
CREATE TABLE qa_auto_dq_customsql_t_delete (
  id INT,
  status INT,
  p_dt STRING
) USING ORC;
INSERT INTO qa_auto_dq_customsql_t_delete VALUES (1, 0, '2026-05-20'), (2, 1, '2026-05-20');

自定义 SQL：
SELECT COUNT(1) FROM ${table} WHERE ${partition} = '2026-05-20' AND status = 1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 在「规则库配置 → 自定义SQL模版」搜索待删除模版并确认未被任何规则任务引用（关联规则数=0） | 引用计数显示为 0 |
| 2 | 打开该记录并执行「删除」 | 删除动作弹窗出现，按钮「确定/取消」可选 |
| 3 | 在二次确认框点击确定 | 模版记录移除，列表中不再展示该名称 |
| 4 | 进入「规则集管理」和「规则任务管理」检查该模版历史引用列表 | 历史链路无异常，删除动作未影响未创建的任务 |

##### 【P1】删除被规则任务引用的自定义SQL模版并校验阻断提示

> 前置条件

```
已使用具备「数据质量」相关权限的账号登录数据资产平台。
SparkThrift2.x 数据源执行：

DROP TABLE IF EXISTS qa_auto_dq_customsql_t_bound;
CREATE TABLE qa_auto_dq_customsql_t_bound (
  id INT,
  status INT,
  p_dt STRING
) USING ORC;
INSERT INTO qa_auto_dq_customsql_t_bound VALUES
(1, 0, '2026-05-20'),
(2, 1, '2026-05-20'),
(3, 1, '2026-05-20');

自定义 SQL：
SELECT COUNT(1)
FROM ${table}
WHERE ${partition} = '2026-05-20' AND status = 1;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 创建并保存该模版后，在「规则集管理」中创建规则集和规则包，进入「规则任务管理」通过导入规则包引用该模版并提交任务 | 任务链路创建成功，模版关联计数变更为 1 |
| 2 | 返回「规则库配置 → 自定义SQL模版」尝试删除该模版 | 删除按钮点击后二次确认弹窗出现 |
| 3 | 在二次确认点击「确定」 | 系统拦截删除，提示该模版已被任务引用且必须先取消引用 |
| 4 | 在任务列表解除引用或下线该任务后再次删除 | 删除成功，模版从列表消失 |

<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->
