export const SOURCE_REFS = {
  intent: "SR-INTENT-001",
  preflight: "SR-ENV-PREFLIGHT-001",
  probeShell: "SR-UI-PROBE-001",
  probeProject: "SR-UI-PROBE-002",
  probeMenu: "SR-UI-PROBE-003",
  selfRun: "SR-SELF-RUN-001",
} as const;

export const V63_REGRESSION_SCOPE = {
  suiteName: "数据资产v6.3回归",
  archivePath: "workspace/dataAssets/features/202605-数据资产v6.3回归/archive.md",
  caseCount: 19,
  qualityProjectName: "pw_test",
  offlineProjectName: "env_rebuild_test",
  datasourceText: "SparkThrift2.x",
  datasourceName: "pw_test_HADOOP",
  databaseName: "pw_test",
  tableName: "dq_test_user_info_300",
  dqMenus: ["概览", "规则任务配置", "任务实例查询", "质量报告", "项目管理", "项目信息", "脏数据管理"],
  ruleTableHeaders: ["表", "规则名称", "类型", "数据源", "执行周期", "规则状态", "最近修改人", "操作"],
  ruleSetHeaders: ["规则名称", "规则描述", "表名", "字段名", "校验 SQL", "操作"],
  monitorObjectLabels: ["规则名称", "选择数据源", "选择数据库", "选择数据表", "数据预览"],
  qualityReportHeaders: ["表名", "所属数据源", "质量评分", "关联任务数", "关联规则数", "更新时间", "操作"],
} as const;
