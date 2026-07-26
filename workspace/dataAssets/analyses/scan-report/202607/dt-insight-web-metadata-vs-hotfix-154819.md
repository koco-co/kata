# Diff 扫描：dt-insight-web / dt-center-metadata release-6.3.x 与 hotfix-6.3.x-154819

- 输入：`origin/release-6.3.x` 对 `origin/hotfix-6.3.x-154819`

## 结论

发现 1 个 major 问题，数据源类型缺失时行列权限校验可能 fail-open。

## 证据

- 扫描来源为两分支 diff；发现位置和根因保留自原始扫描结果。

## 发现

### b-001（major）

`service/src/main/java/com/dtstack/metadata/service/datapermission/DataPermissionService.java:1574`：缺少 `dataSourceType` 时被判定为不受控，行列权限校验可能直接放行。

根因：新增条件将“缺失/未知的数据源类型”和“明确不支持权限申请的数据源类型”合并处理，入口也没有补充 `dataSourceType` 非空校验。

## 建议

- 对缺失或未知 `dataSourceType` 采用 fail-closed，并记录明确的诊断信息。
- 将“未提供类型”和“明确不支持权限申请”拆成独立分支。
- 增加缺失、未知、支持和不支持四类数据源类型的权限回归测试。
