export const SR_2099_01_AI_001 = "SR-2099-01-AI-001";
export const SR_2099_01_AI_002 = "SR-2099-01-AI-002";

export const ASSETS_INVENTORY_SCOPE = {
  featureId: "2099-01-lt-dq-main-flow",
  archivePath: "workspace/dataAssets/features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md",
  title: "验证已接入数据源统计数据正确",
  route: "/assetsStatistics",
  projectId: 92,
  cardTitle: "已接入数据源",
} as const;

export const ASSETS_INVENTORY_CHART_SCOPE = {
  featureId: "2099-01-lt-dq-main-flow",
  archivePath: "workspace/dataAssets/features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md",
  titles: [
    "验证数据地图分布图数据正确",
    "验证数据目录分布图数据正确",
    "验证数据价值排行图数据正确",
    "验证存储资源情况图数据正确",
  ],
  route: "/assetsStatistics",
  projectId: 92,
} as const;
