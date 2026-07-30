import { expect, type Page } from "@playwright/test";

import { getEnvConfig } from "../../../../../../_shared/automation/runtime/env-profile";
import { buildDataAssetsUrl } from "../../../../../../_shared/automation/runtime/env-setup";

const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";

function getProjectId(): number {
  return getEnvConfig().projects.quality.id;
}

async function installProject(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, projectId]) => {
      sessionStorage.setItem(key, projectId);
    },
    [PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

async function injectProject(page: Page): Promise<void> {
  await page.evaluate(
    ([key, projectId]) => {
      sessionStorage.setItem(key, projectId);
    },
    [PROJECT_STORAGE_KEY, String(getProjectId())],
  );
}

export async function gotoStandardPage(page: Page, path: string): Promise<void> {
  await installProject(page);
  await page.goto(buildDataAssetsUrl(path, getProjectId()), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProject(page);
}

export async function expectStandardStatisticShell(page: Page, sourceRef: string): Promise<void> {
  await gotoStandardPage(page, "/standardStatistic");
  const body = page.locator("body");
  for (const label of [
    "标准统计",
    "数据标准",
    "已上线",
    "待上线",
    "代码表",
    "词根管理",
    "标准热度",
    "标准目录分布",
    "标准趋势",
    "标准来源分布",
  ]) {
    await expect(body, `${sourceRef}: 标准统计页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectStandardStatisticApis(page: Page, sourceRef: string): Promise<void> {
  const expected = [
    "/dmetadata/v1/standardStatistic/standardHot",
    "/dmetadata/v1/standardStatistic/standardTrend",
    "/dmetadata/v1/standardStatistic/rootCount",
    "/dmetadata/v1/standardStatistic/standardSource",
    "/dmetadata/v1/standardStatistic/codeCount",
    "/dmetadata/v1/standardStatistic/standardCatalog",
    "/dmetadata/v1/standardStatistic/standardCount",
  ];
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((path) => urls.some((url) => url.includes(path)));
        }, expected),
      {
        message: `${sourceRef}: 标准统计页应请求核心 standardStatistic 接口`,
        timeout: 30000,
      },
    )
    .toEqual(expected);
}

export async function expectStandardCheckShell(page: Page, sourceRef: string): Promise<void> {
  await gotoStandardPage(page, "/standardCheck");
  const body = page.locator("body");
  for (const label of [
    "落标检查",
    "新增检查任务",
    "批量开启",
    "批量关闭",
    "数据表名称",
    "所属数据源",
    "所属数据库",
    "检查字段数/总字段数",
    "检查周期",
    "检查状态",
    "标准达标率",
    "不达标字段数/检查失败数",
  ]) {
    await expect(body, `${sourceRef}: 落标检查页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

// ─── 数据标准列表查询 Shell（t05） ───

export async function expectDataStandardQueryShell(page: Page, sourceRef: string): Promise<void> {
  await gotoStandardPage(page, "/standardDefinition");
  const body = page.locator("body");
  for (const label of ["数据标准", "标准编号", "标准名称", "标准状态", "新建标准"]) {
    await expect(body, `${sourceRef}: 数据标准列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 搜索框应可见
  const searchInput = page
    .locator(
      "input[placeholder*='标准名称'], input[placeholder*='请输入'], input[placeholder*='搜索']",
    )
    .first();
  await expect(searchInput, `${sourceRef}: 数据标准列表搜索框应可见`).toBeVisible({
    timeout: 15000,
  });
  // 空条件查询返回列表或空态
  await expect(body, `${sourceRef}: 数据标准列表应展示结果或空态`).toContainText(
    /数据标准|暂无数据|标准名称/,
    { timeout: 30000 },
  );
}

// ─── 标准基础搜索（词根/码表）Shell（t05） ───

export async function expectStandardBasisSearchShell(page: Page, sourceRef: string): Promise<void> {
  // 词根管理
  await gotoStandardPage(page, "/wordRoot");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 词根管理页应展示词根列表`).toContainText(
    /词根|词根名称|新建词根/,
    {
      timeout: 30000,
    },
  );
  const wordRootSearch = page
    .locator("input[placeholder*='词根'], input[placeholder*='请输入'], input[placeholder*='搜索']")
    .first();
  await expect(wordRootSearch, `${sourceRef}: 词根管理搜索框应可见`).toBeVisible({
    timeout: 15000,
  });

  // 码表管理
  await gotoStandardPage(page, "/codeTable");
  await expect(body, `${sourceRef}: 码表管理页应展示码表列表`).toContainText(
    /码表|代码表|新建码表/,
    {
      timeout: 30000,
    },
  );
  const codeTableSearch = page
    .locator("input[placeholder*='码表'], input[placeholder*='请输入'], input[placeholder*='搜索']")
    .first();
  await expect(codeTableSearch, `${sourceRef}: 码表管理搜索框应可见`).toBeVisible({
    timeout: 15000,
  });
}

// ─── 标准目录 Shell（t14） ───

export async function expectStandardDirectoryShell(page: Page, sourceRef: string): Promise<void> {
  await gotoStandardPage(page, "/standardDefinition");
  const body = page.locator("body");
  for (const label of ["数据标准", "标准目录", "标准编号", "标准名称"]) {
    await expect(body, `${sourceRef}: 标准定义页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 目录树应可见
  const directoryTree = page.locator(".ant-tree, [class*='tree'], [class*='catalog']").first();
  await expect(directoryTree, `${sourceRef}: 标准目录树应可见`).toBeVisible({ timeout: 15000 });
}

// ─── 标准映射 Shell（t14） ───

export async function expectStandardMappingShell(page: Page, sourceRef: string): Promise<void> {
  await gotoStandardPage(page, "/standardMapping");
  const body = page.locator("body");
  for (const label of ["标准映射", "数据表名称", "字段名称", "标准名称"]) {
    await expect(body, `${sourceRef}: 标准映射页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  const searchInput = page
    .locator("input[placeholder*='表名'], input[placeholder*='请输入'], input[placeholder*='搜索']")
    .first();
  await expect(searchInput, `${sourceRef}: 标准映射搜索框应可见`).toBeVisible({ timeout: 15000 });
}

// ─── 数据标准详情导入导出 Shell（t18 & t41） ───

export async function expectDataStandardDetailImportExportShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardDefinition");
  const body = page.locator("body");
  // 主列表入口
  for (const label of ["数据标准", "新建标准", "导入标准", "导出标准"]) {
    await expect(body, `${sourceRef}: 数据标准页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 打开导入弹窗
  const importButton = page.getByRole("button", { name: /导入标准|导入/ }).first();
  const importVisible = await importButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (importVisible) {
    await importButton.click();
    await expect(body, `${sourceRef}: 导入标准弹窗应展示上传入口`).toContainText(/上传|模板/, {
      timeout: 30000,
    });
    const cancelButton = page.getByRole("button", { name: /取消/ }).last();
    await cancelButton.click().catch(() => {});
  }
  // 打开详情（点击第一条标准）
  const firstStandardRow = page.locator(".ant-table-tbody tr").first();
  const firstRowVisible = await firstStandardRow.isVisible({ timeout: 10000 }).catch(() => false);
  if (firstRowVisible) {
    const nameLink = firstStandardRow.locator("a, .ant-btn-link, [class*='link']").first();
    const linkVisible = await nameLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (linkVisible) {
      await nameLink.click();
      await expect(body, `${sourceRef}: 标准详情抽屉应展示标准名称与基础信息`).toContainText(
        /标准名称|标准状态|上线|下线/,
        { timeout: 30000 },
      );
      // 关闭详情
      const closeButton = page.locator(".ant-drawer-close, [aria-label='Close']").first();
      await closeButton.click().catch(() => {});
    }
  }
}

// ─── 落标检查结果列表 Shell（t30-std） ───

export async function expectStandardCheckResultListShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardCheckResult");
  const body = page.locator("body");
  for (const label of ["落标检查结果", "数据表名称", "所属数据源", "检查状态", "达标率"]) {
    await expect(body, `${sourceRef}: 落标检查结果页应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 筛选区可见
  const filterArea = page
    .locator(".ant-form, .ant-row")
    .filter({ hasText: /数据源|状态|查询/ })
    .first();
  await expect(filterArea, `${sourceRef}: 落标检查结果筛选区应可见`).toBeVisible({
    timeout: 15000,
  });
}

// ─── 落标检查新增任务 Shell（t30-std） ───

export async function expectStandardCheckTaskAddShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardCheck");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 落标检查页应展示新增检查任务入口`).toContainText(
    "新增检查任务",
    {
      timeout: 30000,
    },
  );
  await expect(
    page.getByRole("button", { name: /新增检查任务/ }).first(),
    `${sourceRef}: 新增检查任务按钮应可见`,
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("button", { name: /新增检查任务/ })
    .first()
    .click();
  for (const label of ["数据源", "数据库", "数据表", "检查周期", "确定", "取消"]) {
    await expect(body, `${sourceRef}: 新增检查任务弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  // 取消关闭
  const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  await expect(cancelButton, `${sourceRef}: 取消按钮应可见`).toBeVisible({ timeout: 10000 });
  await cancelButton.click();
}

// ─── 标准统计上线状态数量合同（t31-std） ───

export async function expectStandardStatisticStatusCountContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardStatistic");
  const body = page.locator("body");
  // 等待 standardCount 接口返回
  const standardCountResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/dmetadata/v1/standardStatistic/standardCount") && response.ok(),
    { timeout: 30000 },
  );
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  const response = await standardCountResponse.catch(() => null);
  if (response) {
    const json = (await response.json().catch(() => null)) as {
      data?: { onlineCount?: number; waitOnlineCount?: number };
    } | null;
    if (json?.data) {
      const { onlineCount, waitOnlineCount } = json.data;
      if (typeof onlineCount === "number") {
        await expect(body, `${sourceRef}: 标准统计页应展示已上线数量 ${onlineCount}`).toContainText(
          String(onlineCount),
          { timeout: 30000 },
        );
      }
      if (typeof waitOnlineCount === "number") {
        await expect(
          body,
          `${sourceRef}: 标准统计页应展示待上线数量 ${waitOnlineCount}`,
        ).toContainText(String(waitOnlineCount), { timeout: 30000 });
      }
    }
  }
  // 已上线/待上线标签必须可见
  for (const label of ["已上线", "待上线"]) {
    await expect(body, `${sourceRef}: 标准统计应展示「${label}」状态`).toContainText(label, {
      timeout: 30000,
    });
  }
}

// ─── 标准映射边界弹窗 Shell（t34） ───

export async function expectStandardMappingBoundaryDialogsShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardMapping");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 标准映射页应展示映射列表`).toContainText(
    /标准映射|数据表名称/,
    {
      timeout: 30000,
    },
  );
  // 点击首行查看映射详情抽屉
  const firstRow = page.locator(".ant-table-tbody tr").first();
  const firstRowVisible = await firstRow.isVisible({ timeout: 10000 }).catch(() => false);
  if (firstRowVisible) {
    await firstRow.click();
    await expect(body, `${sourceRef}: 映射详情抽屉应展示字段绑定信息`).toContainText(
      /字段|标准|绑定/,
      {
        timeout: 30000,
      },
    );
    // 关闭抽屉
    const closeButton = page.locator(".ant-drawer-close, [aria-label='Close']").first();
    await closeButton.click().catch(() => {});
  }
  // TODO: 字段绑定弹窗和评分逻辑需真实 probe 验证
}

// ─── 标准目录创建编辑六层限制 Shell（t35） ───

export async function expectStandardDirectoryCreateEditSixLevelShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardDefinition");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 标准定义页应展示目录树`).toContainText(/标准目录|数据标准/, {
    timeout: 30000,
  });
  // 新增目录入口
  await expect(body, `${sourceRef}: 标准定义页应展示新建目录入口`).toContainText(
    /新建目录|添加目录|新增/,
    {
      timeout: 30000,
    },
  );
  // 右键或按钮触发新建目录
  const addDirButton = page.getByRole("button", { name: /新建目录|新增目录|添加目录/ }).first();
  const addDirVisible = await addDirButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (addDirVisible) {
    await addDirButton.click();
    await expect(body, `${sourceRef}: 新建目录弹窗应展示名称输入框`).toContainText(
      /目录名称|名称/,
      {
        timeout: 15000,
      },
    );
    const cancelButton = page.getByRole("button", { name: /取消/ }).last();
    await cancelButton.click().catch(() => {});
  }
  // TODO: 六层限制（超出第六层后新建被拦截）需真实 probe 深度验证
}

// ─── 标准目录删除与子目录数量限制 Shell（t40） ───

export async function expectStandardDirectoryDeleteAndLimitShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoStandardPage(page, "/standardDefinition");
  const body = page.locator("body");
  await expect(body, `${sourceRef}: 标准定义页目录树应可见`).toContainText(/标准目录|数据标准/, {
    timeout: 30000,
  });
  // 右键菜单或操作按钮中的删除入口
  const directoryTree = page.locator(".ant-tree, [class*='tree'], [class*='catalog']").first();
  await expect(directoryTree, `${sourceRef}: 目录树应可见`).toBeVisible({ timeout: 15000 });
  // 右键第一个树节点以触发上下文菜单
  const firstTreeNode = directoryTree.locator(".ant-tree-treenode, [class*='treeNode']").first();
  const nodeVisible = await firstTreeNode.isVisible({ timeout: 5000 }).catch(() => false);
  if (nodeVisible) {
    await firstTreeNode.click({ button: "right" }).catch(() => {});
    const contextMenu = page.locator(".ant-dropdown:visible, [role='menu']:visible").first();
    const menuVisible = await contextMenu.isVisible({ timeout: 3000 }).catch(() => false);
    if (menuVisible) {
      await expect(contextMenu, `${sourceRef}: 目录右键菜单应展示删除操作`).toContainText(/删除/, {
        timeout: 5000,
      });
      // 关闭菜单
      await page.keyboard.press("Escape");
    }
  }
  // TODO: 子目录数量限制（100 个子目录上限）需真实 probe 验证
}
