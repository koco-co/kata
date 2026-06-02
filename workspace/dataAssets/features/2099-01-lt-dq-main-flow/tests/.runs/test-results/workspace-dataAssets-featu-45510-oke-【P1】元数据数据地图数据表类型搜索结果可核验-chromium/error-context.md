# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P1】元数据数据地图数据表类型搜索结果可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t03-metadata-data-map-shell.ts:34:1

# Error details

```
Error: SR-2099-01-MD-DATATABLE-SEARCH-L196: 数据地图搜索框应可见

expect(locator).toBeVisible() failed

Locator: locator('input[placeholder*=\'搜索\'], input[placeholder*=\'请输入\'], .ant-input').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - SR-2099-01-MD-DATATABLE-SEARCH-L196: 数据地图搜索框应可见 with timeout 15000ms
  - waiting for locator('input[placeholder*=\'搜索\'], input[placeholder*=\'请输入\'], .ant-input').first()

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
  35  |     expect(optionTexts, `${sourceRef}: 搜索类型下拉应包含 ${expected}`).toContain(expected);
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
> 50  |   await expect(input, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 15000 });
      |                                                   ^ Error: SR-2099-01-MD-DATATABLE-SEARCH-L196: 数据地图搜索框应可见
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
  136 |   // 热门标签/热门查询模块可见
  137 |   await expect(body, `${sourceRef}: 数据地图应展示热门标签或热门查询`).toContainText(
  138 |     /热门标签|热门查询/,
  139 |     { timeout: 30000 },
  140 |   );
  141 | }
  142 | 
  143 | // ─── 数据地图类型导航点击（t12） ───
  144 | 
  145 | export async function expectDataMapTypeNavigation(
  146 |   page: Page,
  147 |   types: readonly string[],
  148 |   sourceRef: string,
  149 | ): Promise<void> {
  150 |   for (const typeName of types) {
```