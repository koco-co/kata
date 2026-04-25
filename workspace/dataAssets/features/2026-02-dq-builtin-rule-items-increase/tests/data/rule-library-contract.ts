export const SUITE_NAME = "【质量规则库】内置规则增加规则项";

export const SOURCE_REFS = {
  intent:
    "SR-INTENT-001 archive.md: P0 要求新增 3 个内置规则，且规则库配置/规则任务配置入口可验证。",
  env:
    "SR-ENV-001 workspace/dataAssets/_shared/env/ci63.yaml: base_url=http://172.16.122.52, tenant=hadoop2, quality_project=pw_test。",
  preflight:
    "SR-UI-PROBE-001 results/<run-id>/playwright/preflight/preflight-ci63.png: ci63 session 可进入 dataAssets，标题为 DataAssets · 数据资产。",
  ruleAdd:
    "SR-UI-PROBE-002 results/<run-id>/playwright/probe/rule-add-initial.png: ci63/pw_test 可进入新建单表校验规则页。",
  addRuleMenu:
    "SR-UI-PROBE-003 results/<run-id>/playwright/probe/rule-step2-add-menu.png: 当前添加规则菜单实测只有完整性/准确性/规范性/唯一性/自定义SQL。",
  selfRun:
    "SR-SELF-RUN-001 results/<run-id>/handoff.json: 记录 full.spec.ts 自运行命令、退出码和失败归因。",
} as const;

export const EXPECTED_RULE_BASE_TEXT = ["规则库配置", "内置规则", "导出规则库"] as const;

export const EXPECTED_NEW_RULES = [
  {
    ruleName: "及时性校验",
    explanation: "多字段时间差校验",
    category: "时效性校验",
    scope: "字段",
    description: "比较两个时间类型字段之间的时间差是否符合要求，支持校验多个字段组时间差",
  },
  {
    ruleName: "周期性校验",
    explanation: "单字段时间差校验",
    category: "时效性校验",
    scope: "字段",
    description: "比较时间字段内相邻两行数据的时间差是否符合要求",
  },
  {
    ruleName: "数据变化趋势",
    explanation: "单调递增、单调递减校验",
    category: "合理性校验",
    scope: "字段",
    description: "比较字段内数据排序后是否符合单调递增/单调递减的逻辑",
  },
] as const;

export const EXPECTED_RULE_CATEGORIES = ["时效性校验", "合理性校验"] as const;

export const MONITOR_OBJECT = {
  datasourceKeyword: "pw_test_HADOOP",
  datasourceLabel: "pw_test_HADOOP（SparkThrift2.x）",
  schemaName: "pw_test",
  tableName: "dq_monitor_4ttoaeophhq0_29415",
} as const;
