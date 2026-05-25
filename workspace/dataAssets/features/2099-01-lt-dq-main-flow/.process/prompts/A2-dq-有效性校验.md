先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 有效性校验（规范性）」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 规范性(NORMATIVE=3)相关：ENUM_COUNT(11), DISTINCT_COUNT(12), PERSONAL_ID(22), PHONE_NUMBER(23), EMAIL(24), VALUE_RANGE(25), LENGTH_STR(26), DATA_PRECISION(27), NULL_COUNT_STANDARD(28), REPEAT_COUNT_STANDARD(29), ENUM_VALUE(30), DATE_FORMAT(31), DATETIME_FORMAT(32), CUSTOM_FORMAT(33), VALUE_ENUM_RANGE(49), FORMAT_JSON_VERIFICATION(51 如存在)
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 NORMATIVE、FORMAT_IDENTITY/PHONE/EMAIL/DATE/ENUM/RANGE）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"有效性""规范性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导有效性/规范性大规则下全部小规则清单**（枚举值校验、格式校验[身份证/手机/邮箱/日期/自定义格式/JSON]、取值范围、字符串长度、数据精度、枚举值+范围组合等），逐条列出。**以源码为准，不得遗漏**。
2. 每条小规则 ≥2 条用例（校验通过 + 校验不通过/异常数据明细）。
3. 按业务流串联步骤（规则库→规则集→任务→校验结果）。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x）。

## 章节结构（严格）

```
## 数据质量
### 有效性校验
#### <小规则名称（如：格式校验-身份证号）>
##### 【P0】<自然中文动宾句>
> 前置条件
...（含 SQL 代码块）
> 操作步骤
1. ...
> 预期结果
1. ...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-有效性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
