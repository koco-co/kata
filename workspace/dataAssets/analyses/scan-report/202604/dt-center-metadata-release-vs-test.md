# Diff 扫描：dt-center-metadata release-6.3.x-ltqc 与 test-6.3.x-ltqc

- 输入：`origin/release-6.3.x-ltqc` 对 `origin/test-6.3.x-ltqc-v6.4.10.2`

## 结论

发现 1 个 critical 问题。

## 证据

- 扫描来源为两分支 diff；发现位置和根因保留自原始扫描结果。

## 发现

### b-001（critical）

`service/src/main/java/com/dtstack/metadata/service/sync/SyncJobStatusService.java:195`：同步任务运行中被删除后，`syncJobStatus` 触发 `NullPointerException`，可能中断后续所有 job 状态更新。

根因：新增的 `taskIdMap` 查询在 `SyncTask` 已删除时返回 null，但调用方未做 null 检测；新版 `sendPeriodSyncFailedAlert` 还直接解引用 `syncTask.getId()`。旧版本传递 `Long taskId`，不存在同样的空对象路径。

## 建议

- 对任务删除与状态更新之间的竞态增加 null-safe 分支。
- 让告警函数接收并处理 taskId，而不是无条件解引用不存在的 `SyncTask`。
- 增加“运行中任务被删除后状态更新仍可继续”的并发回归测试。
