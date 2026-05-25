先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 唯一性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 唯一性(UNIQUENESS=4)相关：REPEAT_COUNT(7), REPEAT_PERCENT(8), UNIQUE_COUNT(9), UNIQUE_PERCENT(10), MULTI_TABLE_COLUMN_SINGLE(34)
- **后端唯一性子类型**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/SingleVerifyType.java`（SINGLE/REPEATABLE）
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 UNIQUENESS、UNIQUE_MULTI_TABLE）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"唯一性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导唯一性大规则下全部小规则清单**（单表字段级重复数/重复率/唯一值数/唯一值占比；多表唯一性判断 UNIQUE_MULTI_TABLE 等），逐条列出。**以源码为准**。
2. 每条小规则 ≥2 条用例（校验通过 + 有重复数据/明细展示）。
3. 按业务流串联步骤。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，含重复数据构造）。

## 章节结构（严格）

```
## 数据质量
### 唯一性校验
#### <小规则名称（如：单字段-重复数）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-唯一性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
