先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 时效性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 时效性(TIMELINESS=8)相关：SINGLE_FIELD_TIME_DIFFERECE(42), TIME_MULTI_FIELD_DIFFERENCE(44), DATA_TRENDS(43 如存在)
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 TIMELINESS、SINGLE_FIELD_COMPARE、MULTIPLE_FIELD_COMPARE、DATA_TRENDS）
- **前端时效性参数**: 搜索 `TIMELINESS_COLUMN_SUPPORT_TYPES`
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"时效性""周期性""及时性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导时效性大规则下全部小规则清单**（周期性校验-单字段时间差；及时性校验-多字段时间差；数据变化趋势等），逐条列出。**以源码为准**。
2. 每条小规则 ≥2 条用例（时间在阈值内 + 超出阈值）。
3. 按业务流串联步骤。时效性字段类型约束（仅 string/all 类型）需在前置条件说明。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，含时间字段构造）。

## 章节结构（严格）

```
## 数据质量
### 时效性校验
#### <小规则名称（如：周期性校验-单字段时间差）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-时效性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
