# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI + 业务记录 >> 标准管理页创建标准定义并发起标准映射
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:79:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: source-case mapping 邮箱 should be visible

SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: source-case mapping 邮箱 should be visible

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
              - generic [ref=e230]:
                - img "caret-down" [ref=e232] [cursor=pointer]:
                  - img [ref=e233]
                - generic [ref=e238]: test
        - generic [ref=e241]:
          - generic [ref=e243]:
            - generic [ref=e245]:
              - textbox "请输入标准名称进行搜索" [ref=e246]
              - button "search" [ref=e248] [cursor=pointer]:
                - img "search" [ref=e249]:
                  - img [ref=e250]
            - button "标准映射" [ref=e252] [cursor=pointer]:
              - generic [ref=e253]: 标准映射
          - generic [ref=e257]:
            - generic [ref=e258]:
              - table [ref=e260]:
                - rowgroup [ref=e267]:
                  - row "中文名称 英文名称 字段绑定(个) caret-up caret-down 最近映射时间 caret-up caret-down 操作" [ref=e268]:
                    - columnheader "中文名称" [ref=e269]
                    - columnheader "英文名称" [ref=e270]
                    - columnheader "字段绑定(个) caret-up caret-down" [ref=e271] [cursor=pointer]:
                      - generic [ref=e272]:
                        - generic [ref=e273]: 字段绑定(个)
                        - generic [ref=e275]:
                          - img "caret-up" [ref=e276]:
                            - img [ref=e277]
                          - img "caret-down" [ref=e279]:
                            - img [ref=e280]
                    - columnheader "最近映射时间 caret-up caret-down" [ref=e282] [cursor=pointer]:
                      - generic [ref=e283]:
                        - generic [ref=e284]: 最近映射时间
                        - generic [ref=e286]:
                          - img "caret-up" [ref=e287]:
                            - img [ref=e288]
                          - img "caret-down" [ref=e290]:
                            - img [ref=e291]
                    - columnheader "操作" [ref=e293]
              - table [ref=e295]:
                - rowgroup [ref=e302]:
                  - row "销售订单号 order_id 1 2026-06-18 15:18:57 映射记录 字段绑定" [ref=e303]:
                    - cell "销售订单号" [ref=e304]
                    - cell "order_id" [ref=e305]
                    - cell "1" [ref=e306]
                    - cell "2026-06-18 15:18:57" [ref=e307]
                    - cell "映射记录 字段绑定" [ref=e308]:
                      - text: 映射记录
                      - separator [ref=e309]
                      - text: 字段绑定
                  - row "车辆识别代码 vin 1 2026-06-18 15:18:57 映射记录 字段绑定" [ref=e310]:
                    - cell "车辆识别代码" [ref=e311]
                    - cell "vin" [ref=e312]
                    - cell "1" [ref=e313]
                    - cell "2026-06-18 15:18:57" [ref=e314]
                    - cell "映射记录 字段绑定" [ref=e315]:
                      - text: 映射记录
                      - separator [ref=e316]
                      - text: 字段绑定
                  - row "hh hh 0 2026-06-18 15:00:58 映射记录 字段绑定" [ref=e317]:
                    - cell "hh" [ref=e318]
                    - cell "hh" [ref=e319]
                    - cell "0" [ref=e320]
                    - cell "2026-06-18 15:00:58" [ref=e321]
                    - cell "映射记录 字段绑定" [ref=e322]:
                      - text: 映射记录
                      - separator [ref=e323]
                      - text: 字段绑定
                  - row "id id 0 2026-06-18 15:00:58 映射记录 字段绑定" [ref=e324]:
                    - cell "id" [ref=e325]
                    - cell "id" [ref=e326]
                    - cell "0" [ref=e327]
                    - cell "2026-06-18 15:00:58" [ref=e328]
                    - cell "映射记录 字段绑定" [ref=e329]:
                      - text: 映射记录
                      - separator [ref=e330]
                      - text: 字段绑定
                  - row "自动化标准_mr2z5tgx qa_auto_std_mr2z5tgx 0 2026-07-02 11:58:49 映射记录 字段绑定" [ref=e331]:
                    - cell "自动化标准_mr2z5tgx" [ref=e332]
                    - cell "qa_auto_std_mr2z5tgx" [ref=e333]
                    - cell "0" [ref=e334]
                    - cell "2026-07-02 11:58:49" [ref=e335]
                    - cell "映射记录 字段绑定" [ref=e336]:
                      - text: 映射记录
                      - separator [ref=e337]
                      - text: 字段绑定
            - list [ref=e339]:
              - listitem [ref=e340]: 共 5 条数据，每页显示 20 条
              - listitem "上一页" [ref=e341]:
                - button "left" [disabled] [ref=e342]:
                  - img "left" [ref=e343]:
                    - img [ref=e344]
              - listitem "1" [ref=e346] [cursor=pointer]:
                - generic [ref=e347]: "1"
              - listitem "下一页" [ref=e348]:
                - button "right" [disabled] [ref=e349]:
                  - img "right" [ref=e350]:
                    - img [ref=e351]
              - listitem [ref=e353]:
                - generic "页码" [ref=e354] [cursor=pointer]:
                  - generic [ref=e355]:
                    - combobox "页码" [ref=e357]
                    - generic "20 条/页" [ref=e358]
```

# Test source

```ts
  1204 |         sampledTables: [],
  1205 |       };
  1206 |     }
  1207 | 
  1208 |     const dbData = this.expectApiData(
  1209 |       "query source-case SparkThrift database",
  1210 |       await this.postJsonFromPage<ApiResponse<RuntimeDb[]>>("/dmetadata/v1/dataDb/getDbByDataSourceIds", {
  1211 |         dataSourceIds: [dataSourceId],
  1212 |       }),
  1213 |     );
  1214 |     const db = dbData.find((item) => String(item.value ?? item.dbName ?? item.name ?? "") === SOURCE_CASE_SPARKTHRIFT_DB);
  1215 |     const dbId = db?.key ?? db?.dbId ?? db?.id;
  1216 |     if (!db || dbId === undefined || dbId === null) {
  1217 |       return {
  1218 |         dataSourceName: String(datasource.dataSourceName ?? datasource.name ?? ""),
  1219 |         dataSourceId: String(dataSourceId),
  1220 |         requiredTables: SOURCE_CASE_REQUIRED_TABLES,
  1221 |         exactTables: [],
  1222 |         missingTables: [...SOURCE_CASE_REQUIRED_TABLES],
  1223 |         sampledTables: [],
  1224 |       };
  1225 |     }
  1226 | 
  1227 |     const tableData = this.expectApiData(
  1228 |       "query source-case SparkThrift tables",
  1229 |       await this.postJsonFromPage<ApiResponse<RuntimeTable[]>>("/dmetadata/v1/dataTable/getTables", { dbId }),
  1230 |     );
  1231 |     const sampledTables = tableData.map((table) => String(table.tableName ?? table.name ?? "")).filter(Boolean).slice(0, 50);
  1232 |     const exactTables: Array<{ tableName: string; tableId: string; columns: string[] }> = [];
  1233 |     for (const tableName of SOURCE_CASE_REQUIRED_TABLES) {
  1234 |       const table = tableData.find((item) => String(item.tableName ?? item.name ?? "") === tableName);
  1235 |       const tableId = table?.tableId ?? table?.id;
  1236 |       if (table && tableId !== undefined && tableId !== null) {
  1237 |         const columnsData = this.expectApiData(
  1238 |           `query columns for source-case table ${tableName}`,
  1239 |           await this.postJsonFromPage<ApiResponse<RuntimeColumn[]>>("/dmetadata/v1/dataTable/getColumns", { tableId }),
  1240 |         );
  1241 |         exactTables.push({
  1242 |           tableName,
  1243 |           tableId: String(tableId),
  1244 |           columns: columnsData.map((column) => String(column.columnName ?? column.name ?? "")).filter(Boolean),
  1245 |         });
  1246 |       }
  1247 |     }
  1248 |     const missingTables = SOURCE_CASE_REQUIRED_TABLES.filter(
  1249 |       (tableName) => !exactTables.some((table) => table.tableName === tableName),
  1250 |     );
  1251 | 
  1252 |     expect(
  1253 |       String(datasource.dataSourceName ?? datasource.name ?? ""),
  1254 |       `${sourceRef}: SparkThrift datasource should follow source case`,
  1255 |     ).toContain(SOURCE_CASE_SPARKTHRIFT_SOURCE);
  1256 | 
  1257 |     return {
  1258 |       dataSourceName: String(datasource.dataSourceName ?? datasource.name ?? ""),
  1259 |       dataSourceId: String(dataSourceId),
  1260 |       databaseName: String(db.value ?? db.dbName ?? db.name ?? ""),
  1261 |       databaseId: String(dbId),
  1262 |       requiredTables: SOURCE_CASE_REQUIRED_TABLES,
  1263 |       exactTables,
  1264 |       missingTables,
  1265 |       sampledTables,
  1266 |     };
  1267 |   }
  1268 | 
  1269 |   private async startSourceCaseStandardMapping(standard: StandardRow, sourceRef: string): Promise<CreatedPlatformRecord> {
  1270 |     const runtime = await this.getSourceCaseRuntime(sourceRef);
  1271 |     this.expectApiData(
  1272 |       `start source-case standard mapping ${standard.standardNameCn}`,
  1273 |       await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardMapping/startMapping", {
  1274 |         catalogIds: [],
  1275 |         standardIds: [standard.id],
  1276 |         dataSourceTypes: [SOURCE_CASE_SPARKTHRIFT_TYPE],
  1277 |         dataSourceIds: [runtime.dataSourceId],
  1278 |         dbIds: [runtime.dbId],
  1279 |       }),
  1280 |     );
  1281 | 
  1282 |     await expect
  1283 |       .poll(
  1284 |         async () => {
  1285 |           const data = this.expectApiData(
  1286 |             `query source-case mapping ${standard.standardNameCn}`,
  1287 |             await this.postJsonFromPage<ApiResponse<PagedListData<Record<string, unknown>>>>(
  1288 |               "/dmetadata/v1/standardMapping/mappingList",
  1289 |               {
  1290 |                 asc: false,
  1291 |                 current: 1,
  1292 |                 size: 20,
  1293 |                 search: standard.standardNameCn,
  1294 |               },
  1295 |             ),
  1296 |           );
  1297 |           return (data.contentList ?? []).some((item) => String(item.standardNameCn ?? "") === standard.standardNameCn);
  1298 |         },
  1299 |         {
  1300 |           timeout: 60_000,
  1301 |           message: `${sourceRef}: source-case mapping ${standard.standardNameCn} should be visible`,
  1302 |         },
  1303 |       )
> 1304 |       .toBe(true);
       |        ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: source-case mapping 邮箱 should be visible
  1305 | 
  1306 |     return {
  1307 |       recordType: "standard-mapping",
  1308 |       recordName: standard.standardNameCn,
  1309 |       recordId: String(standard.id),
  1310 |       recordEnglishName: standard.standardName,
  1311 |       catalogName: SOURCE_CASE_CATALOG_NAME,
  1312 |       status: "已发起映射",
  1313 |       route: "/standardMapping",
  1314 |       evidence: `步骤62/68/69：${standard.standardNameCn} 已按 SparkThrift2.x 数据源 ${runtime.dataSourceName}/库 ${runtime.dbName} 发起映射`,
  1315 |       api: "/dmetadata/v1/standardMapping/startMapping",
  1316 |     };
  1317 |   }
  1318 | 
  1319 |   private async bindSourceCaseMappedField(
  1320 |     standard: StandardRow,
  1321 |     tableName: string,
  1322 |     columnName: string,
  1323 |     sourceRef: string,
  1324 |   ): Promise<CreatedPlatformRecord> {
  1325 |     await this.startSourceCaseStandardMapping(standard, sourceRef);
  1326 |     const mappingDates = this.expectApiData(
  1327 |       `query mapping date for ${standard.standardNameCn}`,
  1328 |       await this.postJsonFromPage<ApiResponse<string[]>>("/dmetadata/v1/standardMapping/mappingDate", {
  1329 |         standardId: standard.id,
  1330 |       }),
  1331 |     );
  1332 |     const mappingDate = mappingDates?.[0];
  1333 |     if (!mappingDate) throw new Error(`${sourceRef}: no mapping date returned for ${standard.standardNameCn}`);
  1334 | 
  1335 |     let matchedRecord: MappingRecord | null = null;
  1336 |     await expect
  1337 |       .poll(
  1338 |         async () => {
  1339 |           const data = this.expectApiData(
  1340 |             `query mapping record ${tableName}.${columnName}`,
  1341 |             await this.postJsonFromPage<ApiResponse<PagedListData<MappingRecord>>>(
  1342 |               "/dmetadata/v1/standardMapping/pageQueryMappingRecord",
  1343 |               {
  1344 |                 mappingDate,
  1345 |                 standardId: standard.id,
  1346 |                 current: 1,
  1347 |                 size: 100,
  1348 |               },
  1349 |             ),
  1350 |           );
  1351 |           matchedRecord =
  1352 |             (data.contentList ?? []).find(
  1353 |               (record) => record.tableName === tableName && record.columnName === columnName && record.mappingId,
  1354 |             ) ?? null;
  1355 |           return matchedRecord?.mappingId ? String(matchedRecord.mappingId) : "";
  1356 |         },
  1357 |         {
  1358 |           timeout: 120_000,
  1359 |           message: `${sourceRef}: mapping record ${tableName}.${columnName} should be generated`,
  1360 |         },
  1361 |       )
  1362 |       .not.toBe("");
  1363 | 
  1364 |     this.expectApiData(
  1365 |       `bind mapped field ${tableName}.${columnName}`,
  1366 |       await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardMapping/bind", {
  1367 |         mappingIds: [matchedRecord!.mappingId],
  1368 |         standardId: standard.id,
  1369 |       }),
  1370 |     );
  1371 | 
  1372 |     return {
  1373 |       recordType: "standard-mapping",
  1374 |       recordName: `${standard.standardNameCn}:${tableName}.${columnName}`,
  1375 |       recordId: String(matchedRecord!.mappingId),
  1376 |       recordEnglishName: standard.standardName,
  1377 |       catalogName: SOURCE_CASE_CATALOG_NAME,
  1378 |       status: "字段已绑定",
  1379 |       route: "/standardMapping",
  1380 |       evidence: `步骤70/71：${tableName}.${columnName} 已一键绑定到 ${standard.standardNameCn}`,
  1381 |       api: "/dmetadata/v1/standardMapping/bind",
  1382 |     };
  1383 |   }
  1384 | 
  1385 |   private async getSourceCaseRuntime(sourceRef: string): Promise<{
  1386 |     dataSourceId: string;
  1387 |     dataSourceName: string;
  1388 |     dbId: string;
  1389 |     dbName: string;
  1390 |   }> {
  1391 |     const sparkThrift = await this.inspectSourceCaseSparkThrift(sourceRef);
  1392 |     if (!sparkThrift.dataSourceId || !sparkThrift.databaseId) {
  1393 |       throw new Error(`${sourceRef}: source-case SparkThrift datasource/database is not available`);
  1394 |     }
  1395 |     return {
  1396 |       dataSourceId: sparkThrift.dataSourceId,
  1397 |       dataSourceName: sparkThrift.dataSourceName ?? SOURCE_CASE_SPARKTHRIFT_SOURCE,
  1398 |       dbId: sparkThrift.databaseId,
  1399 |       dbName: sparkThrift.databaseName ?? SOURCE_CASE_SPARKTHRIFT_DB,
  1400 |     };
  1401 |   }
  1402 | 
  1403 |   private async getCodeDetail(codeId: string | number): Promise<CodeDetail> {
  1404 |     return this.expectApiData(
```