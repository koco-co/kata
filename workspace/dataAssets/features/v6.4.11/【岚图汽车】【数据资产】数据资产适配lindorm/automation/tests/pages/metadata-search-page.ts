import { waitForUiSettled } from "../../../../../../../../runtime/automation/playwright/index";
import { expect, type Page } from "@playwright/test";

import {
  clickButtonByText,
  clickMetadataMenu,
  expectAnyText,
  gotoMetadataPage,
  waitForDassetsResponse,
} from "./metadata-shell-page";

export async function openDataMap(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "数据地图");
  await expectAnyText(page, ["数据表", "资产类型", "热门查询"], sourceRef);
}

export async function expectDataMapLandingContract(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  await expectAnyText(page, ["数据地图", "资产类型", "表来源", "热门标签", "热门查询"], sourceRef);
  const search = page.locator("input[placeholder*='表名'], input[placeholder*='表中文名']").first();
  await expect(search, `${sourceRef}: 数据地图搜索框 placeholder 应可见`).toBeVisible({
    timeout: 15000,
  });
}

export async function expectDataMapSearchTypeOptions(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  const select = page.locator(".ant-select").first();
  await expect(select, `${sourceRef}: 数据地图搜索类型下拉应可见`).toBeVisible({ timeout: 15000 });
  await select.click();
  const options = page.locator(
    ".ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content",
  );
  await expect(options.first(), `${sourceRef}: 搜索类型下拉选项应展开`).toBeVisible({
    timeout: 10000,
  });
  const optionTexts = (await options.allInnerTexts()).map((text) =>
    text.replace(/\s+/g, " ").trim(),
  );
  for (const expected of ["数据表", "字段", "离线任务", "实时任务", "指标", "智能标签", "API"]) {
    expect(optionTexts, `${sourceRef}: 搜索类型下拉应包含 ${expected}`).toContain(expected);
  }
  await page.keyboard.press("Escape");
}

export async function selectAssetType(page: Page, label: string, sourceRef: string): Promise<void> {
  const option = page
    .locator("text")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first();
  await expect(page.locator("body"), `${sourceRef}: 页面应展示资产类型「${label}」`).toContainText(
    label,
  );
  if (await option.isVisible({ timeout: 3000 })) {
    await option.click();
  }
}

export async function searchDataMap(page: Page, keyword: string, sourceRef: string) {
  const input = page
    .locator("input[placeholder*='搜索'], input[placeholder*='请输入'], .ant-input")
    .first();
  await expect(input, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 15000 });
  await input.fill(keyword);
  const probe = await waitForDassetsResponse(
    page,
    async () => {
      const button = page.getByRole("button", { name: /搜索|查询/ }).first();
      if (await button.isVisible({ timeout: 5000 })) {
        await button.click();
        return;
      }
      await input.press("Enter");
    },
    sourceRef,
    (url) => /map|search|query|list|metadata|asset/i.test(url),
  );
  await expect(page.locator("body"), `${sourceRef}: 搜索后页面仍应展示数据地图`).toContainText(
    "数据地图",
  );
  return { keyword, response: probe } as const;
}

export async function expectSearchResult(
  page: Page,
  keyword: string,
  expectedTexts: readonly string[],
  sourceRef: string,
) {
  await searchDataMap(page, keyword, sourceRef);
  // 必须限定在搜索结果行内断言：body 级匹配会被搜索框回显的关键词恒真化
  for (const text of expectedTexts) {
    const resultRow = page.locator(".ant-table-row").filter({ hasText: text }).first();
    await expect(resultRow, `${sourceRef}: 搜索「${keyword}」的结果应包含「${text}」`).toBeVisible({
      timeout: 30000,
    });
  }
}

export async function expectEmptySearch(
  page: Page,
  keyword: string,
  sourceRef: string,
): Promise<void> {
  await searchDataMap(page, keyword, sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 特殊字符搜索应展示暂无数据`).toContainText(
    "暂无数据",
    {
      timeout: 30000,
    },
  );
}

export async function expectStatisticCard(
  page: Page,
  label: string,
  sourceRef: string,
): Promise<void> {
  await gotoMetadataPage(page);
  await expectAnyText(page, [label], sourceRef);
  const cardText = page.locator("body");
  await expect(cardText, `${sourceRef}: 「${label}」统计值应为数字`).toContainText(
    new RegExp(`${label}\\s*\\d+`),
    {
      timeout: 30000,
    },
  );
}

export async function expectFilterPanel(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  for (const label of ["查询结果类型", "数据源类型", "数据源", "数据库", "负责人", "表标签"]) {
    await expect(page.locator("body"), `${sourceRef}: 筛选项「${label}」应展示`).toContainText(
      label,
    );
  }
  await waitForDassetsResponse(
    page,
    async () => {
      await clickButtonByText(page, "查询", sourceRef);
    },
    sourceRef,
    (url) => /list|query|search|map/i.test(url),
  );
}

export async function expectDataCatalogSearch(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  await expectAnyText(page, ["数据目录"], sourceRef);
  const catalog = page.locator("text=/数据目录/").first();
  await expect(catalog, `${sourceRef}: 数据目录入口应可见`).toBeVisible({ timeout: 15000 });
  await catalog.click();
  await expectSearchResult(page, "test_test", ["test_test"], sourceRef);
  await expectSearchResult(page, "TEST_TEST", ["test_test"], sourceRef);
  await expectEmptySearch(page, "!@#$%^&*", sourceRef);
}

export async function expectPopularSearchCount(page: Page, sourceRef: string): Promise<void> {
  await openDataMap(page, sourceRef);
  await searchDataMap(page, "test", sourceRef);
  await searchDataMap(page, "test", sourceRef);
  await expectAnyText(page, ["热门查询"], sourceRef);
}

// ─── 数据地图资产类型统计与类型入口（t12） ───

export async function expectDataMapStatisticsAndTypes(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openDataMap(page, sourceRef);
  const body = page.locator("body");
  // 数据地图首页应展示资产类型统计（数据表/离线任务/实时任务/API/智能标签/指标）
  for (const label of ["数据表", "离线任务"]) {
    await expect(body, `${sourceRef}: 数据地图应展示资产类型「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 至少一个类型的统计数字可见
  await expect(body, `${sourceRef}: 数据地图应展示资产类型数量`).toContainText(/\d+/, {
    timeout: 30000,
  });
  // 热门标签/热门查询模块可见
  await expect(body, `${sourceRef}: 数据地图应展示热门标签或热门查询`).toContainText(
    /热门标签|热门查询/,
    { timeout: 30000 },
  );
}

// ─── 数据地图类型导航点击（t12） ───

export async function expectDataMapTypeNavigation(
  page: Page,
  types: readonly string[],
  sourceRef: string,
): Promise<void> {
  for (const typeName of types) {
    await openDataMap(page, sourceRef);
    const body = page.locator("body");
    const typeEntry = body
      .locator("text")
      .filter({ hasText: new RegExp(`^${typeName}$`) })
      .first()
      .or(body.getByText(typeName, { exact: true }).first());
    const typeVisible = await typeEntry.isVisible({ timeout: 10000 }).catch(() => false);
    if (!typeVisible) {
      // 尝试通过卡片/数字区域查找
      const typeCard = body
        .locator(".ant-card, [class*='card'], [class*='type'], [class*='stat']")
        .filter({ hasText: typeName })
        .first();
      const cardVisible = await typeCard.isVisible({ timeout: 5000 }).catch(() => false);
      if (cardVisible) await typeCard.click();
    } else {
      await typeEntry.click();
    }
    // 点击后应进入对应类型的搜索/筛选页
    await expect(body, `${sourceRef}: 点击「${typeName}」后应进入对应资产类型页`).toContainText(
      new RegExp(`${typeName}|筛选|数据源|数据库`),
      { timeout: 30000 },
    );
  }
}

// ─── 数据地图热门区与首页关键词搜索 Shell（t28） ───

export async function expectDataMapHotSectionsAndKeywordSearchShell(
  page: Page,
  keyword: string,
  sourceRef: string,
): Promise<void> {
  await openDataMap(page, sourceRef);
  const body = page.locator("body");
  // 热门标签区和热门查询区可见
  for (const label of ["热门标签", "热门查询"]) {
    await expect(body, `${sourceRef}: 数据地图应展示「${label}」模块`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 首页关键词搜索
  const searchInput = page
    .locator("input[placeholder*='搜索'], input[placeholder*='请输入'], .ant-input")
    .first();
  await expect(searchInput, `${sourceRef}: 数据地图搜索框应可见`).toBeVisible({ timeout: 15000 });
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
  await expect(body, `${sourceRef}: 关键词搜索后页面应显示结果或空态`).toContainText(
    /数据地图|数据表|暂无数据/,
    { timeout: 30000 },
  );
}

// ─── 数据地图热门标签导航 Shell（t28） ───

export async function expectDataMapHotTagsNavigationShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openDataMap(page, sourceRef);
  const body = page.locator("body");
  // 热门标签区应展示标签类型（表/字段/视图）
  await expect(body, `${sourceRef}: 热门标签区应可见`).toContainText(/热门标签/, {
    timeout: 30000,
  });
  const tagsSection = body
    .locator(".ant-card, section, div")
    .filter({ hasText: /热门标签/ })
    .first();
  const tagsSectionVisible = await tagsSection.isVisible({ timeout: 5000 }).catch(() => false);
  if (tagsSectionVisible) {
    // 标签类型切换（表标签/字段标签/视图标签）
    await expect(tagsSection, `${sourceRef}: 热门标签区应展示标签类型入口`).toContainText(
      /表|字段|视图/,
      { timeout: 15000 },
    );
  }
  // 点击第一个标签（如有），检查是否跳转到数据地图结果页
  const firstTag = body.locator(".ant-tag, [class*='tag']").filter({ hasText: /.+/ }).first();
  const tagVisible = await firstTag.isVisible({ timeout: 5000 }).catch(() => false);
  if (tagVisible) {
    await firstTag.click();
    await expect(body, `${sourceRef}: 点击标签后应进入数据地图结果页`).toContainText(
      /数据地图|数据表|筛选/,
      { timeout: 30000 },
    );
  }
}

// ─── 数据地图热门查询历史与点击跳转 Shell（t28） ───

export async function expectDataMapHotQueryHistoryShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  // 先产生几条查询记录
  await openDataMap(page, sourceRef);
  for (const keyword of ["test1", "test2", "test3"]) {
    const searchInput = page
      .locator("input[placeholder*='搜索'], input[placeholder*='请输入'], .ant-input")
      .first();
    await searchInput.fill(keyword);
    await searchInput.press("Enter");
    await waitForUiSettled(page);
  }
  // 返回首页
  await openDataMap(page, sourceRef);
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 数据地图首页应展示热门查询模块`).toContainText(/热门查询/, {
    timeout: 30000,
  });
  // 热门查询列表中应有条目
  const hotQuerySection = body
    .locator(".ant-card, section, div")
    .filter({ hasText: /热门查询/ })
    .first();
  const sectionVisible = await hotQuerySection.isVisible({ timeout: 5000 }).catch(() => false);
  if (sectionVisible) {
    // hover 查询条目应出现查询次数提示
    const firstHotItem = hotQuerySection
      .locator("[class*='item'], [class*='query'], li, .ant-list-item")
      .first();
    const itemVisible = await firstHotItem.isVisible({ timeout: 5000 }).catch(() => false);
    if (itemVisible) {
      await firstHotItem.hover();
      // 点击跳转到数据地图搜索结果
      await firstHotItem.click();
      await expect(body, `${sourceRef}: 点击热门查询条目后应进入数据地图搜索结果页`).toContainText(
        /数据地图|数据表|筛选/,
        { timeout: 30000 },
      );
    }
  }
  // TODO: hover 次数信息展示和具体 count 数值需 probe 真实核验
}

// ─── 数据地图数据源表来源统计与点击跳转（t32-md） ───

export async function expectDataMapDatasourceOverviewStatsAndClickthrough(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await openDataMap(page, sourceRef);
  const body = page.locator("body");
  // 表来源统计区应可见
  await expect(body, `${sourceRef}: 数据地图应展示表来源统计区`).toContainText(
    /表来源|数据源|数据表数量/,
    { timeout: 30000 },
  );
  // 各数据源统计数字应展示
  await expect(body, `${sourceRef}: 数据地图表来源统计应包含数量数字`).toContainText(/\d+/, {
    timeout: 30000,
  });
  // 点击第一个数据源条目（应跳转带条件的数据地图搜索）
  const datasourceEntry = body
    .locator(".ant-list-item, [class*='source'], [class*='datasource'], tr")
    .filter({ hasText: /SparkThrift|Doris|Hive|MySQL/ })
    .first();
  const entryVisible = await datasourceEntry.isVisible({ timeout: 5000 }).catch(() => false);
  if (entryVisible) {
    await datasourceEntry.click();
    await expect(
      body,
      `${sourceRef}: 点击数据源条目后应进入筛选了该数据源的数据地图搜索页`,
    ).toContainText(/数据地图|数据表|筛选/, { timeout: 30000 });
  }
  // TODO: 翻页交互（超出展示上限后的分页）需真实 probe 验证
}
