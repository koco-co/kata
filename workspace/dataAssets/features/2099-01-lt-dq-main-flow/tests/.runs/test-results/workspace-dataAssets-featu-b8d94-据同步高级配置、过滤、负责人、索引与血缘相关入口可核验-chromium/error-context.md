# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P1/P2/P3】元数据同步高级配置、过滤、负责人、索引与血缘相关入口可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t04-metadata-sync-model-shell.ts:40:1

# Error details

```
Error: SR-2099-01-MD-SYNC-ALL-TYPES-L2009, SR-2099-01-MD-SYNC-FILTER-L2084, SR-2099-01-MD-SYNC-MANY-TABLES-L2100, SR-2099-01-MD-SYNC-EXCEPTION-L2115, SR-2099-01-MD-SYNC-OWNER-L2130, SR-2099-01-MD-SYNC-INDEX-L2150: 新增同步任务向导应展示「同步类型」

expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected substring: "同步类型"
Received string:    "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.com数据地图元数据同步元模型管理元数据管理订阅的数据元数据质量周期同步实时同步自动同步新增周期同步任务数据源数据库数据表调度周期同步状态最近一次实例状态最近同步时间操作        pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_test全部天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testltqc_standard_check_145863天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_test全部天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_MYSQLenv_rebuild_test全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPenv_rebuild_test全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testdwd_supplier_info_di,dwd_vehicle_order_di,dwd_vehicle_quality_di,quality_fail--同步完成同步完成2026-05-27 18:52:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 17:06:20查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:56:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:52:17查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:46:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdwd_voyah_dq_rule_01_main--同步完成同步完成2026-05-27 12:34:18查看实例立即同步编辑删除pw_test_STARROCKSoq008_tag_260524全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_STARROCKSoq008_metrics_260524全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testcustomer_info,order_info--同步完成同步完成2026-05-24 21:12:19查看实例立即同步编辑删除pw_test_MYSQLpw_test3全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除共 105 条数据，每页显示 20 条12345620 条/页数据源元数据同步范围数据库数据表数据表过滤   暂无数据新增周期同步任务1同步内容2调度配置选择数据数据源请选择数据源数据库数据表数据表过滤操作    请选择数据库 请选择数据表 请输入表名删除新增取 消临时同步下一步"
Timeout: 30000ms

Call log:
  - SR-2099-01-MD-SYNC-ALL-TYPES-L2009, SR-2099-01-MD-SYNC-FILTER-L2084, SR-2099-01-MD-SYNC-MANY-TABLES-L2100, SR-2099-01-MD-SYNC-EXCEPTION-L2115, SR-2099-01-MD-SYNC-OWNER-L2130, SR-2099-01-MD-SYNC-INDEX-L2150: 新增同步任务向导应展示「同步类型」 with timeout 30000ms
  - waiting for locator('body')
    5 × locator resolved to <body class="ant-scrolling-effect">…</body>
      - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.com数据地图元数据同步元模型管理元数据管理订阅的数据元数据质量周期同步实时同步自动同步新增周期同步任务数据源数据库数据表调度周期同步状态最近一次实例状态最近同步时间操作        暂无数据数据源元数据同步范围数据库数据表数据表过滤   暂无数据
                        
                        
                        
                      新增周期同步任务1同步内容2调度配置选择数据数据源请选择数据源数据库数据表数据表过滤操作    请选择数据库 请选择数据表 请输入表名删除新增取 消临时同步下一步"
    57 × locator resolved to <body class="ant-scrolling-effect">…</body>
       - unexpected value "DataAssets资产盘点元数据数据标准数据模型数据质量数据安全平台管理admin@dtstack.com数据地图元数据同步元模型管理元数据管理订阅的数据元数据质量周期同步实时同步自动同步新增周期同步任务数据源数据库数据表调度周期同步状态最近一次实例状态最近同步时间操作        pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_test全部天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testltqc_standard_check_145863天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_test全部天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPaa天同步完成未提交2026-06-03 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_MYSQLenv_rebuild_test全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPenv_rebuild_test全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testdwd_supplier_info_di,dwd_vehicle_order_di,dwd_vehicle_quality_di,quality_fail--同步完成同步完成2026-05-27 18:52:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 17:06:20查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:56:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:52:17查看实例立即同步编辑删除pw_test_HADOOPpw_testdim_voyah_vehicle_info--同步完成同步完成2026-05-27 16:46:18查看实例立即同步编辑删除pw_test_HADOOPpw_testdwd_voyah_dq_rule_01_main--同步完成同步完成2026-05-27 12:34:18查看实例立即同步编辑删除pw_test_STARROCKSoq008_tag_260524全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_STARROCKSoq008_metrics_260524全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除pw_test_HADOOPpw_testcustomer_info,order_info--同步完成同步完成2026-05-24 21:12:19查看实例立即同步编辑删除pw_test_MYSQLpw_test3全部周同步完成同步完成2026-05-30 00:00:00查看实例立即同步编辑删除共 105 条数据，每页显示 20 条12345620 条/页数据源元数据同步范围数据库数据表数据表过滤   暂无数据新增周期同步任务1同步内容2调度配置选择数据数据源请选择数据源数据库数据表数据表过滤操作    请选择数据库 请选择数据表 请输入表名删除新增取 消临时同步下一步"

```

```yaml
- banner:
  - img "logo"
  - text: DataAssets
  - menu:
    - menuitem "资产盘点":
      - link "资产盘点":
        - /url: "#/assetsStatistics"
    - menuitem "元数据":
      - link "元数据":
        - /url: "#/metaDataCenter"
    - menuitem "数据标准":
      - link "数据标准":
        - /url: "#/standardStatistic"
    - menuitem "数据模型":
      - link "数据模型":
        - /url: "#/builtSpecificationTable"
    - menuitem "数据质量":
      - link "数据质量":
        - /url: "#/dq/overview"
    - menuitem "数据安全":
      - link "数据安全":
        - /url: "#/dataAuth/permissionAssign"
    - menuitem "平台管理":
      - link "平台管理":
        - /url: "#/dataSourceManage"
  - list:
    - button:
      - img
    - link "question-circle":
      - /url: /helpSite/docs/assets/root/summary/
      - img "question-circle"
    - link "message":
      - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
      - img "message"
    - img "setting"
    - text: admin@dtstack.com
- complementary:
  - menu:
    - menuitem "数据地图":
      - link "数据地图":
        - /url: "#/metaDataCenter"
    - menuitem "元数据同步":
      - link "元数据同步":
        - /url: "#/metaDataSync"
    - menuitem "元模型管理":
      - link "元模型管理":
        - /url: "#/metaModelManage"
    - menuitem "元数据管理":
      - link "元数据管理":
        - /url: "#/manageTables"
    - menuitem "订阅的数据":
      - link "订阅的数据":
        - /url: "#/subscribeDatas"
    - menuitem "元数据质量"
- main:
  - tablist:
    - tab "周期同步" [selected]
    - tab "实时同步"
    - tab "自动同步"
  - tabpanel "周期同步":
    - textbox "请输入数据源名称进行搜索"
    - button "search":
      - img "search"
    - button "新增周期同步任务"
    - table:
      - rowgroup:
        - row "数据源 数据库 数据表 调度周期 同步状态 filter 最近一次实例状态 filter 最近同步时间 操作":
          - columnheader "数据源"
          - columnheader "数据库"
          - columnheader "数据表"
          - columnheader "调度周期"
          - columnheader "同步状态 filter":
            - text: 同步状态
            - button "filter":
              - img "filter"
          - columnheader "最近一次实例状态 filter":
            - text: 最近一次实例状态
            - button "filter":
              - img "filter"
          - columnheader "最近同步时间"
          - columnheader "操作"
    - table:
      - rowgroup:
        - row "pw_test_HADOOP a a 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "a"
          - cell "a"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test 全部 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "全部"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test ltqc_standard_check_145863 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "ltqc_standard_check_145863"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test 全部 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "全部"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP a a 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "a"
          - cell "a"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP a a 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "a"
          - cell "a"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP a a 天 同步完成 未提交 2026-06-03 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "a"
          - cell "a"
          - cell "天"
          - cell "同步完成"
          - cell "未提交"
          - cell "2026-06-03 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_MYSQL env_rebuild_test 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_MYSQL":
            - button "pw_test_MYSQL"
          - cell "env_rebuild_test"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP env_rebuild_test 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "env_rebuild_test"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dwd_supplier_info_di,dwd_vehicle_order_di,dwd_vehicle_quality_di,quality_fail -- 同步完成 同步完成 2026-05-27 18:52:18 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dwd_supplier_info_di,dwd_vehicle_order_di,dwd_vehicle_quality_di,quality_fail"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 18:52:18"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dim_voyah_vehicle_info -- 同步完成 同步完成 2026-05-27 17:06:20 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dim_voyah_vehicle_info"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 17:06:20"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dim_voyah_vehicle_info -- 同步完成 同步完成 2026-05-27 16:56:18 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dim_voyah_vehicle_info"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 16:56:18"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dim_voyah_vehicle_info -- 同步完成 同步完成 2026-05-27 16:52:17 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dim_voyah_vehicle_info"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 16:52:17"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dim_voyah_vehicle_info -- 同步完成 同步完成 2026-05-27 16:46:18 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dim_voyah_vehicle_info"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 16:46:18"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test dwd_voyah_dq_rule_01_main -- 同步完成 同步完成 2026-05-27 12:34:18 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "dwd_voyah_dq_rule_01_main"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-27 12:34:18"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_STARROCKS oq008_tag_260524 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_STARROCKS":
            - button "pw_test_STARROCKS"
          - cell "oq008_tag_260524"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_STARROCKS oq008_metrics_260524 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_STARROCKS":
            - button "pw_test_STARROCKS"
          - cell "oq008_metrics_260524"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
        - row "pw_test_HADOOP pw_test customer_info,order_info -- 同步完成 同步完成 2026-05-24 21:12:19 查看实例 立即同步 编辑 删除":
          - cell "pw_test_HADOOP":
            - button "pw_test_HADOOP"
          - cell "pw_test"
          - cell "customer_info,order_info"
          - cell "--"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-24 21:12:19"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑" [disabled]
            - separator
            - button "删除"
        - row "pw_test_MYSQL pw_test3 全部 周 同步完成 同步完成 2026-05-30 00:00:00 查看实例 立即同步 编辑 删除":
          - cell "pw_test_MYSQL":
            - button "pw_test_MYSQL"
          - cell "pw_test3"
          - cell "全部"
          - cell "周"
          - cell "同步完成"
          - cell "同步完成"
          - cell "2026-05-30 00:00:00"
          - cell "查看实例 立即同步 编辑 删除":
            - text: 查看实例
            - separator
            - button "立即同步"
            - separator
            - button "编辑"
            - separator
            - button "删除"
    - list:
      - listitem: 共 105 条数据，每页显示 20 条
      - listitem "上一页":
        - button "left" [disabled]:
          - img "left"
      - listitem "1"
      - listitem "2"
      - listitem "3"
      - listitem "4"
      - listitem "5"
      - listitem "6"
      - listitem "下一页":
        - button "right":
          - img "right"
      - listitem:
        - combobox "页码"
        - text: 20 条/页
- dialog "新增周期同步任务":
  - button "Close":
    - img "close"
  - text: 新增周期同步任务 1 同步内容 2 调度配置 选择数据 * 数据源
  - combobox "* 数据源"
  - text: 请选择数据源
  - table:
    - rowgroup:
      - row "数据库 数据表 数据表过滤 操作":
        - columnheader "数据库"
        - columnheader "数据表"
        - columnheader "数据表过滤":
          - text: 数据表过滤
          - img
        - columnheader "操作"
  - table:
    - rowgroup:
      - row "请选择数据库 请选择数据表 请输入表名 删除":
        - cell "请选择数据库":
          - combobox
          - text: 请选择数据库
        - cell "请选择数据表":
          - combobox
          - text: 请选择数据表
        - cell "请输入表名":
          - combobox
          - text: 请输入表名
        - cell "删除":
          - button "删除" [disabled]
  - button "plus-square 新增":
    - img "plus-square"
    - text: 新增
  - button "取 消"
  - button "临时同步"
  - button "下一步"
```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | import { clickButtonByText, clickMetadataMenu, expectAnyText, gotoMetadataPage, metadataScope, waitForDassetsResponse } from "./metadata-shell-page";
  4   | 
  5   | export async function openMetadataSync(page: Page, sourceRef: string): Promise<void> {
  6   |   await gotoMetadataPage(page);
  7   |   await clickMetadataMenu(page, "元数据同步");
  8   |   await expectAnyText(page, ["元数据同步", "新增周期同步任务"], sourceRef);
  9   | }
  10  | 
  11  | export async function expectSyncTaskCreateEntry(page: Page, sourceRef: string): Promise<void> {
  12  |   await openMetadataSync(page, sourceRef);
  13  |   await clickButtonByText(page, "新增周期同步任务", sourceRef);
  14  |   await expectAnyText(page, ["数据源", "数据库", "数据表", "临时同步", "下一步"], sourceRef);
  15  | }
  16  | 
  17  | export async function expectAllTypesSyncContract(page: Page, sourceRef: string): Promise<void> {
  18  |   await openMetadataSync(page, sourceRef);
  19  |   const scope = metadataScope();
  20  |   await expectAnyText(page, [scope.datasourceType, scope.datasourceName, "同步状态"], sourceRef);
  21  | }
  22  | 
  23  | export async function expectMetadataSyncShell(page: Page, sourceRef: string): Promise<void> {
  24  |   await openMetadataSync(page, sourceRef);
  25  |   await expectAnyText(
  26  |     page,
  27  |     ["周期同步", "实时同步", "自动同步", "新增周期同步任务", "数据源", "数据库", "同步状态"],
  28  |     sourceRef,
  29  |   );
  30  | }
  31  | 
  32  | export async function openMetaModel(page: Page, sourceRef: string): Promise<void> {
  33  |   await gotoMetadataPage(page);
  34  |   await clickMetadataMenu(page, "元模型管理");
  35  |   await expectAnyText(page, ["元模型管理", "元模型名称"], sourceRef);
  36  | }
  37  | 
  38  | export async function expectMetaModelCards(page: Page, sourceRef: string): Promise<void> {
  39  |   await openMetaModel(page, sourceRef);
  40  |   await expectAnyText(page, ["SparkThrift2.x", "Doris3.x", "技术属性", "通用业务属性"], sourceRef);
  41  |   const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  42  |   await expect(search, `${sourceRef}: 元模型名称搜索框应可见`).toBeVisible({ timeout: 15000 });
  43  | }
  44  | 
  45  | export async function expectMetaModelShell(page: Page, sourceRef: string): Promise<void> {
  46  |   await gotoMetadataPage(page);
  47  |   await clickMetadataMenu(page, "元模型管理");
  48  |   await expectAnyText(page, ["SparkThrift2.x 元模型", "编辑元模型"], sourceRef);
  49  |   const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  50  |   await expect(search, `${sourceRef}: 元模型搜索框应可见`).toBeVisible({ timeout: 15000 });
  51  | }
  52  | 
  53  | export async function openMetadataManagement(page: Page, sourceRef: string): Promise<void> {
  54  |   await gotoMetadataPage(page);
  55  |   await clickMetadataMenu(page, "元数据管理");
  56  |   await expectAnyText(page, ["元数据管理", "数据源"], sourceRef);
  57  | }
  58  | 
  59  | export async function expectImportMetadataDialog(page: Page, sourceRef: string): Promise<void> {
  60  |   await openMetadataManagement(page, sourceRef);
  61  |   await clickButtonByText(page, "导入元数据", sourceRef);
  62  |   await expectAnyText(page, ["导入元数据", "数据源", "上传", "确定"], sourceRef);
  63  | }
  64  | 
  65  | export async function expectMetadataManagementList(page: Page, sourceRef: string): Promise<void> {
  66  |   await openMetadataManagement(page, sourceRef);
  67  |   await waitForDassetsResponse(
  68  |     page,
  69  |     async () => {
  70  |       await clickButtonByText(page, "查询", sourceRef);
  71  |     },
  72  |     sourceRef,
  73  |     (url) => /metadata|table|list|query/i.test(url),
  74  |   );
  75  |   await expectAnyText(page, ["表名", "表中文名", "创建时间", "存储大小", "更新时间"], sourceRef);
  76  | }
  77  | 
  78  | // ─── 同步任务高级配置 Shell（t04） ───
  79  | 
  80  | export async function expectSyncTaskAdvancedOptionsShell(page: Page, sourceRef: string): Promise<void> {
  81  |   await openMetadataSync(page, sourceRef);
  82  |   // 打开新增周期同步任务向导
  83  |   await clickButtonByText(page, "新增周期同步任务", sourceRef);
  84  |   await expectAnyText(page, ["数据源", "数据库", "数据表", "下一步"], sourceRef);
  85  |   const body = page.locator("body");
  86  |   // 向导应展示多类型、过滤、负责人、索引等高级配置入口关键字
  87  |   for (const label of [
  88  |     "数据源",
  89  |     "数据库",
  90  |     "数据表",
  91  |     "同步类型",
  92  |     "下一步",
  93  |   ]) {
> 94  |     await expect(body, `${sourceRef}: 新增同步任务向导应展示「${label}」`).toContainText(label, {
      |                                                               ^ Error: SR-2099-01-MD-SYNC-ALL-TYPES-L2009, SR-2099-01-MD-SYNC-FILTER-L2084, SR-2099-01-MD-SYNC-MANY-TABLES-L2100, SR-2099-01-MD-SYNC-EXCEPTION-L2115, SR-2099-01-MD-SYNC-OWNER-L2130, SR-2099-01-MD-SYNC-INDEX-L2150: 新增同步任务向导应展示「同步类型」
  95  |       timeout: 30000,
  96  |     });
  97  |   }
  98  |   // 取消返回
  99  |   const cancelButton = page.getByRole("button", { name: /取消|关闭/ }).first();
  100 |   const cancelVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false);
  101 |   if (cancelVisible) await cancelButton.click();
  102 | }
  103 | 
  104 | // ─── 元模型管理总览搜索与统计（t38） ───
  105 | 
  106 | export async function expectMetaModelOverviewSearchAndStats(page: Page, sourceRef: string): Promise<void> {
  107 |   await openMetaModel(page, sourceRef);
  108 |   const body = page.locator("body");
  109 |   for (const label of ["SparkThrift2.x", "Doris3.x", "技术属性", "通用业务属性"]) {
  110 |     await expect(body, `${sourceRef}: 元模型首页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  111 |   }
  112 |   const search = page.locator("input[placeholder*='元模型'], input[placeholder*='搜索']").first();
  113 |   await expect(search, `${sourceRef}: 元模型搜索框应可见`).toBeVisible({ timeout: 15000 });
  114 |   // 输入搜索内容并核验结果响应
  115 |   await search.fill("SparkThrift");
  116 |   await expect(body, `${sourceRef}: 搜索应展示匹配的元模型结果`).toContainText(/SparkThrift/, {
  117 |     timeout: 15000,
  118 |   });
  119 |   await search.clear();
  120 | }
  121 | 
  122 | // ─── 元模型技术属性（t38） ───
  123 | 
  124 | export async function expectMetaModelTechnicalProperties(page: Page, sourceRef: string): Promise<void> {
  125 |   await openMetaModel(page, sourceRef);
  126 |   // 点击第一个元模型卡片进入详情
  127 |   const firstCard = page
  128 |     .locator(".ant-card, .model-card, [class*='card']")
  129 |     .filter({ hasText: /SparkThrift|Doris/ })
  130 |     .first();
  131 |   await expect(firstCard, `${sourceRef}: 元模型卡片应可见`).toBeVisible({ timeout: 15000 });
  132 |   await firstCard.click();
  133 |   const body = page.locator("body");
  134 |   await expect(body, `${sourceRef}: 元模型详情应展示技术属性`).toContainText(/技术属性/, { timeout: 30000 });
  135 |   for (const label of ["技术属性", "属性名称", "属性类型"]) {
  136 |     await expect(body, `${sourceRef}: 元模型技术属性页应展示「${label}」`).toContainText(label, {
  137 |       timeout: 30000,
  138 |     });
  139 |   }
  140 | }
  141 | 
  142 | // ─── 通用业务属性列表（t38） ───
  143 | 
  144 | export async function expectCommonBusinessPropertyList(page: Page, sourceRef: string): Promise<void> {
  145 |   await openMetaModel(page, sourceRef);
  146 |   // 进入通用业务属性
  147 |   const commonBizMenu = page.locator(".ant-menu-title-content, .ant-tabs-tab, [class*='tab']").filter({
  148 |     hasText: /通用业务属性/,
  149 |   }).first();
  150 |   await expect(commonBizMenu, `${sourceRef}: 通用业务属性入口应可见`).toBeVisible({ timeout: 15000 });
  151 |   await commonBizMenu.click();
  152 |   const body = page.locator("body");
  153 |   await expect(body, `${sourceRef}: 通用业务属性页应展示内置属性列表`).toContainText(
  154 |     /通用业务属性|属性名称|属性类型/,
  155 |     { timeout: 30000 },
  156 |   );
  157 | }
  158 | 
  159 | // ─── 通用业务属性新增弹窗 Shell（t38） ───
  160 | 
  161 | export async function expectCommonBusinessPropertyCreateShell(page: Page, sourceRef: string): Promise<void> {
  162 |   await expectCommonBusinessPropertyList(page, sourceRef);
  163 |   await clickButtonByText(page, "新增", sourceRef);
  164 |   const body = page.locator("body");
  165 |   for (const label of ["属性名称", "属性类型", "确定", "取消"]) {
  166 |     await expect(body, `${sourceRef}: 新增通用业务属性弹窗应展示「${label}」`).toContainText(label, {
  167 |       timeout: 30000,
  168 |     });
  169 |   }
  170 |   // 取消关闭
  171 |   const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  172 |   await expect(cancelButton, `${sourceRef}: 取消按钮应可见`).toBeVisible({ timeout: 10000 });
  173 |   await cancelButton.click();
  174 | }
  175 | 
  176 | // ─── 通用业务属性编辑删除生命周期 Shell（t38） ───
  177 | 
  178 | export async function expectCommonBusinessPropertyLifecycleShell(page: Page, sourceRef: string): Promise<void> {
  179 |   await expectCommonBusinessPropertyList(page, sourceRef);
  180 |   const body = page.locator("body");
  181 |   // 编辑操作列应可见
  182 |   await expect(body, `${sourceRef}: 通用业务属性列表应展示编辑/删除操作入口`).toContainText(
  183 |     /编辑|删除/,
  184 |     { timeout: 30000 },
  185 |   );
  186 |   // 点击第一个编辑
  187 |   const editButton = page.getByRole("button", { name: /编辑/ }).first();
  188 |   const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false);
  189 |   if (editVisible) {
  190 |     await editButton.click();
  191 |     await expect(body, `${sourceRef}: 编辑通用业务属性弹窗应展示属性名称`).toContainText(/属性名称/, {
  192 |       timeout: 15000,
  193 |     });
  194 |     const cancelButton = page.getByRole("button", { name: /取消/ }).last();
```