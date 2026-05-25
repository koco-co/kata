先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 统计性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 统计性(STATISTIC=6)相关：MINUS_PERCENT(13), ZERO_PERCENT(14), PLUS_PERCENT(15), MAX_LEN(16), MIN_LEN(17), MAX(18), MIN(19), AVG(20), SUM(21), IQR_OUTLIER_COUNT(36), IQR_OUTLIER_PERCENT(37), Z_SCORE_CONFIDENCE_INTERVAL(38), FIELD_VALUE_CALCULATION_COMPARISON(47)
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 STATISTIC、OUTLIER、FIELD_CALC_COMPARE）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"统计性""异常值"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导统计性大规则下全部小规则清单**（负值比/零值比/正值比、字符串最大/最小长度、最大/最小值/平均值/总和；异常值检测[IQR离群点数量、IQR离群点占比、Z-score置信区间]；字段值计算对比等），逐条列出。**以源码为准**。
2. 每条小规则 ≥2 条用例（校验通过 + 异常/告警场景）。
3. 按业务流串联步骤。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，含统计边界数据）。

## 章节结构（严格）

```
## 数据质量
### 统计性校验
#### <小规则名称（如：最大值校验）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-统计性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
