export const STARROCKS3X_CONTRACT = {
  sourceRefs: {
    intent: "SR-INTENT-2026-06-DQ-SR3X-001",
    probe: "SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ",
    preflight: "runs/preflight-01/playwright/preflight/preflight.json",
  },
  project: {
    id: 1000003,
    name: "pw_sr3",
  },
  datasource: {
    assetsId: 1000046,
    centerSourceId: 1000117,
    name: "pw_sr3",
    displayText: "pw_sr3（STAR_ROCKS_3X）",
    sourceTypeId: 118,
    sourceTypeValue: "STAR_ROCKS_3X",
    sourceTypeLabel: "STAR_ROCKS_3.x",
  },
  tables: {
    dropdownEvidence: ["zszq_account_dim", "zszq_blank_rate", "zszq_multi_blank"],
  },
} as const;

