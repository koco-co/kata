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
- Timeout 600000ms exceeded while waiting on the predicate
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
            - paragraph [ref=e126]: "2"
            - generic [ref=e128]: "标准达标率: 0%"
          - generic [ref=e129]:
            - generic [ref=e131]:
              - paragraph [ref=e132]: 检查字段总数
              - paragraph [ref=e133]: "3"
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
                    - row "test_info_1 pw_test_HADOOP pw_test 1/4 天 已开启检查 -- -- 2026-07-02 19:06:52 -- 编辑 查看检查结果 删除" [ref=e259]:
                      - cell [ref=e260]:
                        - checkbox [ref=e263] [cursor=pointer]
                      - cell "test_info_1" [ref=e265]:
                        - generic [ref=e267] [cursor=pointer]: test_info_1
                      - cell "pw_test_HADOOP" [ref=e268]:
                        - generic [ref=e269]: pw_test_HADOOP
                      - cell "pw_test" [ref=e270]:
                        - generic [ref=e271]: pw_test
                      - cell "1/4" [ref=e272]
                      - cell "天" [ref=e273]
                      - cell "已开启检查" [ref=e274]
                      - cell "--" [ref=e275]
                      - cell "--" [ref=e276]
                      - cell "2026-07-02 19:06:52" [ref=e277]
                      - cell "--" [ref=e278]
                      - cell "编辑 查看检查结果 删除" [ref=e279]:
                        - generic [ref=e280]:
                          - button "编辑" [ref=e281] [cursor=pointer]:
                            - generic [ref=e282]: 编辑
                          - separator [ref=e283]
                          - button "查看检查结果" [disabled] [ref=e284]:
                            - generic: 查看检查结果
                          - separator [ref=e285]
                          - button "删除" [ref=e286] [cursor=pointer]:
                            - generic [ref=e287]: 删除
                    - row "dwd_voyah_dq_rule_01_main -- pw_test 2/24 天 已关闭检查 0% 0/2 2026-06-18 15:44:59 2026-06-18 16:51:18 编辑 查看检查结果 删除" [ref=e288]:
                      - cell [ref=e289]:
                        - checkbox [ref=e292] [cursor=pointer]
                      - cell "dwd_voyah_dq_rule_01_main" [ref=e294]:
                        - generic [ref=e296] [cursor=pointer]: dwd_voyah_dq_rule_01_main
                      - cell "--" [ref=e297]:
                        - generic [ref=e298]: "--"
                      - cell "pw_test" [ref=e299]:
                        - generic [ref=e300]: pw_test
                      - cell "2/24" [ref=e301]
                      - cell "天" [ref=e302]
                      - cell "已关闭检查" [ref=e303]
                      - cell "0%" [ref=e304]
                      - cell "0/2" [ref=e305]
                      - cell "2026-06-18 15:44:59" [ref=e306]
                      - cell "2026-06-18 16:51:18" [ref=e307]
                      - cell "编辑 查看检查结果 删除" [ref=e308]:
                        - generic [ref=e309]:
                          - button "编辑" [ref=e310] [cursor=pointer]:
                            - generic [ref=e311]: 编辑
                          - separator [ref=e312]
                          - button "查看检查结果" [ref=e313] [cursor=pointer]:
                            - generic [ref=e314]: 查看检查结果
                          - separator [ref=e315]
                          - button "删除" [ref=e316] [cursor=pointer]:
                            - generic [ref=e317]: 删除
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - checkbox [ref=e323] [cursor=pointer]
                  - generic [ref=e325]: 当前选中:0
                  - generic [ref=e326]:
                    - button "批量开启" [disabled] [ref=e328]:
                      - generic: 批量开启
                    - button "批量关闭" [disabled] [ref=e330]:
                      - generic: 批量关闭
                - list [ref=e331]:
                  - listitem [ref=e332]: 共 2 条数据，每页显示 10 条
                  - listitem "上一页" [ref=e333]:
                    - button "left" [disabled] [ref=e334]:
                      - img "left" [ref=e335]:
                        - img [ref=e336]
                  - listitem "1" [ref=e338] [cursor=pointer]:
                    - generic [ref=e339]: "1"
                  - listitem "下一页" [ref=e340]:
                    - button "right" [disabled] [ref=e341]:
                      - img "right" [ref=e342]:
                        - img [ref=e343]
                  - listitem [ref=e345]:
                    - generic "页码" [ref=e346] [cursor=pointer]:
                      - generic [ref=e347]:
                        - combobox "页码" [ref=e349]
                        - generic "10 条/页" [ref=e350]
```

# Test source

```ts
  1402 |       await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckTaskRecord>>>(
  1403 |         "/dmetadata/v1/standardTableCheck/list",
  1404 |         {
  1405 |           asc: false,
  1406 |           current: 1,
  1407 |           size: 100,
  1408 |           search: tableName,
  1409 |         },
  1410 |       ),
  1411 |     );
  1412 |     return data.contentList ?? [];
  1413 |   }
  1414 | 
  1415 |   private async deleteExistingStandardCheckTasksForTable(
  1416 |     tableId: string | number,
  1417 |     tableName: string,
  1418 |     sourceRef: string,
  1419 |   ): Promise<void> {
  1420 |     const existingTasks = (await this.listStandardCheckTasks(tableName)).filter(
  1421 |       (task) => task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
  1422 |     );
  1423 |     for (const task of existingTasks) {
  1424 |       if (task.id !== undefined) await this.deleteStandardCheckTask(task.id, { tableName, columnName: "" }, sourceRef);
  1425 |     }
  1426 |     if (existingTasks.length === 0) return;
  1427 | 
  1428 |     await expect
  1429 |       .poll(
  1430 |         async () =>
  1431 |           (await this.listStandardCheckTasks(tableName)).filter(
  1432 |             (task) => task.tableName === tableName || String(task.tableId ?? "") === String(tableId),
  1433 |           ).length,
  1434 |         {
  1435 |           timeout: 60_000,
  1436 |           message: `${sourceRef}: existing standard check tasks for ${tableName} should be deleted`,
  1437 |         },
  1438 |       )
  1439 |       .toBe(0);
  1440 |   }
  1441 | 
  1442 |   private async deleteStandardCheckTask(
  1443 |     taskId: string | number,
  1444 |     scenario: { tableName: string; columnName?: string },
  1445 |     sourceRef: string,
  1446 |   ): Promise<void> {
  1447 |     this.expectApiData(
  1448 |       `delete standard check task ${taskId}`,
  1449 |       await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardTableCheck/delete", {
  1450 |         id: taskId,
  1451 |       }),
  1452 |     );
  1453 |     await expect
  1454 |       .poll(
  1455 |         async () => (await this.listStandardCheckTasks(scenario.tableName)).some((task) => String(task.id) === String(taskId)),
  1456 |         {
  1457 |           timeout: 60_000,
  1458 |           message: `${sourceRef}: standard check task ${scenario.tableName}.${scenario.columnName ?? "*"} should be deleted`,
  1459 |         },
  1460 |       )
  1461 |       .toBe(false);
  1462 |   }
  1463 | 
  1464 |   private async waitForStandardCheckExecution(
  1465 |     taskId: string | number,
  1466 |     scenario: StandardCheckScenario,
  1467 |     sourceRef: string,
  1468 |   ): Promise<StandardCheckRunRecord> {
  1469 |     let latestRecord: StandardCheckRunRecord | null = null;
  1470 |     await expect
  1471 |       .poll(
  1472 |         async () => {
  1473 |           const data = this.expectApiData(
  1474 |             `poll standard check execution ${taskId}`,
  1475 |             await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckRunRecord>>>(
  1476 |               "/dmetadata/v1/standardTableCheck/checkRecordListByStandardTableCheckId",
  1477 |               {
  1478 |                 asc: false,
  1479 |                 current: 1,
  1480 |                 size: 20,
  1481 |                 standardTableCheckId: taskId,
  1482 |               },
  1483 |             ),
  1484 |           );
  1485 |           latestRecord =
  1486 |             (data.contentList ?? []).find((record) => record.tableName === scenario.tableName) ??
  1487 |             (data.contentList ?? [])[0] ??
  1488 |             null;
  1489 |           if (!latestRecord || latestRecord.status === undefined) return "NO_RECORD";
  1490 |           const status = Number(latestRecord.status);
  1491 |           if (!STANDARD_CHECK_TERMINAL_STATUSES.has(status) && latestRecord.id !== undefined) {
  1492 |             await this.trySyncStandardCheckStatus(latestRecord.id);
  1493 |           }
  1494 |           return STANDARD_CHECK_TERMINAL_STATUSES.has(status) ? String(status) : `PENDING:${status}`;
  1495 |         },
  1496 |         {
  1497 |           timeout: 600_000,
  1498 |           intervals: [2_000, 3_000, 5_000, 10_000, 30_000],
  1499 |           message: `${sourceRef}: ${scenario.caseId} should finish with status ${scenario.expected.status}`,
  1500 |         },
  1501 |       )
> 1502 |       .toBe(String(scenario.expected.status));
       |        ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: 「数据标准」模块集成测试用例#步骤75-86 should finish with status 2
  1503 |     return latestRecord as StandardCheckRunRecord;
  1504 |   }
  1505 | 
  1506 |   private async trySyncStandardCheckStatus(recordId: string | number): Promise<void> {
  1507 |     await this.postJsonFromPage<ApiResponse<unknown>>("/dmetadata/v1/standardTableCheck/syncStatus", {
  1508 |       id: recordId,
  1509 |     }).catch(() => null);
  1510 |   }
  1511 | 
  1512 |   private async waitForStandardCheckTaskListResult(
  1513 |     taskId: string | number,
  1514 |     scenario: StandardCheckScenario,
  1515 |     sourceRef: string,
  1516 |   ): Promise<StandardCheckTaskRecord> {
  1517 |     let latestTask: StandardCheckTaskRecord | null = null;
  1518 |     await expect
  1519 |       .poll(
  1520 |         async () => {
  1521 |           latestTask =
  1522 |             (await this.listStandardCheckTasks(scenario.tableName)).find((task) => String(task.id) === String(taskId)) ??
  1523 |             null;
  1524 |           if (!latestTask || latestTask.quality === null || latestTask.quality === undefined) return "NO_TASK";
  1525 |           return `${Number(latestTask.quality)}:${Number(latestTask.noComplianceCount ?? -1)}:${Number(
  1526 |             latestTask.checkFailCount ?? -1,
  1527 |           )}`;
  1528 |         },
  1529 |         {
  1530 |           timeout: 120_000,
  1531 |           intervals: [2_000, 3_000, 5_000],
  1532 |           message: `${sourceRef}: ${scenario.caseId} should update standard check task list metrics`,
  1533 |         },
  1534 |       )
  1535 |       .toBe(
  1536 |         `${scenario.expected.quality}:${scenario.expected.noComplianceCount}:${scenario.expected.checkFailCount}`,
  1537 |       );
  1538 |     return latestTask as StandardCheckTaskRecord;
  1539 |   }
  1540 | 
  1541 |   private async waitForStandardCheckColumnResult(
  1542 |     runtime: { dataSourceId: string; dbName: string },
  1543 |     scenario: StandardCheckScenario,
  1544 |     sourceRef: string,
  1545 |   ): Promise<StandardCheckColumnRecord> {
  1546 |     let latestColumn: StandardCheckColumnRecord | null = null;
  1547 |     await expect
  1548 |       .poll(
  1549 |         async () => {
  1550 |           const data = this.expectApiData(
  1551 |             `poll standard check column ${scenario.tableName}.${scenario.columnName}`,
  1552 |             await this.postJsonFromPage<ApiResponse<PagedListData<StandardCheckColumnRecord>>>(
  1553 |               "/dmetadata/v1/standardTableCheck/standardCheckColumns",
  1554 |               {
  1555 |                 asc: false,
  1556 |                 current: 1,
  1557 |                 size: 20,
  1558 |                 dataSourceId: runtime.dataSourceId,
  1559 |                 schema: runtime.dbName,
  1560 |                 tableName: scenario.tableName,
  1561 |                 columnName: scenario.columnName,
  1562 |                 status: [scenario.expected.status],
  1563 |                 upStandard: [scenario.expected.upStandard],
  1564 |               },
  1565 |             ),
  1566 |           );
  1567 |           latestColumn =
  1568 |             (data.contentList ?? []).find(
  1569 |               (record) =>
  1570 |                 record.tableName === scenario.tableName &&
  1571 |                 record.columnName === scenario.columnName &&
  1572 |                 Number(record.upStandard) === scenario.expected.upStandard,
  1573 |             ) ?? null;
  1574 |           if (!latestColumn || latestColumn.status === undefined) return "NO_COLUMN";
  1575 |           return `${Number(latestColumn.status)}:${Number(latestColumn.upStandard)}`;
  1576 |         },
  1577 |         {
  1578 |           timeout: 120_000,
  1579 |           intervals: [2_000, 3_000, 5_000],
  1580 |           message: `${sourceRef}: ${scenario.caseId} should produce column result ${scenario.expected.label}`,
  1581 |         },
  1582 |       )
  1583 |       .toBe(`${scenario.expected.status}:${scenario.expected.upStandard}`);
  1584 |     return latestColumn as StandardCheckColumnRecord;
  1585 |   }
  1586 | 
  1587 |   private assertStandardCheckMetrics(
  1588 |     record: StandardCheckTaskRecord | StandardCheckRunRecord,
  1589 |     scenario: StandardCheckScenario,
  1590 |     sourceRef: string,
  1591 |   ): void {
  1592 |     expect(Number(record.quality), `${sourceRef}: ${scenario.caseId} quality`).toBe(scenario.expected.quality);
  1593 |     expect(Number(record.noComplianceCount), `${sourceRef}: ${scenario.caseId} noComplianceCount`).toBe(
  1594 |       scenario.expected.noComplianceCount,
  1595 |     );
  1596 |     expect(Number(record.checkFailCount), `${sourceRef}: ${scenario.caseId} checkFailCount`).toBe(
  1597 |       scenario.expected.checkFailCount,
  1598 |     );
  1599 |   }
  1600 | 
  1601 |   private assertStandardCheckColumn(
  1602 |     record: StandardCheckColumnRecord,
```