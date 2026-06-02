# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P3/P2】元数据数据地图首页与搜索类型下拉可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t03-metadata-data-map-shell.ts:24:1

# Error details

```
Error: SR-2099-01-MD-001: 搜索类型下拉应包含 字段

expect(received).toContain(expected) // indexOf

Expected value: "字段"
Received array: ["数据表"]
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
          - img [ref=e72] [cursor=pointer]
          - menu [ref=e75]:
            - menuitem "数据地图" [ref=e76] [cursor=pointer]:
              - link "数据地图" [ref=e78]:
                - /url: "#/metaDataCenter"
                - generic [ref=e79]:
                  - img [ref=e80]
                  - generic [ref=e83]: 数据地图
            - menuitem "元数据同步" [ref=e84] [cursor=pointer]:
              - link "元数据同步" [ref=e86]:
                - /url: "#/metaDataSync"
                - generic [ref=e87]:
                  - img [ref=e88]
                  - generic [ref=e91]: 元数据同步
            - menuitem "元模型管理" [ref=e92] [cursor=pointer]:
              - link "元模型管理" [ref=e94]:
                - /url: "#/metaModelManage"
                - generic [ref=e95]:
                  - img [ref=e96]
                  - generic [ref=e99]: 元模型管理
            - menuitem "元数据管理" [ref=e100] [cursor=pointer]:
              - link "元数据管理" [ref=e102]:
                - /url: "#/manageTables"
                - generic [ref=e103]:
                  - img [ref=e104]
                  - generic [ref=e107]: 元数据管理
            - menuitem "订阅的数据" [ref=e108] [cursor=pointer]:
              - link "订阅的数据" [ref=e110]:
                - /url: "#/subscribeDatas"
                - generic [ref=e111]:
                  - img [ref=e112]
                  - generic [ref=e115]: 订阅的数据
            - menuitem "元数据质量" [ref=e116] [cursor=pointer]:
              - generic [ref=e118]:
                - img [ref=e119]
                - generic [ref=e122]: 元数据质量
      - main [ref=e124]:
        - generic [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]: 数据地图
            - generic [ref=e130]:
              - generic [ref=e131]:
                - generic [ref=e132] [cursor=pointer]:
                  - generic [ref=e133]:
                    - combobox [expanded] [active] [ref=e135]:
                      - listbox:
                        - option "数据表" [selected]: "1"
                        - option "字段": "2"
                    - generic "数据表" [ref=e136]
                  - img [ref=e137]:
                    - img [ref=e138]
                - textbox "请输入表名、表中文名、库名、数据源名" [ref=e140]
              - button "search" [ref=e141] [cursor=pointer]:
                - img "search" [ref=e142]:
                  - img [ref=e143]
              - generic [ref=e150]:
                - generic "数据表" [ref=e151] [cursor=pointer]:
                  - generic [ref=e152]: 数据表
                - generic "字段" [ref=e153] [cursor=pointer]:
                  - generic [ref=e154]: 字段
                - generic "离线任务" [ref=e155] [cursor=pointer]:
                  - generic [ref=e156]: 离线任务
                - generic "实时任务" [ref=e157] [cursor=pointer]:
                  - generic [ref=e158]: 实时任务
                - generic "指标" [ref=e159] [cursor=pointer]:
                  - generic [ref=e160]: 指标
                - generic "智能标签" [ref=e161] [cursor=pointer]:
                  - generic [ref=e162]: 智能标签
                - generic "API" [ref=e163] [cursor=pointer]:
                  - generic [ref=e164]: API
          - generic [ref=e165]:
            - generic [ref=e169]: 资产类型
            - generic [ref=e173]:
              - generic [ref=e174] [cursor=pointer]:
                - img "数据表" [ref=e176]
                - generic [ref=e179]:
                  - generic [ref=e180]: 数据表
                  - generic [ref=e185]: 2,119
              - generic [ref=e186] [cursor=pointer]:
                - img "字段" [ref=e188]
                - generic [ref=e191]:
                  - generic [ref=e192]: 字段
                  - generic [ref=e197]: 17,546
              - generic [ref=e198] [cursor=pointer]:
                - img "离线任务" [ref=e200]
                - generic [ref=e203]:
                  - generic [ref=e204]: 离线任务
                  - generic [ref=e209]: "44"
              - generic [ref=e210] [cursor=pointer]:
                - img "实时任务" [ref=e212]
                - generic [ref=e215]:
                  - generic [ref=e216]: 实时任务
                  - generic [ref=e221]: "0"
              - generic [ref=e222] [cursor=pointer]:
                - img "指标" [ref=e224]
                - generic [ref=e227]:
                  - generic [ref=e228]: 指标
                  - generic [ref=e233]: "0"
              - generic [ref=e234] [cursor=pointer]:
                - img "智能标签" [ref=e236]
                - generic [ref=e239]:
                  - generic [ref=e240]: 智能标签
                  - generic [ref=e245]: "0"
              - generic [ref=e246] [cursor=pointer]:
                - img "API" [ref=e248]
                - generic [ref=e251]:
                  - generic [ref=e252]: API
                  - generic [ref=e257]: "0"
          - generic [ref=e258]:
            - generic [ref=e262]: 表来源
            - generic [ref=e263]:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "暂无数据"
                        - generic: 暂无数据
          - generic [ref=e270]:
            - generic [ref=e271]:
              - generic [ref=e275]: 热门标签
              - list [ref=e276]:
                - generic [ref=e277]:
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - img "暂无数据"
                        - generic: 暂无数据
            - generic [ref=e284]:
              - generic [ref=e288]: 热门查询
              - generic [ref=e290]:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - img "暂无数据"
                      - generic: 暂无数据
  - img [ref=e300]
```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | 
  3   | import {
  4   |   clickButtonByText,
  5   |   clickMetadataMenu,
  6   |   expectAnyText,
  7   |   gotoMetadataPage,
  8   |   waitForDassetsResponse,
  9   | } from "./metadata-shell-page";
  10  | 
  11  | export async function openDataMap(page: Page, sourceRef: string): Promise<void> {
  12  |   await gotoMetadataPage(page);
  13  |   await clickMetadataMenu(page, "数据地图");
  14  |   await expectAnyText(page, ["数据表", "资产类型", "热门查询"], sourceRef);
  15  | }
  16  | 
  17  | export async function expectDataMapLandingContract(page: Page, sourceRef: string): Promise<void> {
  18  |   await openDataMap(page, sourceRef);
  19  |   await expectAnyText(page, ["数据地图", "资产类型", "表来源", "热门标签", "热门查询"], sourceRef);
  20  |   const search = page.locator("input[placeholder*='表名'], input[placeholder*='表中文名']").first();
  21  |   await expect(search, `${sourceRef}: 数据地图搜索框 placeholder 应可见`).toBeVisible({ timeout: 15000 });
  22  | }
  23  | 
  24  | export async function expectDataMapSearchTypeOptions(page: Page, sourceRef: string): Promise<void> {
  25  |   await openDataMap(page, sourceRef);
  26  |   const select = page.locator(".ant-select").first();
  27  |   await expect(select, `${sourceRef}: 数据地图搜索类型下拉应可见`).toBeVisible({ timeout: 15000 });
  28  |   await select.click();
  29  |   const options = page.locator(
  30  |     ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content",
  31  |   );
  32  |   await expect(options.first(), `${sourceRef}: 搜索类型下拉选项应展开`).toBeVisible({ timeout: 10000 });
  33  |   const optionTexts = (await options.allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  34  |   for (const expected of ["数据表", "字段", "离线任务", "实时任务", "指标", "智能标签", "API"]) {
> 35  |     expect(optionTexts, `${sourceRef}: 搜索类型下拉应包含 ${expected}`).toContain(expected);
      |                                                                ^ Error: SR-2099-01-MD-001: 搜索类型下拉应包含 字段
  36  |   }
  37  |   await page.keyboard.press("Escape");
  38  | }
  39  | 
  40  | export async function selectAssetType(page: Page, label: string, sourceRef: string): Promise<void> {
  41  |   const option = page.locator("text").filter({ hasText: new RegExp(`^${label}$`) }).first();
  42  |   await expect(page.locator("body"), `${sourceRef}: 页面应展示资产类型「${label}」`).toContainText(label);
  43  |   if (await option.isVisible({ timeout: 3000 })) {
  44  |     await option.click();
  45  |   }
  46  | }
  47  | 
  48  | export async function searchDataMap(page: Page, keyword: string, sourceRef: string) {
  49  |   const input = page.locator("input[placeholder*='搜索'], input[placeholder*='请输入'], .ant-input").first();
  50  |   await expect(input, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 15000 });
  51  |   await input.fill(keyword);
  52  |   const probe = await waitForDassetsResponse(
  53  |     page,
  54  |     async () => {
  55  |       const button = page.getByRole("button", { name: /搜索|查询/ }).first();
  56  |       if (await button.isVisible({ timeout: 5000 })) {
  57  |         await button.click();
  58  |         return;
  59  |       }
  60  |       await input.press("Enter");
  61  |     },
  62  |     sourceRef,
  63  |     (url) => /map|search|query|list|metadata|asset/i.test(url),
  64  |   );
  65  |   await expect(page.locator("body"), `${sourceRef}: 搜索后页面仍应展示数据地图`).toContainText("数据地图");
  66  |   return { keyword, response: probe } as const;
  67  | }
  68  | 
  69  | export async function expectSearchResult(page: Page, keyword: string, expectedTexts: readonly string[], sourceRef: string) {
  70  |   await searchDataMap(page, keyword, sourceRef);
  71  |   await expectAnyText(page, expectedTexts, sourceRef);
  72  | }
  73  | 
  74  | export async function expectEmptySearch(page: Page, keyword: string, sourceRef: string): Promise<void> {
  75  |   await searchDataMap(page, keyword, sourceRef);
  76  |   await expect(page.locator("body"), `${sourceRef}: 特殊字符搜索应展示暂无数据`).toContainText("暂无数据", {
  77  |     timeout: 30000,
  78  |   });
  79  | }
  80  | 
  81  | export async function expectStatisticCard(page: Page, label: string, sourceRef: string): Promise<void> {
  82  |   await gotoMetadataPage(page);
  83  |   await expectAnyText(page, [label], sourceRef);
  84  |   const cardText = page.locator("body");
  85  |   await expect(cardText, `${sourceRef}: 「${label}」统计值应为数字`).toContainText(new RegExp(`${label}\\s*\\d+`), {
  86  |     timeout: 30000,
  87  |   });
  88  | }
  89  | 
  90  | export async function expectFilterPanel(page: Page, sourceRef: string): Promise<void> {
  91  |   await openDataMap(page, sourceRef);
  92  |   for (const label of ["查询结果类型", "数据源类型", "数据源", "数据库", "负责人", "表标签"]) {
  93  |     await expect(page.locator("body"), `${sourceRef}: 筛选项「${label}」应展示`).toContainText(label);
  94  |   }
  95  |   await waitForDassetsResponse(
  96  |     page,
  97  |     async () => {
  98  |       await clickButtonByText(page, "查询", sourceRef);
  99  |     },
  100 |     sourceRef,
  101 |     (url) => /list|query|search|map/i.test(url),
  102 |   );
  103 | }
  104 | 
  105 | export async function expectDataCatalogSearch(page: Page, sourceRef: string): Promise<void> {
  106 |   await openDataMap(page, sourceRef);
  107 |   await expectAnyText(page, ["数据目录"], sourceRef);
  108 |   const catalog = page.locator("text=/数据目录/").first();
  109 |   await expect(catalog, `${sourceRef}: 数据目录入口应可见`).toBeVisible({ timeout: 15000 });
  110 |   await catalog.click();
  111 |   await expectSearchResult(page, "test_test", ["test_test", "数据目录"], sourceRef);
  112 |   await expectSearchResult(page, "TEST_TEST", ["test_test", "数据目录"], sourceRef);
  113 |   await expectEmptySearch(page, "!@#$%^&*", sourceRef);
  114 | }
  115 | 
  116 | export async function expectPopularSearchCount(page: Page, sourceRef: string): Promise<void> {
  117 |   await openDataMap(page, sourceRef);
  118 |   await searchDataMap(page, "test", sourceRef);
  119 |   await searchDataMap(page, "test", sourceRef);
  120 |   await expectAnyText(page, ["热门查询", "test"], sourceRef);
  121 | }
  122 | 
  123 | // ─── 数据地图资产类型统计与类型入口（t12） ───
  124 | 
  125 | export async function expectDataMapStatisticsAndTypes(page: Page, sourceRef: string): Promise<void> {
  126 |   await openDataMap(page, sourceRef);
  127 |   const body = page.locator("body");
  128 |   // 数据地图首页应展示资产类型统计（数据表/离线任务/实时任务/API/智能标签/指标）
  129 |   for (const label of ["数据表", "离线任务"]) {
  130 |     await expect(body, `${sourceRef}: 数据地图应展示资产类型「${label}」`).toContainText(label, {
  131 |       timeout: 30000,
  132 |     });
  133 |   }
  134 |   // 至少一个类型的统计数字可见
  135 |   await expect(body, `${sourceRef}: 数据地图应展示资产类型数量`).toContainText(/\d+/, { timeout: 30000 });
```