先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 合理性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 合理性(RATIONALITY=9)相关：FIELD_VALUE_CALCULATION_COMPARISON(47)（字段值计算对比）、REASONABLE_MULTI_TABLE_COLUMN_VALUE(50)（合理性-多表字段值对比校验）
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 RATIONALITY、FIELD_CALC_COMPARE、MULTI_TABLE_FIELD_CALC_COMPARE）
- **前端合理性对比方式**: 搜索 `RATIONALITY_COMPARE_METHOD`（CALC_RESULT_COMPARE、CALC_RESULT_VALUE_JUDGE）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"合理性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导合理性大规则下全部小规则清单**（字段值计算对比-计算结果比对/计算结果值判断；多表字段值对比校验等），逐条列出。**以源码为准**。
2. 每条小规则 ≥2 条用例（合理/不合理场景）。
3. 按业务流串联步骤。合理性校验对比方式（CALC_RESULT_COMPARE vs CALC_RESULT_VALUE_JUDGE）各需用例覆盖。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，含可计算字段数据）。

## 章节结构（严格）

```
## 数据质量
### 合理性校验
#### <小规则名称（如：字段值计算对比-计算结果比对）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-合理性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
