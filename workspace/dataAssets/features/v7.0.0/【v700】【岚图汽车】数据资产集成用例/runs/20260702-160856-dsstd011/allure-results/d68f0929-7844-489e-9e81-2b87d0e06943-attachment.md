# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI + 业务记录 >> 落标检查页覆盖总览、设置/结果列表和新增检查任务入口
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:102:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: 「数据标准」模块集成测试用例#步骤75-86 should finish with status 2

SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: 「数据标准」模块集成测试用例#步骤75-86 should finish with status 2

expect(received).toBe(expected) // Object.is equality

Expected: "2"
Received: "PENDING:1"

Call Log:
- Timeout 300000ms exceeded while waiting on the predicate
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
      - generic [ref=e119]:
        - paragraph [ref=e120]: 落标检查总览
        - generic [ref=e123]:
          - generic [ref=e124]:
            - paragraph [ref=e125]: 检查数据表
            - paragraph [ref=e126]: "1"
            - generic [ref=e128]: "标准达标率: 0%"
          - generic [ref=e129]:
            - generic [ref=e131]:
              - paragraph [ref=e132]: 检查字段总数
              - paragraph [ref=e133]: "2"
            - generic [ref=e136]:
              - paragraph [ref=e137]: 达标字段数
              - paragraph [ref=e138]: "0"
        - generic [ref=e139]:
          - generic [ref=e140]:
            - tablist [ref=e141]:
              - generic [ref=e143]:
                - tab "落标检查设置" [selected] [ref=e145] [cursor=pointer]
                - tab "落标检查结果" [ref=e147] [cursor=pointer]
            - generic:
              - generic:
                - tabpanel "落标检查设置"
          - generic [ref=e149]:
            - generic [ref=e151]:
              - generic [ref=e154]:
                - textbox "请输入数据表名/字段名搜索" [ref=e156]
                - button "search" [ref=e159] [cursor=pointer]:
                  - img "search" [ref=e160]:
                    - img [ref=e161]
              - button "新增检查任务" [ref=e164] [cursor=pointer]:
                - generic [ref=e165]: 新增检查任务
            - generic [ref=e169]:
              - generic [ref=e170]:
                - table [ref=e172]:
                  - rowgroup [ref=e186]:
                    - row "数据表名称 所属数据源 filter 所属数据库 filter 检查字段数/总字段数 检查周期 检查状态 filter 标准达标率 不达标字段数/检查失败数 最近编辑时间 caret-up caret-down 最近检查时间 caret-up caret-down 操作" [ref=e187]:
                      - columnheader [ref=e188]:
                        - checkbox [ref=e192] [cursor=pointer]
                      - columnheader "数据表名称" [ref=e194]
                      - columnheader "所属数据源 filter" [ref=e195]:
                        - generic [ref=e196]:
                          - generic [ref=e197]: 所属数据源
                          - button "filter" [ref=e198] [cursor=pointer]:
                            - img "filter" [ref=e199]:
                              - img [ref=e200]
                      - columnheader "所属数据库 filter" [ref=e202]:
                        - generic [ref=e203]:
                          - generic [ref=e204]: 所属数据库
                          - button "filter" [ref=e205] [cursor=pointer]:
                            - img "filter" [ref=e206]:
                              - img [ref=e207]
                      - columnheader "检查字段数/总字段数" [ref=e209]
                      - columnheader "检查周期" [ref=e210]
                      - columnheader "检查状态 filter" [ref=e211]:
                        - generic [ref=e212]:
                          - generic [ref=e213]: 检查状态
                          - button "filter" [ref=e214] [cursor=pointer]:
                            - img "filter" [ref=e215]:
                              - img [ref=e216]
                      - columnheader "标准达标率" [ref=e218]
                      - columnheader "不达标字段数/检查失败数" [ref=e219]
                      - columnheader "最近编辑时间 caret-up caret-down" [ref=e220] [cursor=pointer]:
                        - generic [ref=e221]:
                          - generic [ref=e222]: 最近编辑时间
                          - generic [ref=e224]:
                            - img "caret-up" [ref=e225]:
                              - img [ref=e226]
                            - img "caret-down" [ref=e228]:
                              - img [ref=e229]
                      - columnheader "最近检查时间 caret-up caret-down" [ref=e231] [cursor=pointer]:
                        - generic [ref=e232]:
                          - generic [ref=e233]: 最近检查时间
                          - generic [ref=e235]:
                            - img "caret-up" [ref=e236]:
                              - img [ref=e237]
                            - img "caret-down" [ref=e239]:
                              - img [ref=e240]
                      - columnheader "操作" [ref=e242]
                - table [ref=e244]:
                  - rowgroup [ref=e258]:
                    - row "dwd_voyah_dq_rule_01_main -- pw_test 2/24 天 已关闭检查 0% 0/2 2026-06-18 15:44:59 2026-06-18 16:51:18 编辑 查看检查结果 删除" [ref=e259]:
                      - cell [ref=e260]:
                        - checkbox [ref=e263] [cursor=pointer]
                      - cell "dwd_voyah_dq_rule_01_main" [ref=e265]:
                        - generic [ref=e267] [cursor=pointer]: dwd_voyah_dq_rule_01_main
                      - cell "--" [ref=e268]:
                        - generic [ref=e269]: "--"
                      - cell "pw_test" [ref=e270]:
                        - generic [ref=e271]: pw_test
                      - cell "2/24" [ref=e272]
                      - cell "天" [ref=e273]
                      - cell "已关闭检查" [ref=e274]
                      - cell "0%" [ref=e275]
                      - cell "0/2" [ref=e276]
                      - cell "2026-06-18 15:44:59" [ref=e277]
                      - cell "2026-06-18 16:51:18" [ref=e278]
                      - cell "编辑 查看检查结果 删除" [ref=e279]:
                        - generic [ref=e280]:
                          - button "编辑" [ref=e281] [cursor=pointer]:
                            - generic [ref=e282]: 编辑
                          - separator [ref=e283]
                          - button "查看检查结果" [ref=e284] [cursor=pointer]:
                            - generic [ref=e285]: 查看检查结果
                          - separator [ref=e286]
                          - button "删除" [ref=e287] [cursor=pointer]:
                            - generic [ref=e288]: 删除
              - generic [ref=e290]:
                - generic [ref=e291]:
                  - checkbox [ref=e294] [cursor=pointer]
                  - generic [ref=e296]: 当前选中:0
                  - generic [ref=e297]:
                    - button "批量开启" [disabled] [ref=e299]:
                      - generic: 批量开启
                    - button "批量关闭" [disabled] [ref=e301]:
                      - generic: 批量关闭
                - list [ref=e302]:
                  - listitem [ref=e303]: 共 1 条数据，每页显示 10 条
                  - listitem "上一页" [ref=e304]:
                    - button "left" [disabled] [ref=e305]:
                      - img "left" [ref=e306]:
                        - img [ref=e307]
                  - listitem "1" [ref=e309] [cursor=pointer]:
                    - generic [ref=e310]: "1"
                  - listitem "下一页" [ref=e311]:
                    - button "right" [disabled] [ref=e312]:
                      - img "right" [ref=e313]:
                        - img [ref=e314]
                  - listitem [ref=e316]:
                    - generic "页码" [ref=e317] [cursor=pointer]:
                      - generic [ref=e318]:
                        - combobox "页码" [ref=e320]
                        - generic "10 条/页" [ref=e321]
```

# Test source

```ts
  1391 |   private async listStandardCheckTasks(tableName: string): Promise<StandardCheckTaskRecord[]> {
  1392 |     const data = this.expectApiData(
  1393 |       `list standard check tasks ${tableName}`,
  1394 |       await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckTaskRecord>>>(
  1395 |         "/dmetadata/v1/standardTableCheck/list",
  1396 |         {
  1397 |           asc: false,
  1398 |           current: 1,
  1399 |           size: 100,
  1400 |           search: tableName,
  1401 |         },
  1402 |       ),
  1403 |     );
  1404 |     return data.contentList ?? [];
  1405 |   }
  1406 | 
  1407 |   private async deleteExistingStandardCheckTasksForTable(
  1408 |     tableId: string | number,
  1409 |     tableName: string,
  1410 |     sourceRef: string,
  1411 |   ): Promise<void> {
  1412 |     const existingTasks = (await this.listStandardCheckTasks(tableName)).filter(
  1413 |       (task) => task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
  1414 |     );
  1415 |     for (const task of existingTasks) {
  1416 |       if (task.id !== undefined) await this.deleteStandardCheckTask(task.id, { tableName, columnName: "" }, sourceRef);
  1417 |     }
  1418 |     if (existingTasks.length === 0) return;
  1419 | 
  1420 |     await expect
  1421 |       .poll(
  1422 |         async () =>
  1423 |           (await this.listStandardCheckTasks(tableName)).filter(
  1424 |             (task) => task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
  1425 |           ).length,
  1426 |         {
  1427 |           timeout: 60_000,
  1428 |           message: `${sourceRef}: existing standard check tasks for ${tableName} should be deleted`,
  1429 |         },
  1430 |       )
  1431 |       .toBe(0);
  1432 |   }
  1433 | 
  1434 |   private async deleteStandardCheckTask(
  1435 |     taskId: string | number,
  1436 |     scenario: { tableName: string; columnName?: string },
  1437 |     sourceRef: string,
  1438 |   ): Promise<void> {
  1439 |     this.expectApiData(
  1440 |       `delete standard check task ${taskId}`,
  1441 |       await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardTableCheck/delete", {
  1442 |         id: taskId,
  1443 |       }),
  1444 |     );
  1445 |     await expect
  1446 |       .poll(
  1447 |         async () => (await this.listStandardCheckTasks(scenario.tableName)).some((task) => String(task.id) === String(taskId)),
  1448 |         {
  1449 |           timeout: 60_000,
  1450 |           message: `${sourceRef}: standard check task ${scenario.tableName}.${scenario.columnName ?? "*"} should be deleted`,
  1451 |         },
  1452 |       )
  1453 |       .toBe(false);
  1454 |   }
  1455 | 
  1456 |   private async waitForStandardCheckExecution(
  1457 |     taskId: string | number,
  1458 |     scenario: StandardCheckScenario,
  1459 |     sourceRef: string,
  1460 |   ): Promise<StandardCheckRunRecord> {
  1461 |     let latestRecord: StandardCheckRunRecord | null = null;
  1462 |     await expect
  1463 |       .poll(
  1464 |         async () => {
  1465 |           const data = this.expectApiData(
  1466 |             `poll standard check execution ${taskId}`,
  1467 |             await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckRunRecord>>>(
  1468 |               "/dmetadata/v1/standardTableCheck/checkRecordListByStandardTableCheckId",
  1469 |               {
  1470 |                 asc: false,
  1471 |                 current: 1,
  1472 |                 size: 20,
  1473 |                 standardTableCheckId: taskId,
  1474 |               },
  1475 |             ),
  1476 |           );
  1477 |           latestRecord =
  1478 |             (data.contentList ?? []).find((record) => record.tableName === scenario.tableName) ??
  1479 |             (data.contentList ?? [])[0] ??
  1480 |             null;
  1481 |           if (!latestRecord || latestRecord.status === undefined) return "NO_RECORD";
  1482 |           const status = Number(latestRecord.status);
  1483 |           return STANDARD_CHECK_TERMINAL_STATUSES.has(status) ? String(status) : `PENDING:${status}`;
  1484 |         },
  1485 |         {
  1486 |           timeout: 300_000,
  1487 |           intervals: [2_000, 3_000, 5_000, 10_000],
  1488 |           message: `${sourceRef}: ${scenario.caseId} should finish with status ${scenario.expected.status}`,
  1489 |         },
  1490 |       )
> 1491 |       .toBe(String(scenario.expected.status));
       |        ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: 「数据标准」模块集成测试用例#步骤75-86 should finish with status 2
  1492 |     return latestRecord as StandardCheckRunRecord;
  1493 |   }
  1494 | 
  1495 |   private async waitForStandardCheckTaskListResult(
  1496 |     taskId: string | number,
  1497 |     scenario: StandardCheckScenario,
  1498 |     sourceRef: string,
  1499 |   ): Promise<StandardCheckTaskRecord> {
  1500 |     let latestTask: StandardCheckTaskRecord | null = null;
  1501 |     await expect
  1502 |       .poll(
  1503 |         async () => {
  1504 |           latestTask =
  1505 |             (await this.listStandardCheckTasks(scenario.tableName)).find((task) => String(task.id) === String(taskId)) ??
  1506 |             null;
  1507 |           if (!latestTask || latestTask.quality === null || latestTask.quality === undefined) return "NO_TASK";
  1508 |           return `${Number(latestTask.quality)}:${Number(latestTask.noComplianceCount ?? -1)}:${Number(
  1509 |             latestTask.checkFailCount ?? -1,
  1510 |           )}`;
  1511 |         },
  1512 |         {
  1513 |           timeout: 120_000,
  1514 |           intervals: [2_000, 3_000, 5_000],
  1515 |           message: `${sourceRef}: ${scenario.caseId} should update standard check task list metrics`,
  1516 |         },
  1517 |       )
  1518 |       .toBe(
  1519 |         `${scenario.expected.quality}:${scenario.expected.noComplianceCount}:${scenario.expected.checkFailCount}`,
  1520 |       );
  1521 |     return latestTask as StandardCheckTaskRecord;
  1522 |   }
  1523 | 
  1524 |   private async waitForStandardCheckColumnResult(
  1525 |     runtime: { dataSourceId: string; dbName: string },
  1526 |     scenario: StandardCheckScenario,
  1527 |     sourceRef: string,
  1528 |   ): Promise<StandardCheckColumnRecord> {
  1529 |     let latestColumn: StandardCheckColumnRecord | null = null;
  1530 |     await expect
  1531 |       .poll(
  1532 |         async () => {
  1533 |           const data = this.expectApiData(
  1534 |             `poll standard check column ${scenario.tableName}.${scenario.columnName}`,
  1535 |             await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckColumnRecord>>>(
  1536 |               "/dmetadata/v1/standardTableCheck/standardCheckColumns",
  1537 |               {
  1538 |                 asc: false,
  1539 |                 current: 1,
  1540 |                 size: 20,
  1541 |                 dataSourceId: runtime.dataSourceId,
  1542 |                 schema: runtime.dbName,
  1543 |                 tableName: scenario.tableName,
  1544 |                 columnName: scenario.columnName,
  1545 |                 status: [scenario.expected.status],
  1546 |                 upStandard: [scenario.expected.upStandard],
  1547 |               },
  1548 |             ),
  1549 |           );
  1550 |           latestColumn =
  1551 |             (data.contentList ?? []).find(
  1552 |               (record) =>
  1553 |                 record.tableName === scenario.tableName &&
  1554 |                 record.columnName === scenario.columnName &&
  1555 |                 Number(record.upStandard) === scenario.expected.upStandard,
  1556 |             ) ?? null;
  1557 |           if (!latestColumn || latestColumn.status === undefined) return "NO_COLUMN";
  1558 |           return `${Number(latestColumn.status)}:${Number(latestColumn.upStandard)}`;
  1559 |         },
  1560 |         {
  1561 |           timeout: 120_000,
  1562 |           intervals: [2_000, 3_000, 5_000],
  1563 |           message: `${sourceRef}: ${scenario.caseId} should produce column result ${scenario.expected.label}`,
  1564 |         },
  1565 |       )
  1566 |       .toBe(`${scenario.expected.status}:${scenario.expected.upStandard}`);
  1567 |     return latestColumn as StandardCheckColumnRecord;
  1568 |   }
  1569 | 
  1570 |   private assertStandardCheckMetrics(
  1571 |     record: StandardCheckTaskRecord | StandardCheckRunRecord,
  1572 |     scenario: StandardCheckScenario,
  1573 |     sourceRef: string,
  1574 |   ): void {
  1575 |     expect(Number(record.quality), `${sourceRef}: ${scenario.caseId} quality`).toBe(scenario.expected.quality);
  1576 |     expect(Number(record.noComplianceCount), `${sourceRef}: ${scenario.caseId} noComplianceCount`).toBe(
  1577 |       scenario.expected.noComplianceCount,
  1578 |     );
  1579 |     expect(Number(record.checkFailCount), `${sourceRef}: ${scenario.caseId} checkFailCount`).toBe(
  1580 |       scenario.expected.checkFailCount,
  1581 |     );
  1582 |   }
  1583 | 
  1584 |   private assertStandardCheckColumn(
  1585 |     record: StandardCheckColumnRecord,
  1586 |     scenario: StandardCheckScenario,
  1587 |     sourceRef: string,
  1588 |   ): void {
  1589 |     expect(Number(record.status), `${sourceRef}: ${scenario.caseId} column status`).toBe(scenario.expected.status);
  1590 |     expect(Number(record.upStandard), `${sourceRef}: ${scenario.caseId} column upStandard`).toBe(
  1591 |       scenario.expected.upStandard,
```