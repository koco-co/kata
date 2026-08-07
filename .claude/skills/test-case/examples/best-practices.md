# 用例编写规范

本文件只规定 `title`、`precondition`、`steps[].action` 和 `steps[].expected` 的**通用写法**。
具体表单的配置项、必填标志、字段名、顺序和级联关系属于**客户专属规范**，见 `knowledge/standards/<客户>/`。

示例中的占位名称、字段、数字和 SQL 必须替换为需求事实。

## 多行文本与块标量

任何字段（`precondition`/`steps[].action`/`steps[].expected` 等）的多行内容一律用 `|-` 块标量**真实换行**，禁止用引号字符串 + `\n` 转义换行、也禁止用跨行引号包裹。块标量内可直接包含引号内容（如 `提示: '保存成功'`），不会被误伤；单行值仍可用引号。

```yaml
# ✅ 正确：块标量真实换行，编号行各自独立
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 存在数据库：${SchemaA}

# ❌ 错误：引号字符串 + \n 转义换行
precondition: "1) 授权数据源：${DataSourceA}\n2) 存在数据库：${SchemaA}"

# ❌ 错误：跨行单引号包裹一段文本
- action: '1）新增目录；

    2）再次查看编码值'

# ✅ 正确：块标量，内容里的引号原样保留
- action: |-
    提示：'保存成功'
    状态更新为「启用」
```

## 标题

所有用例标题必须使用统一公式：

```yaml
# 统一公式：验证【模块】-【功能点】<操作>，<可观测结果>(条件)
title: 验证【单表校验规则】新建强规则并运行，触发强规则告警
title: 验证【周期任务】同步Restful源，任务状态为成功(源URL未配置path)
title: 验证【数据开发】-【周期任务】同步Restful源，任务状态为成功(未配置path)
```

### tags 平级模块（数据质量）

数据质量下的 `规则库配置 / 规则集管理 / 规则任务管理 / 校验结果查询 / 数据质量报告` 是**同一级别平级菜单**（非层级关系）。tags 只保留**一个核心操作模块**（用例主要操作所在的模块，与首步导航无关）：

```yaml
# ✅ 正确：tags 只保留核心操作模块
tags:
  - 数据质量
  - 规则任务管理
# ✅ 正确：核心模块 + 功能细节
tags:
  - 数据质量
  - 校验结果查询
  - 监控报告
# ❌ 错误：把流程中经过的平级模块串成层级链
tags:
  - 数据质量
  - 规则集管理
  - 规则任务管理
  - 校验结果查询
```

lint 规则 `case_tags_flat_modules` 强制此项；tags 与首步导航 action 无强制挂钩关系。


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

✅ 正确

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

❌ 错误

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

**占位符与具体名规则**：
- **占位符**：数据源名 `${DataSourceA}`、库/schema 名 `${SchemaA}`、质量项目名 `${ProjectA}`。只有这三类用占位符。
- **具体名**：表名（`test_table_13925_c0260`）与**字段名**用具体业务名，不做占位。
- **字段名一致性（强制）**：建表 SQL 的字段名与表单「校验字段/字段」选择的字段名必须是**同一组字段**，且语义对应需求（如校验「金额不得为空」，建表字段 `amount`，表单选 `校验字段：amount`）。禁止建表字段随手写 `a/b/c`、表单选另一套字段名。

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

### 分区数据一正一异（质量规则任务）

监控任务选择分区时，前置分区表必须写入两个分区：**一个分区全部为可校验通过的正确数据，另一个分区全部为校验不通过的异常数据**；「选择分区」值指向与用例预期一致的分区，并写**分区字段=具体值**（如 `dt=2026-08-05`），不得写「选择当日分区」「选择已有分区」这类无值占位。

```yaml
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 数据源类型：SparkThrift2.x
  3) 存在数据库：${SchemaA}
  4) 创建分区表，前一日分区写入正确数据、当日分区写入异常数据：
     DROP TABLE IF EXISTS ${SchemaA}.test_table_13925_c0260;
     CREATE TABLE IF NOT EXISTS ${SchemaA}.test_table_13925_c0260 (
       id BIGINT, month STRING, sales BIGINT, dt STRING
     ) PARTITIONED BY (dt);
     INSERT INTO ${SchemaA}.test_table_13925_c0260 PARTITION (dt)
     SELECT 1, '2026-01', 100, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd')
     UNION ALL SELECT 2, '2026-02', 200, date_format(date_sub(current_date(), 1), 'yyyy-MM-dd');
     INSERT INTO ${SchemaA}.test_table_13925_c0260 PARTITION (dt)
     SELECT 3, '2026-01', 100, date_format(current_date(), 'yyyy-MM-dd')
     UNION ALL SELECT 4, '2026-02', 80, date_format(current_date(), 'yyyy-MM-dd');
# 步骤中选择异常数据分区（预期校验不通过）
- action: |-
    新建监控任务：
    * 规则名称：RuleA
    * 选择数据源：${DataSourceA}
    * 选择数据库：${SchemaA}
    * 选择数据表：test_table_13925_c0260
    选择分区：选择已有分区(dt=2026-08-05)
    抽样检查设置：百分比抽样50%
    点击「下一步」
  expected: 进入「监控规则」步骤
```

### 生成脚本

一次性 Bash 命令的每一行与所在编号行保持同一 YAML 缩进；`BASH`/`PY` 结束符复制后必须位于第 1 列，不要额外嵌套缩进。

```yaml
# 一次性 Bash 命令生成 SQL
precondition: |-
  1) 授权数据源：${DataSourceA}
  2) 数据源类型：SparkThrift2.x
  3) 存在数据库：${SchemaA}
  4) 使用以下一次性 Bash 命令生成 test_table_13925_c0260.sql：
bash <<'BASH'
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
BASH
  5) 复制 test_table_13925_c0260.sql 的内容，在 ${DataSourceA} 对应平台或底层执行

# 一次性 Bash 命令生成 CSV
precondition: |-
  1) 使用以下一次性 Bash 命令生成 rule_import_13925_c0260.csv：
bash <<'BASH'
set -euo pipefail
output_file="rule_import_13925_c0260.csv"
printf '%s\n' '* 规则名称,规则描述,* 表名,表中文名,字段名,字段中文名,* 校验SQL(请输入不符合规则要求的明细数据查询SQL)' > "${output_file}"
for ((id=1; id<=100; id++)); do
  printf '规则_%03d,规则描述_%03d,departments,部门表,amount,金额,SELECT * FROM departments WHERE id = %d\n' "${id}" "${id}" "${id}" >> "${output_file}"
done
BASH

# 一次性 Bash 命令包 Python 生成 XLSX
precondition: |-
  1) 使用以下一次性 Bash 命令生成 rule_import_13925_c0260.xlsx：
python3 - <<'PY'
from openpyxl import Workbook
workbook = Workbook()
sheet = workbook.active
sheet.title = "Sheet1"
sheet.append(["规则名称", "规则描述", "表名", "字段名", "校验SQL"])
for index in range(1, 101):
    sheet.append([f"规则_{index:03d}", f"规则描述_{index:03d}", "departments", "amount", f"SELECT * FROM departments WHERE id = {index}"])
workbook.save("rule_import_13925_c0260.xlsx")
PY
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

每个用例至少 3 个步骤；步骤不足时与其它用例合并或补充步骤，避免用例碎片化。

**表单配置项通用规则**（具体字段见 `knowledge/standards/<客户>/<模块>.md`）：
- 按前端表单**从上到下顺序**逐行列出全部配置项；不得省略、概括、改字段名
- 必填项前带 `*` 号（与前端一致），可空项占位列出值为「空」
- 一个 action = 一个完整表单；N 条规则 = N 个独立 action

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

## 客户专属规范

具体表单配置项、字段名、顺序、必填标志和级联关系属于**客户专属规范**，按客户/模块拆分存放在 `workspace/<project>/knowledge/standards/<customer>/<module>.md`。

- 文档结构模板见 [templates/standard-template.md](../templates/standard-template.md)
- 写用例前必须通过 `kata knowledge read --project <项目> --type standard --customer <客户>` 加载
- 无对应客户文件或文件落后时，先基于前端源码/DOM/知识库更新文档并报备用户，再写用例
