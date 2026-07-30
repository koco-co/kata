export const SUITE_NAME = "【内置规则丰富】时效性，及时性，两个字段之间的时间差校验";

export const MONITOR_OBJECT = {
  datasourceName: "pw_test_HADOOP",
  datasourceId: 45,
  schemaName: "pw_test",
  tableName: "dq_test_user_info_300",
  primaryField: "id",
  compareFields: ["create_time", "update_time"] as const,
  additionalTimeFields: ["birth_date", "register_time", "last_login_time"] as const,
};

export const TIMELINESS_RULE = {
  ruleType: "时效性校验",
  functionName: "及时性校验",
  functionDescription: "多字段时间差校验",
  maxCompareGroups: 10,
  relationOperators: [">", "<"] as const,
  timeOperators: [">", "<", ">=", "<=", "=", "!="] as const,
  timeUnits: ["毫秒", "秒", "分钟", "小时", "天"] as const,
};
