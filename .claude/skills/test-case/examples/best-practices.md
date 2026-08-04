# 用例编写规范

本文件只规定 `title`、`precondition`、`steps[].action` 和 `steps[].expected` 的写法。示例中的占位名称、字段、数字和 SQL 必须替换为需求事实。

## 标题

所有用例标题必须使用统一公式：

```yaml
# 统一公式：验证【模块】-【功能点】<操作>，<可观测结果>(条件)
title: 验证【单表校验规则】新建强规则并运行，触发强规则告警
title: 验证【周期任务】同步Restful源，任务状态为成功(源URL未配置path)
title: 验证【数据开发】-【周期任务】同步Restful源，任务状态为成功(未配置path)
```

规则：

- 前缀固定「验证」；对象用链式括号【模块】-【功能点】，每层一个【】、用 - 连接，最多两级；第三级起不写进标题（放 tags），标题内不用「」。
- 操作是动词短语（新建、删除、导入、运行、筛选、同步…），不得省略。
- 结果必须是可观测断言（列表新增、状态更新为、触发告警、Toast 提示、数量变化、字段值）；禁止通用空转词（功能正常/异常、完成目标操作且状态更新、配置后的显示等）。
- 条件可选，一律写在标题末尾半角括号 (…) 内，括号内必须含**可判断的关键字**；禁止「在…时」从句、下划线拼接和括号内嵌套【】。

### 条件括号：必须含可判断关键字，否则一律拦截

条件括号里的内容必须是**可直接判断真假的表达式**，必须出现以下判断关键字之一：

- 比较/算术操作符：`= ≠ ≥ ≤ > < + - * ÷`
- 逻辑连接词：`且 或 非`
- 状态断言：`为空 非空 未配置`

写不出含判断关键字的表达式时，**去掉括号**，把信息合并到标题正文。

✅ 正确的条件（含判断关键字，lint 通过）：

```yaml
title: 验证【数据导出】发起L4导出任务，文件行数完整(行数 ≥ 10000)
title: 验证【行权限】新增行条件并保存，最多五条条件生效(条件数 ≤ 5)
title: 验证【引用数据表】配置数据源并映射字段，保存成功且详情读取源表(数据源 = Hive2.x)
title: 验证【码表管理】新建码表填写上级代码，保存成功(上级代码为空)
title: 验证【行条件】配置同一字段两条条件并选择且，只返回同时满足两条条件的行(且)
title: 验证【行条件】新增行条件选择is null并保存，结果按该操作符过滤(条件 = is null)
title: 验证【数据表列表】按状态筛选数据表，列表返回已发布数据表(状态 = 已发布)
title: 验证【L4导出】导出10000行数据，180秒内完成且文件行数完整(行数 = 10000)
```

❌ 错误的条件（无判断关键字，lint 一律拦截）：

```yaml
title: 验证【数据导出】导出10000行数据，文件行数完整(10000行)          # 纯数字，无判断符
title: 验证【行权限】新增行条件，最多五条条件生效(5条上限)               # 纯数字，无判断符
title: 验证【引用数据表】配置Hive2.x数据源，保存成功(Hive2.x)           # 对象名，无判断符
title: 验证【码表管理】新建码表填写上级代码，保存成功(255字符)           # 纯数字，无判断符
title: 验证【数据表列表】按状态筛选数据表，列表返回已发布表(草稿)         # 取值，无判断符
title: 验证【属性管理】-【删除】删除自定义属性，列表不再展示该属性(逻辑)   # 流程词
title: 验证【属性管理】-【删除】删除属性并二次确认，提示删除成功(交互)     # 流程词
title: 验证【目录管理】-【目录导入】导入编码为空或重复的L3目录文件(导入成功) # 结果标签
title: 验证【数据表列表】-【搜索配置】选择2～9个条件，确定按钮可用(最多9个条件) # 纯数字+功能词
title: 验证【资产盘点】查看数据表查询结果列表，展示完整列表字段(数据表结果)  # 范围标签
title: 验证【标准属性管理】点击标准管理入口，展示标准属性管理tab按钮(新增页面) # 页面元素
title: 验证【数据地图】-【表详情】查看表详情安全与隐私等级，展示自动分级结果(安全等级逻辑正确) # 断言词
```

判定要点：

- **必须含判断关键字**：`= ≠ ≥ ≤ > < + - * ÷`、`且 或 非`、`为空 非空 未配置`。例如「行数 ≥ 10000」「期望值 ≠ 0」「行条件 ≤ 5」「数据源 = Hive2.x」「密码为空」。
- **不算判断关键字**：纯数字（10000行、5条上限、255字符）、对象名（Hive2.x、catalogIds）、层级/范围标签（L1～L3、数据表结果、表详情页）、页面元素（新增页面、弹窗、列表、筛选框）、功能点（导出、导入、校验、分页）、流程词（逻辑、交互、通过、失败、正常、成功）、断言词（正确、完整、一致）。
- 判断标准只有一个：**括号内容是否是可判断的表达式（含判断关键字）**？是则保留；否则去掉括号，把信息合并到标题正文。

## 前置条件

**分界线（强制）**：前置条件只声明「执行用例前环境里已有的数据与对象」——数据源授权、数据库、数据表及其内容、角色账号、以及用例开始前已存在的业务对象。**任何需要用户在用例执行过程中完成的配置操作（配置监控对象、配置监控规则、新建规则集/规则任务、设置过滤条件、点击保存等）必须写进 `steps[].action`，不得写进前置条件。** 前置条件里出现「存在规则/规则集/规则任务 + 规则配置明细」时，把该对象如何进入测试环境（新建或复用已有对象）写为 action 步骤。

```yaml
# 无
precondition: 无

# 一条
precondition: |-
  1) 授权数据源：${DataSourceA}

# 角色账号
precondition: |-
  1) 使用租户管理员账号进入数据资产平台

# 已存在的业务对象（环境事实；对象的创建动作进 action）
precondition: |-
  1) 规则库配置列表共 2 条记录
```

### 数据源、数据库和 SQL

```yaml
# 单数据源
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 数据源类型：SparkThrift2.x
  3) 存在数据库：${SchemaA}
  4) 创建数据表并插入 10k 行数据：
     DROP TABLE IF EXISTS ${SchemaA}.test_table_13925_c0260;
     CREATE TABLE IF NOT EXISTS ${SchemaA}.test_table_13925_c0260 (
       id BIGINT, code STRING, name STRING, amount DECIMAL(10,2)
     );
     INSERT INTO ${SchemaA}.test_table_13925_c0260
     SELECT id, CONCAT('code_', CAST(id AS STRING)), CONCAT('name_', CAST(id AS STRING)), CAST(id AS DECIMAL(10,2))
     FROM range(1, 10001);

# 多数据源/多数据库
precondition: |-
  1) 授权数据源 A：${DataSourceA}
  2) 数据源 A 类型：SparkThrift2.x
  3) 数据源 A 存在数据库：${SchemaA}、${SchemaA2}
  4) 在 ${SchemaA} 创建源表：
     DROP TABLE IF EXISTS ${SchemaA}.test_table_14280_c0001_source_01;
     CREATE TABLE IF NOT EXISTS ${SchemaA}.test_table_14280_c0001_source_01 (id BIGINT, code STRING);
     INSERT INTO ${SchemaA}.test_table_14280_c0001_source_01 VALUES (1, 'A001');
  5) 在 ${SchemaA2} 创建目标表：
     DROP TABLE IF EXISTS ${SchemaA2}.test_table_14280_c0001_target_01;
     CREATE TABLE IF NOT EXISTS ${SchemaA2}.test_table_14280_c0001_target_01 (id BIGINT, code STRING);
     INSERT INTO ${SchemaA2}.test_table_14280_c0001_target_01 VALUES (1, 'A001');
  6) 授权数据源 B：${DataSourceB}
  7) 数据源 B 类型：SparkThrift2.x
  8) 数据源 B 存在数据库：${SchemaB}
  9) 在 ${SchemaB} 创建对比表：
     DROP TABLE IF EXISTS ${SchemaB}.test_table_14280_c0001_comparison_01;
     CREATE TABLE IF NOT EXISTS ${SchemaB}.test_table_14280_c0001_comparison_01 (id BIGINT, code STRING);
     INSERT INTO ${SchemaB}.test_table_14280_c0001_comparison_01 VALUES (1, 'A001');
```

### 表名

```text
单表：test_table_13925_c0260
源表：test_table_14280_c0001_source_01
目标表：test_table_14280_c0001_target_01
对比表：test_table_14280_c0001_comparison_01
维表：test_table_14280_c0001_dimension_01
同一角色 ≥2 张表：追加至少两位序号；超大集合可用 test_table_13925_c0260_source_00001～10000
```

### 分区表

```yaml
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 数据源类型：SparkThrift2.x
  3) 存在数据库：${SchemaA}
  4) 创建分区表并写入前一日和当日两个分区：
     DROP TABLE IF EXISTS ${SchemaA}.test_table_13925_c0260;
     CREATE TABLE IF NOT EXISTS ${SchemaA}.test_table_13925_c0260 (
       id BIGINT, amount DECIMAL(10,2)
     ) PARTITIONED BY (dt STRING);
     INSERT INTO ${SchemaA}.test_table_13925_c0260 PARTITION (dt)
     SELECT 1, CAST(100 AS DECIMAL(10,2)), date_format(date_sub(current_date(), 1), 'yyyy-MM-dd')
     UNION ALL
     SELECT 2, CAST(200 AS DECIMAL(10,2)), date_format(current_date(), 'yyyy-MM-dd');
```

### 生成脚本

```yaml
# Shell 生成 SQL
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 数据源类型：SparkThrift2.x
  3) 存在数据库：${SchemaA}
  4) 使用以下 Shell 脚本生成 test_table_13925_c0260.sql：
     #!/usr/bin/env bash
     set -euo pipefail
     output_file="test_table_13925_c0260.sql"
     schema='${SchemaA}'
     table="${schema}.test_table_13925_c0260"
     {
       printf 'DROP TABLE IF EXISTS %s;\n' "${table}"
       printf 'CREATE TABLE IF NOT EXISTS %s (id BIGINT, code STRING);\n' "${table}"
       printf 'INSERT INTO %s VALUES\n' "${table}"
       for ((id=1; id<=100; id++)); do
         separator=','
         if (( id == 100 )); then separator=';'; fi
         printf "(%d, 'code_%d')%s\n" "${id}" "${id}" "${separator}"
       done
     } > "${output_file}"
  5) 复制 test_table_13925_c0260.sql 的内容，在 ${DataSourceA} 对应平台或底层执行

# Shell 生成 CSV
precondition: |-
  1) 使用以下 Shell 脚本生成 rule_import_13925_c0260.csv：
     #!/usr/bin/env bash
     set -euo pipefail
     output_file="rule_import_13925_c0260.csv"
     printf '%s\n' '* 规则名称,规则描述,* 表名,表中文名,字段名,字段中文名,* 校验SQL(请输入不符合规则要求的明细数据查询SQL)' > "${output_file}"
     for ((id=1; id<=100; id++)); do
       printf '规则_%03d,规则描述_%03d,departments,部门表,amount,金额,SELECT * FROM departments WHERE id = %d\n' "${id}" "${id}" "${id}" >> "${output_file}"
     done

# Python 生成 XLSX
precondition: |-
  1) 使用以下 Python 脚本生成 rule_import_13925_c0260.xlsx：
     from openpyxl import Workbook
     output_file = "rule_import_13925_c0260.xlsx"
     workbook = Workbook()
     sheet = workbook.active
     sheet.title = "Sheet1"
     sheet.append(["规则名称", "规则描述", "表名", "字段名", "校验SQL"])
     for index in range(1, 101):
         sheet.append([f"规则_{index:03d}", f"规则描述_{index:03d}", "departments", "amount", f"SELECT * FROM departments WHERE id = {index}"])
     workbook.save(output_file)
```

### 导入文件（五行以内）

```yaml
precondition: |-
  1) 创建导入文件 rule_import_13925_c0260.xlsx：
     Sheet: Sheet1
     Title: * 规则名称, 规则描述, * 表名, 表中文名, 字段名, 字段中文名, * 校验SQL(请输入不符合规则要求的明细数据查询SQL)
     Line1: RuleA, 金额字段不得为空, departments, 部门表, amount, 金额, SELECT * FROM departments WHERE amount IS NULL
```

## 步骤动作

每个 `action` 只描述一个可独立验收的操作阶段；页面切换、提交、下载、核对、再次操作或状态变更必须拆成独立步骤。同一表单的多个字段可合并配置并一次提交。

```yaml
# 首步页面入口
- action: 进入【资产盘点】页面
  expected: 进入成功
- action: 进入【数据质量 → 规则库配置】页面
  expected: 进入成功

# 单个操作
- action: 点击「新增规则」
  expected: 打开「新建规则」表单

# 独立操作拆分 — 页面切换、下载、核对、再次操作各自独立
- action: 点击「导出」，仅选择 L3「客户画像」，点击「确定」
  expected: 导出任务范围仅包含 L3「客户画像」
- action: 下载导出文件并打开
  expected: 文件可正常打开
- action: 核对导出文件的表头与记录
  expected: 表头字段完整且记录仅属于 L3「客户画像」
- action: 再次点击「导出」，全选一级目录「零售业务」下的全部 L3，点击「确定」
  expected: 导出任务范围包含「零售业务」下的全部 L3

# 表单配置 — 多字段可合并，一次提交在同一 action；必填字段前带 * 号（与前端一致）
- action: |-
    配置质量规则：
    * 规则名称：RuleA
    * 校验字段：amount
    规则强弱：强规则
    状态：启用
  expected: Toast提示:「保存成功」,新增记录:RuleA 且状态为「启用」

# 新建规则集 — 一个 action 按前端顺序列出全部配置项；必填带 * 号，可空项占位列出
# 顺序固定：*规则集名称、*选择数据源、*选择数据库、*选择数据表、规则集描述（可空）
# 不得省略任何一项，不得改字段名（必须写「选择数据源/选择数据库/选择数据表」）。
- action: |-
    新建规则集并配置监控对象：
    * 规则集名称：RuleSetA
    * 选择数据源：${DataSourceA}
    * 选择数据库：${SchemaA}
    * 选择数据表：test_table_15862_c0001
    规则集描述：空
    点击「下一步」
  expected: 进入「监控规则」步骤并展示校验字段与统计函数配置区

# 监控规则配置 — 每条规则一个 action，必须写全完整表单（不得省略/概括）
# 一个 action = 一个完整监控规则配置表单：生效范围、字段、统计函数、过滤条件、
# 校验方法、期望值、强弱规则、规则描述，以及该统计函数专属字段（如取值范围&枚举范围
# 的「取值范围」「枚举值」，数据精度的「小数点前/后最大位」，周期校验的「选择排序字段」
# 「时间差」等）。N 条规则 = N 个独立 action，禁止合并成一行「添加 N 条规则」。
# 配置项顺序必须与前端表单一致，且按规则类型动态列出全部配置项：
# - 合理性校验（数据变化趋势）：字段、统计函数、维度字段、过滤条件、选择排序字段、
#   校验方法、强弱规则、规则描述（维度字段可空但必须列出）
# - 完整性校验（空值数等）：生效范围、字段、字段间规则逻辑、统计函数、过滤条件、
#   校验方法、期望值、强弱规则、规则描述
# - 有效性校验（数值-取值范围等）：字段、统计函数、过滤条件、校验方法、期望值、
#   强弱规则、规则描述
# 可空配置项（如过滤条件未配置、维度字段不选）也必须在 action 中占位列出，值为「空」，
# 不得跳过该行；非必填项不带 * 号。
- action: |-
    配置监控规则1（合理性校验-数据变化趋势）：
    * 字段：sales
    * 统计函数：数据变化趋势
    维度字段：city（非必填，支持多选，最多 10 个）
    过滤条件：空
    * 选择排序字段：month
    * 校验方法：单调递增
    * 强弱规则：弱规则
    规则描述：测试规则
  expected: 监控规则1配置完成，规则项展示「sales / 数据变化趋势 / 排序字段 month / 单调递增 / 维度字段 city / 弱规则」
- action: |-
    配置监控规则2（完整性校验-空值数）：
    * 生效范围：字段级
    * 字段：id、age
    字段间规则逻辑：and
    * 统计函数：空值数
    过滤条件：手动配置 id<=100
    校验方法：固定值
    期望值：!=1
    * 强弱规则：弱规则
    规则描述：测试规则
  expected: 监控规则2配置完成，规则项展示「id、age / 空值数 / 固定值 !=1 / 弱规则」

# 复用已有对象 — 对象的创建/引用动作进 action，规则配置明细也在 action 中逐项给出
- action: 进入【数据质量 → 规则任务管理】页面，新建规则任务并选择监控表 test_table_15862_c0001，引入规则包 RuleA
  expected: 规则任务创建成功，监控对象与规则包配置展示完整
- action: |-
    配置监控规则：
    * 校验字段：sales
    * 统计函数：数据变化趋势
    * 选择排序字段：month
    * 校验方法：单调递增
    维度字段：city
  expected: 规则项展示「sales / 数据变化趋势 / 排序字段 month / 单调递增 / 维度字段 city」
- action: 点击该规则任务「立即执行」
  expected: 提示执行成功，任务进入调度

# 规则集新建 — 一个 action 写全基础信息表单，配置项顺序与前端一致
# 新建规则集的 action 必须按前端顺序逐行列出全部配置项：*规则集名称、*选择数据源、
# *选择数据库、*选择数据表、规则集描述（可空也须占位列出，值为「空」或留待后续填写）；
# 禁止把数据源/数据库/数据表选择混写在一行。lint 规则 case_rule_set_form 强制此项。
- action: |-
    点击「新建规则集」，配置基础信息：
    * 规则集名称：RuleSetA
    * 选择数据源：${DataSourceA}
    * 选择数据库：${SchemaA}
    * 选择数据表：test_table_15862_c0001
    规则集描述：空
    点击「下一步」
  expected: 进入规则配置步骤，基础信息回显规则集名称、描述、数据源、数据库和数据表
```

## 预期

使用可直接观察的执行结果：Toast 文本、控件状态、字段值、数量、执行状态或可执行查询结果。

```yaml
# 单个
expected: 「规则名称」置红提示:「请输入规则名称」,「保存」按钮禁用

# 多项
expected: |-
  1) 列表新增 RuleA
  2) 状态显示为「启用」
  3) 规则数量由 2 增加为 3

# SQL 校验
expected: |-
  1) 任务状态：「成功」
  2) 执行SQL：SELECT COUNT(*) FROM ${SchemaA}.test_table_13925_c0260;
     查询结果：10000
```
