# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P0】数据质量规则库自定义 SQL 模版基础信息保存与详情可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t07-data-quality-shell.ts:135:1

# Error details

```
Error: SR-2099-01-DQ-RULEBASE-SQL-BASIC-L7690: 仅填写基础信息保存自定义 SQL 模版应请求成功

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - generic [ref=e72] [cursor=pointer]:
            - generic [ref=e73]:
              - combobox [ref=e75]
              - generic "pw_test" [ref=e76]
            - generic:
              - img:
                - img
          - menu [ref=e78]:
            - menuitem "总览" [ref=e79] [cursor=pointer]:
              - link "总览" [ref=e81]:
                - /url: "#/dq/overview"
                - generic [ref=e82]:
                  - img [ref=e83]
                  - generic [ref=e86]: 总览
            - menuitem "规则库配置" [ref=e87] [cursor=pointer]:
              - link "规则库配置" [ref=e89]:
                - /url: "#/dq/ruleBase"
                - generic [ref=e90]:
                  - img [ref=e91]
                  - generic [ref=e94]: 规则库配置
            - menuitem "规则集管理" [ref=e95] [cursor=pointer]:
              - link "规则集管理" [ref=e97]:
                - /url: "#/dq/ruleSet"
                - generic [ref=e98]:
                  - img [ref=e99]
                  - generic [ref=e102]: 规则集管理
            - menuitem "规则任务管理" [ref=e103] [cursor=pointer]:
              - link "规则任务管理" [ref=e105]:
                - /url: "#/dq/rule"
                - generic [ref=e106]:
                  - img [ref=e107]
                  - generic [ref=e110]: 规则任务管理
            - menuitem "校验结果查询" [ref=e111] [cursor=pointer]:
              - link "校验结果查询" [ref=e113]:
                - /url: "#/dq/taskQuery"
                - generic [ref=e114]:
                  - img [ref=e115]
                  - generic [ref=e118]: 校验结果查询
            - menuitem "数据质量报告" [ref=e119] [cursor=pointer]:
              - link "数据质量报告" [ref=e121]:
                - /url: "#/dq/qualityReport"
                - generic [ref=e122]:
                  - img [ref=e123]
                  - generic [ref=e126]: 数据质量报告
            - menuitem "通用配置" [ref=e127] [cursor=pointer]:
              - generic [ref=e129]:
                - img [ref=e130]
                - generic [ref=e133]: 通用配置
            - menuitem "项目管理" [ref=e134] [cursor=pointer]:
              - generic [ref=e136]:
                - img [ref=e137]
                - generic [ref=e140]: 项目管理
      - main [ref=e142]:
        - generic [ref=e143]:
          - navigation [ref=e145]:
            - list [ref=e146]:
              - listitem [ref=e147]:
                - link "自定义SQL模板" [ref=e149] [cursor=pointer]:
                  - /url: "#/dq/ruleBase"
                - img "right" [ref=e151]:
                  - img [ref=e152]
              - listitem [ref=e154]: 新增自定义SQL模板
          - generic [ref=e157]:
            - generic [ref=e159]:
              - generic [ref=e165]: 基本信息
              - generic [ref=e166]:
                - generic [ref=e169]:
                  - generic "规则名称" [ref=e171]: "* 规则名称"
                  - textbox "* 规则名称" [ref=e175]:
                    - /placeholder: 请输入
                    - text: 自定义SQL主流程模板
                - generic [ref=e178]:
                  - generic "规则分类" [ref=e180]: "* 规则分类"
                  - generic [ref=e184] [cursor=pointer]:
                    - generic [ref=e185]:
                      - combobox "* 规则分类" [ref=e187]
                      - generic "完整性校验" [ref=e188]
                    - generic:
                      - img:
                        - img
                - generic [ref=e191]:
                  - generic "关联范围" [ref=e193]: "* 关联范围"
                  - generic [ref=e197] [cursor=pointer]:
                    - generic [ref=e198]:
                      - combobox "* 关联范围" [ref=e200]
                      - generic "字段" [ref=e201]
                    - generic:
                      - img:
                        - img
                - generic [ref=e204]:
                  - generic "规则描述" [ref=e206]: "* 规则描述"
                  - textbox "* 规则描述" [ref=e210]:
                    - /placeholder: 请输入
                    - text: 使用自定义sql模版统计目标字段质量
              - generic [ref=e213]:
                - generic [ref=e216]: 自定义配置
                - button "全局参数" [ref=e218] [cursor=pointer]:
                  - generic [ref=e219]: 全局参数
              - code [ref=e226]:
                - generic [ref=e227]:
                  - generic [ref=e232]: "1"
                  - textbox "Editor content;Press Alt+F1 for Accessibility Options." [ref=e239]
              - table [ref=e246]:
                - rowgroup [ref=e252]:
                  - row "参数 * 类型 * 参数名称 参数说明" [ref=e253]:
                    - columnheader "参数" [ref=e254]
                    - columnheader "* 类型" [ref=e255]
                    - columnheader "* 参数名称" [ref=e256]
                    - columnheader "参数说明" [ref=e257]
                - rowgroup [ref=e258]:
                  - row "暂无数据 暂无数据" [ref=e259]:
                    - cell "暂无数据 暂无数据" [ref=e260]:
                      - generic [ref=e263]:
                        - img "暂无数据" [ref=e265]
                        - generic [ref=e266]: 暂无数据
            - generic [ref=e267]:
              - button "loading 新 增" [active] [ref=e268] [cursor=pointer]:
                - generic:
                  - img "loading"
                - generic [ref=e269]: 新 增
              - button "取 消" [ref=e270] [cursor=pointer]:
                - generic [ref=e271]: 取 消
  - generic [ref=e273]:
    - alert
    - alert
    - complementary
    - complementary
  - img [ref=e276]
  - generic [ref=e280]:
    - alert [ref=e282]:
      - img "close-circle" [ref=e283]:
        - img [ref=e284]
      - generic [ref=e287]:
        - generic [ref=e288]:
          - text: 异常
          - generic [ref=e289] [cursor=pointer]: 全部关闭
        - generic [ref=e290] [cursor=pointer]: 全部关闭
      - generic [ref=e291]: 自定义配置不能为空
    - img "close" [ref=e294] [cursor=pointer]:
      - img [ref=e295]
```

# Test source

```ts
  6568 |       value: "^[A-Za-z0-9_{}:\",-]+$",
  6569 |       testData: "{\"vin\":\"LTV202601160001AA\"}",
  6570 |       action: "新增父级 key",
  6571 |     });
  6572 |     created = true;
  6573 | 
  6574 |     let parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息");
  6575 |     await expect(parentRow, `${sourceRef}: 新增父级 key 应展示初始 value格式`).toContainText(
  6576 |       "^[A-Za-z0-9_{}:\",-]+$",
  6577 |       { timeout: 30000 },
  6578 |     );
  6579 | 
  6580 |     await parentRow.getByRole("button", { name: "编辑" }).click({ timeout: 30000 });
  6581 |     await fillJsonValidationModal(page, sourceRef, {
  6582 |       name: "车辆信息编辑",
  6583 |       value: "^[A-Za-z0-9_{}:\",.-]+$",
  6584 |       testData: "{\"vin\":\"LTV202601160001AA\"}",
  6585 |       action: "编辑父级 key",
  6586 |     });
  6587 | 
  6588 |     parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
  6589 |     await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显最新 value格式`).toContainText(
  6590 |       "^[A-Za-z0-9_{}:\",.-]+$",
  6591 |       { timeout: 30000 },
  6592 |     );
  6593 |     await expect(parentRow, `${sourceRef}: 编辑保存后列表应回显更新人`).toContainText("admin@dtstack.com", {
  6594 |       timeout: 30000,
  6595 |     });
  6596 | 
  6597 |     await parentRow.getByRole("button", { name: "新增子层级" }).click({ timeout: 30000 });
  6598 |     await addJsonValidationKey(page, sourceRef, {
  6599 |       key: childKey,
  6600 |       name: "车辆VIN",
  6601 |       value: "^[A-Z0-9]{17}$",
  6602 |       testData: "LTV202601160001AA",
  6603 |       action: "新增子层级 key",
  6604 |       modalAlreadyOpen: true,
  6605 |     });
  6606 | 
  6607 |     parentRow = await expectJsonValidationRow(page, sourceRef, parentKey, "车辆信息编辑");
  6608 |     const expandButton = parentRow.locator(".ant-table-row-expand-icon").first();
  6609 |     await expect(expandButton, `${sourceRef}: 父级 key 应展示可展开子层级入口`).toBeVisible({
  6610 |       timeout: 30000,
  6611 |     });
  6612 |     await expandButton.click({ timeout: 30000 });
  6613 |     const childRow = page.locator(".ant-table-tbody tr").filter({ hasText: childKey }).filter({ hasText: "车辆VIN" }).first();
  6614 |     await expect(childRow, `${sourceRef}: 展开父级 key 后应展示子层级 ${childKey}`).toBeVisible({
  6615 |       timeout: 30000,
  6616 |     });
  6617 |     await expect(childRow, `${sourceRef}: 子层级应展示 value格式`).toContainText("^[A-Z0-9]{17}$", {
  6618 |       timeout: 30000,
  6619 |     });
  6620 | 
  6621 |     await deleteJsonValidationKeyAndAssert(page, sourceRef, parentKey);
  6622 |     deleted = true;
  6623 |     await expect(
  6624 |       page.locator(".ant-table-tbody tr").filter({ hasText: parentKey }),
  6625 |       `${sourceRef}: 删除父级 key 后父级应从列表移除`,
  6626 |     ).toHaveCount(0, { timeout: 30000 });
  6627 |     await expect(
  6628 |       page.locator(".ant-table-tbody tr").filter({ hasText: childKey }).filter({ hasText: "车辆VIN" }),
  6629 |       `${sourceRef}: 删除父级 key 后子层级应联动移除`,
  6630 |     ).toHaveCount(0, { timeout: 30000 });
  6631 |   } finally {
  6632 |     if (created && !deleted) {
  6633 |       await deleteJsonValidationKeyBestEffort(page, parentKey);
  6634 |     }
  6635 |   }
  6636 | }
  6637 | 
  6638 | export async function expectMetadataIntegrityShell(page: Page, sourceRef: string): Promise<void> {
  6639 |   await expectDqPage(page, sourceRef, {
  6640 |     path: "/integrityAnalysis",
  6641 |     labels: ["元数据质量", "完整度分析", "质量统计", "统计类型", "质量分析", "分析方式"],
  6642 |     tableHeaders: ["数据源名称", "数据源类型", "表元数据完整度"],
  6643 |     apiPaths: [
  6644 |       "/dassets/v1/metaDataValid/totalRateAnalysis",
  6645 |       "/dassets/v1/metaDataValid/fillRateByDataSource",
  6646 |     ],
  6647 |   });
  6648 | }
  6649 | 
  6650 | function waitForDqJson<T>(
  6651 |   page: Page,
  6652 |   apiPath: string,
  6653 |   matches?: (payload: DqApiResponse<T>) => boolean,
  6654 | ): Promise<DqApiResponse<T>> {
  6655 |   return page
  6656 |     .waitForResponse(
  6657 |       async (response) => {
  6658 |         if (!response.url().includes(apiPath) || response.status() !== 200) return false;
  6659 |         if (!matches) return true;
  6660 |         return matches((await response.json()) as DqApiResponse<T>);
  6661 |       },
  6662 |       { timeout: 60000 },
  6663 |     )
  6664 |     .then((response) => response.json() as Promise<DqApiResponse<T>>);
  6665 | }
  6666 | 
  6667 | function expectDqSuccess<T>(payload: DqApiResponse<T>, message: string): T {
> 6668 |   expect(payload.success ?? payload.code === 1, message).toBe(true);
       |                                                          ^ Error: SR-2099-01-DQ-RULEBASE-SQL-BASIC-L7690: 仅填写基础信息保存自定义 SQL 模版应请求成功
  6669 |   expect(payload.data, `${message}: data 应存在`).toBeTruthy();
  6670 |   return payload.data as T;
  6671 | }
  6672 | 
  6673 | async function assertOverviewCountCards(
  6674 |   page: Page,
  6675 |   sourceRef: string,
  6676 |   countRecord: DqOverviewCountRecord,
  6677 | ): Promise<void> {
  6678 |   const body = page.locator("body");
  6679 |   const ruleCount = expectNumberLike(countRecord.ruleCount, `${sourceRef}: countRecord.ruleCount 应为数字`);
  6680 |   const ruleSetCount = expectNumberLike(countRecord.ruleSetCount, `${sourceRef}: countRecord.ruleSetCount 应为数字`);
  6681 |   const monitorCount = expectNumberLike(countRecord.monitorCount, `${sourceRef}: countRecord.monitorCount 应为数字`);
  6682 |   const passCount = expectNumberLike(countRecord.passCount, `${sourceRef}: countRecord.passCount 应为数字`);
  6683 |   const errorCount = expectNumberLike(countRecord.errorCount, `${sourceRef}: countRecord.errorCount 应为数字`);
  6684 |   const lastUpdateTime = expectNonEmptyString(
  6685 |     countRecord.lastUpdateTime,
  6686 |     `${sourceRef}: countRecord.lastUpdateTime 应为有效时间`,
  6687 |   );
  6688 |   expect(lastUpdateTime, `${sourceRef}: 最近一次更新时间格式应有效`).toMatch(
  6689 |     /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  6690 |   );
  6691 | 
  6692 |   for (const value of [ruleCount, ruleSetCount, monitorCount, `${passCount}/${errorCount}`, lastUpdateTime]) {
  6693 |     await expect(body, `${sourceRef}: 总览统计卡片应展示接口值「${value}」`).toContainText(value, {
  6694 |       timeout: 30000,
  6695 |     });
  6696 |   }
  6697 | }
  6698 | 
  6699 | function assertOverviewRuleCharts(
  6700 |   sourceRef: string,
  6701 |   ruleDistribution: DqOverviewRuleDistributionRecord[],
  6702 |   ruleCategories: DqOverviewRuleDistributionRecord[],
  6703 | ): void {
  6704 |   const expectedRuleTypes = ["完整性校验", "有效性校验", "唯一性校验", "统计性校验", "一致性校验", "时效性校验", "合理性校验"];
  6705 |   const distributionTypes = new Set(ruleDistribution.map((record) => expectNonEmptyString(record.ruleType, `${sourceRef}: 规则库分布应包含规则分类`)));
  6706 |   const categoryTypes = new Set(ruleCategories.map((record) => expectNonEmptyString(record.ruleType, `${sourceRef}: 已配置规则分类应包含规则分类`)));
  6707 | 
  6708 |   for (const ruleType of expectedRuleTypes) {
  6709 |     expect(distributionTypes.has(ruleType), `${sourceRef}: 规则库分布应包含「${ruleType}」`).toBe(true);
  6710 |     expect(categoryTypes.has(ruleType), `${sourceRef}: 已配置规则分类应包含「${ruleType}」`).toBe(true);
  6711 |   }
  6712 |   for (const record of [...ruleDistribution, ...ruleCategories]) {
  6713 |     expectNumberLike(record.ruleCount, `${sourceRef}: ${record.ruleType} ruleCount 应为数字`);
  6714 |     expect(Number(record.percentage), `${sourceRef}: ${record.ruleType} percentage 应为数字`).not.toBeNaN();
  6715 |   }
  6716 | }
  6717 | 
  6718 | async function assertOverviewTopRanking(
  6719 |   body: ReturnType<Page["locator"]>,
  6720 |   sourceRef: string,
  6721 |   topRecords: DqOverviewTopRecord[],
  6722 | ): Promise<void> {
  6723 |   expect(topRecords.length, `${sourceRef}: 校验异常 top 排名应返回数据`).toBeGreaterThan(0);
  6724 |   let previousScore = Number.POSITIVE_INFINITY;
  6725 |   let previousTime = "";
  6726 |   for (const [index, record] of topRecords.entries()) {
  6727 |     const tableName = expectNonEmptyString(record.tableName, `${sourceRef}: Top${index + 1} 应包含数据表`);
  6728 |     const schemaName = expectNonEmptyString(record.schemaName, `${sourceRef}: Top${index + 1} 应包含所属数据库`);
  6729 |     const sourceName = expectNonEmptyString(record.sourceName, `${sourceRef}: Top${index + 1} 应包含所属数据源`);
  6730 |     const monitorCount = expectNumberLike(record.monitorCount, `${sourceRef}: Top${index + 1} 校验任务数应为数字`);
  6731 |     const failedCount = expectNumberLike(record.failedCount, `${sourceRef}: Top${index + 1} 校验失败数应为数字`);
  6732 |     const unPassCount = expectNumberLike(record.unPassCount, `${sourceRef}: Top${index + 1} 校验不通过数应为数字`);
  6733 |     const lastExecuteTime = expectNonEmptyString(record.lastExecuteTime, `${sourceRef}: Top${index + 1} 最近一次校验时间应存在`);
  6734 |     const currentScore = Number(failedCount) + Number(unPassCount);
  6735 |     expect(currentScore, `${sourceRef}: Top${index + 1} 失败/不通过数不应为负数`).toBeGreaterThanOrEqual(0);
  6736 |     expect(currentScore, `${sourceRef}: Top 排名应按失败/不通过数降序`).toBeLessThanOrEqual(previousScore);
  6737 |     if (currentScore === previousScore && previousTime) {
  6738 |       expect(
  6739 |         lastExecuteTime <= previousTime,
  6740 |         `${sourceRef}: Top 排名同分时应按最近一次校验时间降序`,
  6741 |       ).toBe(true);
  6742 |     }
  6743 |     previousScore = currentScore;
  6744 |     previousTime = lastExecuteTime;
  6745 | 
  6746 |     for (const value of [tableName, schemaName, sourceName, monitorCount, `${failedCount}/${unPassCount}`, lastExecuteTime]) {
  6747 |       await expect(body, `${sourceRef}: 校验异常 top 排名应展示接口值「${value}」`).toContainText(value, {
  6748 |         timeout: 30000,
  6749 |       });
  6750 |     }
  6751 |   }
  6752 | }
  6753 | 
  6754 | async function assertOverviewRecentErrors(
  6755 |   body: ReturnType<Page["locator"]>,
  6756 |   sourceRef: string,
  6757 |   recentErrors: DqOverviewRecentErrorRecord[],
  6758 | ): Promise<void> {
  6759 |   expect(recentErrors.length, `${sourceRef}: 近期校验异常结果应返回数据`).toBeGreaterThan(0);
  6760 |   const firstRecord = recentErrors[0];
  6761 |   for (const value of [
  6762 |     expectNonEmptyString(firstRecord.tableName, `${sourceRef}: 近期异常首条应包含数据表`),
  6763 |     expectNonEmptyString(firstRecord.schemaName, `${sourceRef}: 近期异常首条应包含所属数据库`),
  6764 |     expectNonEmptyString(firstRecord.sourceName, `${sourceRef}: 近期异常首条应包含所属数据源`),
  6765 |     expectNonEmptyString(firstRecord.ruleName, `${sourceRef}: 近期异常首条应包含任务名称`),
  6766 |     expectNonEmptyString(firstRecord.periodTypeName, `${sourceRef}: 近期异常首条应包含执行周期`),
  6767 |     expectNonEmptyString(firstRecord.associated, `${sourceRef}: 近期异常首条应包含是否关联任务`),
  6768 |     expectNonEmptyString(firstRecord.cycTime, `${sourceRef}: 近期异常首条应包含计划时间`),
```