# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI + 业务记录 >> 标准管理页创建标准定义并发起标准映射
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:56:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: standard mapping record should be queryable from platform API

SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: standard mapping record should be queryable from platform API

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - img [ref=e8]
        - generic [ref=e10]:
          - img "logo" [ref=e12]
          - generic [ref=e14]: DataAssets
      - menu [ref=e17]:
        - menuitem "资产盘点" [ref=e18] [cursor=pointer]:
          - link "资产盘点" [ref=e20]:
            - /url: "#/assetsStatistics"
        - menuitem "元数据" [ref=e21] [cursor=pointer]:
          - link "元数据" [ref=e23]:
            - /url: "#/metaDataCenter"
        - menuitem "数据标准" [ref=e24] [cursor=pointer]:
          - link "数据标准" [ref=e26]:
            - /url: "#/standardStatistic"
        - menuitem "数据模型" [ref=e27] [cursor=pointer]:
          - link "数据模型" [ref=e29]:
            - /url: "#/builtSpecificationTable"
        - menuitem "数据质量" [ref=e30] [cursor=pointer]:
          - link "数据质量" [ref=e32]:
            - /url: "#/dq/overview"
        - menuitem "数据安全" [ref=e33] [cursor=pointer]:
          - link "数据安全" [ref=e35]:
            - /url: "#/dataAuth/permissionAssign"
        - menuitem "平台管理" [ref=e36] [cursor=pointer]:
          - link "平台管理" [ref=e38]:
            - /url: "#/dataSourceManage"
        - menuitem [disabled]:
          - img:
            - img
    - list [ref=e40]:
      - button [ref=e41] [cursor=pointer]:
        - img [ref=e43]
      - generic "帮助文档" [ref=e51] [cursor=pointer]:
        - link "question-circle" [ref=e52]:
          - /url: /helpSite/docs/assets/root/summary/
          - img "question-circle" [ref=e53]:
            - img [ref=e54]
      - link "message" [ref=e56] [cursor=pointer]:
        - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
        - img "message" [ref=e58]:
          - img [ref=e59]
      - img "setting" [ref=e62] [cursor=pointer]:
        - img [ref=e63]
      - generic "admin@dtstack.com" [ref=e66] [cursor=pointer]
  - generic [ref=e68]:
    - complementary [ref=e69]:
      - generic [ref=e70]:
        - img [ref=e72] [cursor=pointer]
        - menu [ref=e75]:
          - menuitem "标准统计" [ref=e76] [cursor=pointer]:
            - link "标准统计" [ref=e78]:
              - /url: "#/standardStatistic"
              - generic [ref=e79]:
                - img [ref=e80]
                - generic [ref=e83]: 标准统计
          - menuitem "标准管理" [expanded] [ref=e84] [cursor=pointer]:
            - generic [ref=e86]:
              - img [ref=e87]
              - generic [ref=e90]: 标准管理
          - list [ref=e91]:
            - menuitem "标准定义" [ref=e92] [cursor=pointer]:
              - link "标准定义" [ref=e94]:
                - /url: "#/dataStandard"
                - generic [ref=e97]: 标准定义
            - menuitem "标准映射" [ref=e98] [cursor=pointer]:
              - link "标准映射" [ref=e100]:
                - /url: "#/standardMapping"
                - generic [ref=e103]: 标准映射
            - menuitem "落标检查" [ref=e104] [cursor=pointer]:
              - link "落标检查" [ref=e106]:
                - /url: "#/standardCheck"
                - generic [ref=e109]: 落标检查
          - menuitem "标准基础" [ref=e110] [cursor=pointer]:
            - generic [ref=e112]:
              - img [ref=e113]
              - generic [ref=e116]: 标准基础
    - main [ref=e118]:
      - generic [ref=e120]:
        - generic [ref=e123]:
          - generic [ref=e124]:
            - generic [ref=e125]:
              - generic [ref=e126]: 
              - generic [ref=e127]: 标准目录
            - img [ref=e130]
          - tree [ref=e135]:
            - generic:
              - textbox "for screen reader"
            - generic [ref=e139]:
              - generic [ref=e140]:
                - img "caret-down" [ref=e142] [cursor=pointer]:
                  - img [ref=e143]
                - generic [ref=e148]: hh
              - generic [ref=e149]:
                - img "caret-down" [ref=e151] [cursor=pointer]:
                  - img [ref=e152]
                - generic [ref=e157]: qa_auto_mf_standard_mpjq0fyy
              - generic [ref=e158]:
                - img "caret-down" [ref=e160] [cursor=pointer]:
                  - img [ref=e161]
                - generic [ref=e166]: qa_auto_mf_standard_mpjq15te
              - generic [ref=e167]:
                - img "caret-down" [ref=e169] [cursor=pointer]:
                  - img [ref=e170]
                - generic [ref=e175]: qa_auto_mf_standard_mpjq6afp
              - generic [ref=e176]:
                - img "caret-down" [ref=e178] [cursor=pointer]:
                  - img [ref=e179]
                - generic [ref=e184]: qa_auto_mf_standard_mpjq8amf
              - generic [ref=e185]:
                - img "caret-down" [ref=e187] [cursor=pointer]:
                  - img [ref=e188]
                - generic [ref=e193]: qa_auto_mf_standard_mpjqd13c
              - generic [ref=e194]:
                - img "caret-down" [ref=e196] [cursor=pointer]:
                  - img [ref=e197]
                - generic [ref=e202]: qa_auto_mf_standard_mpjqjpf2
              - generic [ref=e203]:
                - img "caret-down" [ref=e205] [cursor=pointer]:
                  - img [ref=e206]
                - generic [ref=e211]: qa_auto_mf_standard_mpjx8wwj
              - generic [ref=e212]:
                - img "caret-down" [ref=e214] [cursor=pointer]:
                  - img [ref=e215]
                - generic [ref=e220]: qa_auto_mf_standard_mpjxqnhn
              - generic [ref=e221]:
                - img "caret-down" [ref=e223] [cursor=pointer]:
                  - img [ref=e224]
                - generic [ref=e229]: 自动化回归标准目录
        - generic [ref=e232]:
          - generic [ref=e234]:
            - generic [ref=e236]:
              - textbox "请输入标准名称进行搜索" [ref=e237]
              - button "search" [ref=e239] [cursor=pointer]:
                - img "search" [ref=e240]:
                  - img [ref=e241]
            - button "标准映射" [ref=e243] [cursor=pointer]:
              - generic [ref=e244]: 标准映射
          - generic [ref=e248]:
            - generic [ref=e249]:
              - table [ref=e251]:
                - rowgroup [ref=e258]:
                  - row "中文名称 英文名称 字段绑定(个) caret-up caret-down 最近映射时间 caret-up caret-down 操作" [ref=e259]:
                    - columnheader "中文名称" [ref=e260]
                    - columnheader "英文名称" [ref=e261]
                    - columnheader "字段绑定(个) caret-up caret-down" [ref=e262] [cursor=pointer]:
                      - generic [ref=e263]:
                        - generic [ref=e264]: 字段绑定(个)
                        - generic [ref=e266]:
                          - img "caret-up" [ref=e267]:
                            - img [ref=e268]
                          - img "caret-down" [ref=e270]:
                            - img [ref=e271]
                    - columnheader "最近映射时间 caret-up caret-down" [ref=e273] [cursor=pointer]:
                      - generic [ref=e274]:
                        - generic [ref=e275]: 最近映射时间
                        - generic [ref=e277]:
                          - img "caret-up" [ref=e278]:
                            - img [ref=e279]
                          - img "caret-down" [ref=e281]:
                            - img [ref=e282]
                    - columnheader "操作" [ref=e284]
              - table [ref=e286]:
                - rowgroup [ref=e293]:
                  - row "销售订单号 order_id 1 2026-06-18 15:18:57 映射记录 字段绑定" [ref=e294]:
                    - cell "销售订单号" [ref=e295]
                    - cell "order_id" [ref=e296]
                    - cell "1" [ref=e297]
                    - cell "2026-06-18 15:18:57" [ref=e298]
                    - cell "映射记录 字段绑定" [ref=e299]:
                      - text: 映射记录
                      - separator [ref=e300]
                      - text: 字段绑定
                  - row "车辆识别代码 vin 1 2026-06-18 15:18:57 映射记录 字段绑定" [ref=e301]:
                    - cell "车辆识别代码" [ref=e302]
                    - cell "vin" [ref=e303]
                    - cell "1" [ref=e304]
                    - cell "2026-06-18 15:18:57" [ref=e305]
                    - cell "映射记录 字段绑定" [ref=e306]:
                      - text: 映射记录
                      - separator [ref=e307]
                      - text: 字段绑定
                  - row "hh hh 0 2026-06-18 15:00:58 映射记录 字段绑定" [ref=e308]:
                    - cell "hh" [ref=e309]
                    - cell "hh" [ref=e310]
                    - cell "0" [ref=e311]
                    - cell "2026-06-18 15:00:58" [ref=e312]
                    - cell "映射记录 字段绑定" [ref=e313]:
                      - text: 映射记录
                      - separator [ref=e314]
                      - text: 字段绑定
                  - row "id id 0 2026-06-18 15:00:58 映射记录 字段绑定" [ref=e315]:
                    - cell "id" [ref=e316]
                    - cell "id" [ref=e317]
                    - cell "0" [ref=e318]
                    - cell "2026-06-18 15:00:58" [ref=e319]
                    - cell "映射记录 字段绑定" [ref=e320]:
                      - text: 映射记录
                      - separator [ref=e321]
                      - text: 字段绑定
            - list [ref=e323]:
              - listitem [ref=e324]: 共 4 条数据，每页显示 20 条
              - listitem "上一页" [ref=e325]:
                - button "left" [disabled] [ref=e326]:
                  - img "left" [ref=e327]:
                    - img [ref=e328]
              - listitem "1" [ref=e330] [cursor=pointer]:
                - generic [ref=e331]: "1"
              - listitem "下一页" [ref=e332]:
                - button "right" [disabled] [ref=e333]:
                  - img "right" [ref=e334]:
                    - img [ref=e335]
              - listitem [ref=e337]:
                - generic "页码" [ref=e338] [cursor=pointer]:
                  - generic [ref=e339]:
                    - combobox "页码" [ref=e341]
                    - generic "20 条/页" [ref=e342]
```

# Test source

```ts
  406 |             encodeName: "停用",
  407 |             encodeDesc: "自动化编码停用",
  408 |           },
  409 |         ],
  410 |       }),
  411 |     );
  412 | 
  413 |     const record = await this.findCodeRecord(codeName);
  414 |     await this.goto("/codeTableManage", sourceRef, ["/dmetadata/v1/standardCode/pageQuery"]);
  415 |     const createdRow = this.page.locator(".ant-table-row").filter({ hasText: codeName }).first();
  416 |     await expect(createdRow, `${sourceRef}: created code should be visible in platform`).toBeVisible({
  417 |       timeout: 30_000,
  418 |     });
  419 |     await expect(createdRow, `${sourceRef}: code row should show code number`).toContainText(codeNumber);
  420 | 
  421 |     return {
  422 |       recordType: "standard-code",
  423 |       recordName: codeName,
  424 |       recordId: String(record.id),
  425 |       recordEnglishName: codeNumber,
  426 |       catalogName: CODE_CATALOG_NAME,
  427 |       status: "已创建",
  428 |       route: "/codeTableManage",
  429 |       evidence: "码表管理列表新增记录",
  430 |       api: "/dmetadata/v1/standardCode/addOrUpdateCode",
  431 |     };
  432 |   }
  433 | 
  434 |   async createDatabaseCollectionRecords(sourceRef: string): Promise<CreatedPlatformRecord[]> {
  435 |     await this.goto("/databaseCollect", sourceRef, ["/dmetadata/v1/databaseCollection/pageQueryCollection"]);
  436 |     const existingCollectionIds = new Set((await this.listDatabaseCollections()).map((record) => String(record.id)));
  437 | 
  438 |     const rootCollection = await this.createDatabaseCollection("词根管理", existingCollectionIds, sourceRef);
  439 |     existingCollectionIds.add(String(rootCollection.id));
  440 |     const standardCollection = await this.createDatabaseCollection("数据标准", existingCollectionIds, sourceRef);
  441 | 
  442 |     const completedRoot = await this.waitForDatabaseCollectionComplete(rootCollection.id, sourceRef);
  443 |     const completedStandard = await this.waitForDatabaseCollectionComplete(standardCollection.id, sourceRef);
  444 |     await this.expectDatabaseCollectionRow(completedRoot, "词根管理", sourceRef);
  445 |     await this.expectDatabaseCollectionRow(completedStandard, "数据标准", sourceRef);
  446 | 
  447 |     return [
  448 |       this.toDatabaseCollectionPlatformRecord(completedRoot, "词根管理"),
  449 |       this.toDatabaseCollectionPlatformRecord(completedStandard, "数据标准"),
  450 |     ];
  451 |   }
  452 | 
  453 |   async createStandardMappingRecord(
  454 |     sourceRef: string,
  455 |     standardRecord: CreatedPlatformRecord,
  456 |   ): Promise<CreatedPlatformRecord> {
  457 |     await this.goto("/standardMapping", sourceRef, [
  458 |       "/dmetadata/v1/standardMapping/mappingList",
  459 |       "/dmetadata/v1/standardCatalog/listCatalog",
  460 |     ]);
  461 |     const standard = await this.findStandardRecord(standardRecord.recordName);
  462 |     const datasourceType = this.activeDatasourceType();
  463 |     const datasource = await this.findRuntimeDatasource(datasourceType);
  464 |     const datasourceId = datasource.dataSourceId ?? datasource.id;
  465 |     if (datasourceId === undefined || datasourceId === null) {
  466 |       throw new Error(`No datasource id returned for datasource type ${datasourceType}`);
  467 |     }
  468 |     const db = await this.findRuntimeDb(datasourceId, sourceRef);
  469 |     const dbId = db.key ?? db.dbId ?? db.id;
  470 |     if (dbId === undefined || dbId === null) {
  471 |       throw new Error(`No database id returned for datasource ${datasourceId}`);
  472 |     }
  473 | 
  474 |     this.expectApiData(
  475 |       "start standard mapping",
  476 |       await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardMapping/startMapping", {
  477 |         standardIds: [standard.id],
  478 |         dataSourceTypes: [datasourceType],
  479 |         dataSourceIds: [datasourceId],
  480 |         dbIds: [dbId],
  481 |       }),
  482 |     );
  483 | 
  484 |     await expect
  485 |       .poll(
  486 |         async () => {
  487 |           const data = this.expectApiData(
  488 |             "query standard mapping",
  489 |             await this.postJsonFromPage<ApiResponse<PagedListData<Record<string, unknown>>>>(
  490 |               "/dmetadata/v1/standardMapping/mappingList",
  491 |               {
  492 |                 asc: false,
  493 |                 current: 1,
  494 |                 size: 20,
  495 |                 search: standardRecord.recordName,
  496 |               },
  497 |             ),
  498 |           );
  499 |           return (data.contentList ?? []).some((item) => String(item.standardNameCn ?? "") === standardRecord.recordName);
  500 |         },
  501 |         {
  502 |           timeout: 60_000,
  503 |           message: `${sourceRef}: standard mapping record should be queryable from platform API`,
  504 |         },
  505 |       )
> 506 |       .toBe(true);
      |        ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: standard mapping record should be queryable from platform API
  507 | 
  508 |     await this.goto("/standardMapping", sourceRef, ["/dmetadata/v1/standardMapping/mappingList"]);
  509 |     const createdRow = this.page.locator(".ant-table-row").filter({ hasText: standardRecord.recordName }).first();
  510 |     await expect(createdRow, `${sourceRef}: mapped standard should be visible in platform`).toBeVisible({
  511 |       timeout: 30_000,
  512 |     });
  513 | 
  514 |     return {
  515 |       recordType: "standard-mapping",
  516 |       recordName: standardRecord.recordName,
  517 |       recordId: String(standard.id),
  518 |       recordEnglishName: standard.standardName,
  519 |       status: "已发起映射",
  520 |       route: "/standardMapping",
  521 |       evidence: `标准映射列表产生 ${standardRecord.recordName} 映射记录`,
  522 |       api: "/dmetadata/v1/standardMapping/startMapping",
  523 |     };
  524 |   }
  525 | 
  526 |   async expectStandardMapping(sourceRef: string): Promise<void> {
  527 |     await this.goto("/standardMapping", sourceRef, [
  528 |       "/dmetadata/v1/standardMapping/mappingList",
  529 |       "/dmetadata/v1/standardCatalog/listCatalog",
  530 |     ]);
  531 |     await this.expectBodyTexts(sourceRef, ["标准映射", "标准目录"]);
  532 |     await expect(
  533 |       this.page.getByRole("button", { name: looseLabel("标准映射") }).first(),
  534 |       `${sourceRef}: standard mapping button should be visible`,
  535 |     ).toBeVisible({ timeout: 20_000 });
  536 |     await this.expectTableHeaders(sourceRef, ["中文名称", "英文名称", "字段绑定(个)", "最近映射时间", "操作"]);
  537 |   }
  538 | 
  539 |   async expectStandardCheck(sourceRef: string): Promise<void> {
  540 |     await this.goto("/standardCheck", sourceRef, [
  541 |       "/dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource",
  542 |       "/dmetadata/v1/standardTableCheck/overview",
  543 |       "/dmetadata/v1/standardTableCheck/list",
  544 |     ]);
  545 |     await this.expectBodyTexts(sourceRef, [
  546 |       "落标检查总览",
  547 |       "检查数据表",
  548 |       "标准达标率",
  549 |       "检查字段总数",
  550 |       "达标字段数",
  551 |       "落标检查设置",
  552 |       "落标检查结果",
  553 |       "新增检查任务",
  554 |       "批量开启",
  555 |       "批量关闭",
  556 |     ]);
  557 |     await this.expectTableHeaders(sourceRef, [
  558 |       "数据表名称",
  559 |       "所属数据源",
  560 |       "所属数据库",
  561 |       "检查字段数/总字段数",
  562 |       "检查周期",
  563 |       "检查状态",
  564 |       "标准达标率",
  565 |       "不达标字段数/检查失败数",
  566 |       "最近编辑时间",
  567 |       "最近检查时间",
  568 |       "操作",
  569 |     ]);
  570 |   }
  571 | 
  572 |   async expectStandardCheckAddEntry(sourceRef: string): Promise<void> {
  573 |     await this.expectStandardCheck(sourceRef);
  574 |     await this.page.getByRole("button", { name: "新增检查任务" }).click();
  575 |     await expect(this.body(), `${sourceRef}: add check task should expose content configuration`).toContainText(
  576 |       /数据源|数据库|数据表|标准目录|下一步|取消/,
  577 |       { timeout: 30_000 },
  578 |     );
  579 |   }
  580 | 
  581 |   private async installProjectContext(): Promise<void> {
  582 |     const id = String(projectId());
  583 |     await this.page.addInitScript(
  584 |       ({ keys, value }: { keys: readonly string[]; value: string }) => {
  585 |         for (const key of keys) window.sessionStorage.setItem(key, value);
  586 |       },
  587 |       { keys: [...PROJECT_STORAGE_KEYS], value: id },
  588 |     );
  589 |   }
  590 | 
  591 |   private async applyProjectContext(): Promise<void> {
  592 |     const id = String(projectId());
  593 |     await this.page.evaluate(
  594 |       ({ keys, value }: { keys: readonly string[]; value: string }) => {
  595 |         for (const key of keys) window.sessionStorage.setItem(key, value);
  596 |       },
  597 |       { keys: [...PROJECT_STORAGE_KEYS], value: id },
  598 |     );
  599 |   }
  600 | 
  601 |   private async expectBodyTexts(sourceRef: string, labels: readonly string[]): Promise<void> {
  602 |     for (const label of labels) {
  603 |       await expect(this.body(), `${sourceRef}: body should contain ${label}`).toContainText(label, {
  604 |         timeout: 30_000,
  605 |       });
  606 |     }
```