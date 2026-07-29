# hotfix 用例 few-shot

## 正例

```md
---
type: hotfix-case
bug_id: 151429
source: "https://zentao.example/zentao/bug-view-151429.html"
keywords: "6.2 | 数据模型 | SparkThrift2.x |  | 6.2 | 任务依赖未展示相似数据源依赖"
problem_cause: ""
fix_project: ""
fix_branch: ""
fixed_version: ""
resolution: ""
---

# 【151429】验证任务依赖展示相似数据源的基础依赖信息

## 前置条件

- 账号：`${AccountA}` 具备数据地图、任务依赖和血缘关系查看权限。
- 数据：`${DataSourceA}` 的 `${SchemaA}` 中已存在表 `${TableA}`；该表的「任务依赖 → 离线任务」中有 `${TaskA}`，类型为「数据同步」，关系为「产出该表」。
- 缺陷数据：`${TableA}` 的「血缘关系 → 表级血缘」中另有 `${LineageTaskListA}`，而「任务依赖 → 离线任务」缺少 `${MissingTaskListA}`。

## 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【元数据 → 数据地图】，搜索 `${TableA}` 并打开表详情 | 表详情打开，展示「血缘关系」和「任务依赖」页签。 |
| 2 | 点击「任务依赖」页签，查看「离线任务」列表：<br>- 任务：`${TaskA}`<br>- 类型：数据同步<br>- 关系：产出该表 | 列表展示 `${TaskA}`，且类型和关系与前置条件一致。 |
| 3 | 点击「血缘关系」页签，切换到「表级血缘」，记录 `${LineageTaskListA}` | 表级血缘加载完成，展示 `${LineageTaskListA}` 中的实际依赖任务。 |
| 4 | 回到「任务依赖」页签，对比血缘任务清单与离线任务清单 | 「任务依赖」列表覆盖血缘中的实际依赖任务，`${MissingTaskListA}` 为空。 |
```

## 反例

```md
## 前置条件

当前验证环境不要求部署修复包；未部署时只采集现场证据，不得断言修复效果。

## 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 按 Bug 原始场景复现 | 修复后符合预期。 |
```
