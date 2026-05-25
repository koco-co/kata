先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md，严格遵守。

# 任务: 重建「数据质量 - 自定义 SQL 校验」用例片段

## 真值源（必须实际打开阅读，禁止凭记忆）

- **后端规则函数枚举**: `workspace/dataAssets/.kata/repos/customltem/dt-center-assets/common/src/main/java/com/dtstack/assets/common/enums/FunctionType.java`
  - 自定义SQL(CUSTOMSQL=5)：CUSTOM_SQL(0)
- **前端相关**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/consts/index.ts`（搜索 CUSTOMSQL）
- **前端 SQL 规则 hook**: `workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src/hooks/webs/ruleBase/useSqlRuleList.ts`（了解 SQL 规则配置选项）
- **已有用例（语义复用源）**: `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`（搜索"自定义SQL""自定义 SQL"）
- **DOM**: `workspace/dataAssets/_shared/env/ltqc-local.yaml`

## 必做

1. 自定义 SQL 类型特点：用户自行编写 SQL 语句作为规则逻辑，返回数值后与阈值比较。覆盖：
   - SQL 编写与保存（语法正确 / 语法错误）
   - SQL 模板参数（${table}、${partition} 等占位符）
   - 校验结果：SQL 返回值在阈值范围内（通过）/ 超出（告警/不通过）
   - 规则库中自定义 SQL 规则的查询、编辑、删除
2. 每条用例 ≥2 条（正向 + 反向/边界）。
3. 按业务流串联步骤（规则库→规则集→任务→校验结果）。
4. 每条用例给可执行 SQL 前置（SparkThrift2.x，含自定义 SQL 内容示例）。

## 章节结构（严格）

```
## 数据质量
### 自定义 SQL 校验
#### <功能点名称（如：SQL 规则配置与校验）>
##### 【P1】<自然中文动宾句>
...
```

## 输出文件（只写这一个）

`workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-自定义SQL.md`

末尾追加：`<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`

完成后报告：共几条用例。
