先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 一致性校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 一致性(CONSISTENCY=7)相关：MULTI_TABLE_DATA_UNIFORMITY(45)（多表数据一致性）
- **前端 STATISTICS_FUNC**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 CONSISTENCY、MULTI_TABLE_COMPARE）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"一致性"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 从源码**推导一致性大规则下全部小规则清单**（多表数据一致性/多表字段值比对等），逐条列出。**以源码为准**。
2. 每条小规则 ≥2 条用例（数据一致/不一致场景）。
3. 按业务流串联步骤（需配置源表 + 目标表比对）。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，需两张表：源表 + 目标对照表，数据部分一致/不一致）。

## 章节结构（严格）

```
## 数据质量
### 一致性校验
#### <小规则名称（如：多表数据一致性）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-一致性校验.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：推导出几条小规则、共几条用例。
