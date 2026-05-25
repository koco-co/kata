export const ASSETS_SOURCE_REFS = {
  lr0023: "src.case.archive.0023@1",
  lr0024: "src.case.archive.0024@1",
  lrDataMapFieldDirectory: "case.archive@1:L419-L513",
  lr0157: "src.case.archive.0157@1",
  lr0158: "src.case.archive.0158@1",
  lr0159: "src.case.archive.0159@1",
  lr0160: "src.case.archive.0160@1",
  lr0161: "src.case.archive.0161@1",
  lr0162: "src.case.archive.0162@1",
  dataMapProbe: "src.ui.lr-assets.interaction.data-map-field-click@1",
  metadataSyncProbe: "src.ui.lr-assets.interaction.metadata-sync-edit-schedule@1",
  standardCheckProbe: "src.ui.lr-assets.interaction.standard-check-new@1",
} as const;

export const ASSETS_SCOPE = {
  projectId: 92,
  projectName: "pw_test",
  sparkDataSourceName: "pw_test_HADOOP",
  sparkDataSourceLabel: "pw_test_HADOOP(SparkThrift2.x)",
  fieldResultCountText: /共\s*[1-9]\d*\s*条数据/,
  dataMapFieldFixtures: {
    customerCatalogName: "客户域",
    orderCatalogName: "订单域",
    customerTableName: "customer_info",
    orderTableName: "order_info",
    customerFields: ["cust_id", "cust_name", "cust_cert_type", "cust_cert_code", "customer_level", "update_time"],
    orderFields: ["order_id", "cust_id", "order_name", "order_amount", "order_status", "order_date"],
  },
} as const;
