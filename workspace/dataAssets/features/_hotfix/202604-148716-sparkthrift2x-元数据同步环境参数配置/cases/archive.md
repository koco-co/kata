---
suite_name: "Hotfix 用例 - 【数据资产】元数据同步时针对sparkthrift2.x数据源不支持配置环境参数"
description: "验证 Bug #148716 修复效果"
tags:
  - hotfix
  - bug-148716
create_at: "2026-04-20"
status: 草稿
origin: zentao
---

## 元数据管理

### 元数据同步

#### 周期同步

##### 【148716】验证 sparkthrift2.x 数据源在元数据同步任务中可配置并持久化环境参数

> 前置条件

```
1. 系统已引入类型为 SparkThrift2.x 的数据源（记录数据源名称，后续步骤使用）
2. 执行增量 SQL，确认 task_params 字段已存在：
   SELECT COLUMN_NAME FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = 'dt_metadata'
     AND TABLE_NAME   = 'metadata_sync_task'
     AND COLUMN_NAME  = 'task_params';
   预期返回一行记录；若无记录，手动执行：
   ALTER TABLE dt_metadata.metadata_sync_task
       ADD COLUMN `task_params` text NULL COMMENT '任务参数';
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 进入【元数据同步】，切换至「周期同步」标签页 | 页面正常展示周期同步任务列表 |
| 2 | 点击「新增周期同步任务」 | 弹出「新增周期同步任务」弹窗，第一步为「同步内容」 |
| 3 | 选择数据源：选择已引入的 SparkThrift2.x 类型数据源 | 数据源选择成功；页面在表单下方渲染出「环境参数配置」区块，展示默认环境参数模板内容（含 `spark.driver.cores`、`job.priority` 等注释行） |
| 4 | 在「环境参数配置」编辑器中追加自定义参数，例如在末尾新增一行：<br>`spark.executor.instances=2` | 编辑器实时显示追加内容，无报错 |
| 5 | 配置同步范围：选择至少一个数据库；点击「下一步」 | 成功进入第二步「调度配置」 |
| 6 | 配置调度周期：选择「天」，设定一个时间后点击「确认」提交 | 提示「新增周期同步任务成功」；任务出现在周期同步列表中 |
| 7 | 查询数据库，验证 task_params 字段已落库：<br>`SELECT task_params FROM dt_metadata.metadata_sync_task ORDER BY id DESC LIMIT 1;` | 返回结果包含步骤 4 中追加的 `spark.executor.instances=2` |
| 8 | 在列表中找到刚创建的任务，点击操作列「编辑」 | 弹出「编辑周期同步任务」弹窗；「环境参数配置」区块内容与保存时一致（含步骤 4 追加的参数） |
| 9 | 在编辑弹窗中修改环境参数，将 `spark.executor.instances=2` 改为 `spark.executor.instances=4`；点击「下一步」后点击「确认」提交 | 提示「编辑周期同步任务成功」 |
| 10 | 再次查询数据库：<br>`SELECT task_params FROM dt_metadata.metadata_sync_task ORDER BY id DESC LIMIT 1;` | task_params 已更新为包含 `spark.executor.instances=4` 的内容 |
| 11 | 在列表中点击数据源名称（或查看同步范围详情入口）展开 Drawer | Drawer 内展示「环境参数配置」只读区块，内容与步骤 9 修改后一致；内容不可编辑 |
| 12 | 回归：选择一个非 SparkThrift2.x 数据源（如 MySQL）新增周期同步任务 | 弹窗中不渲染「环境参数配置」区块 |
| 13 | 回归：对 SparkThrift2.x 数据源点击「立即同步」，确认任务正常触发 | 同步实例正常生成，实例状态流转正常，无报错 |
