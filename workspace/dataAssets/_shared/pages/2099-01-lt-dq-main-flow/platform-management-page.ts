import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl } from "../../helpers/test-setup";

const PROJECT_ID = 92;
const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

type PlatformPageTarget = {
  path: string;
  clickText?: string;
  labels: readonly string[];
  tableHeaders: readonly string[];
  buttons?: readonly string[];
  apiPaths: readonly string[];
};

async function installProject(page: Page): Promise<void> {
  await page.addInitScript(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  );
}

async function injectProject(page: Page): Promise<void> {
  await page.evaluate(
    ([assetKey, dqKey, projectId]) => {
      sessionStorage.setItem(assetKey, projectId);
      sessionStorage.setItem(dqKey, projectId);
    },
    [PROJECT_STORAGE_KEY, DQ_PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  );
}

export async function gotoPlatformPage(page: Page, path: string): Promise<void> {
  await installProject(page);
  await page.goto(buildDataAssetsUrl(path, PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProject(page);
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
}

export async function expectDataSourceManageShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/dataSourceManage",
    labels: ["平台管理", "数据源管理", "数据源列表", "引入数据源", "质量项目授权"],
    tableHeaders: ["数据源名称", "数据源类型", "描述", "连接信息", "数据源状态", "支持模块", "操作"],
    buttons: ["虚拟数据源", "引入数据源", "质量项目授权", "删除"],
    apiPaths: ["/dassets/v1/dataSource/pageQuery"],
  });
}

export async function expectDataSourceAutoImportShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/dataSourceManage",
    clickText: "数据源自动引入设置",
    labels: ["数据源自动引入设置", "自动引入设置", "离线开发", "智能指标", "标签洞察"],
    tableHeaders: ["子模块名称", "数据源类型", "自动引入设置", "操作"],
    buttons: ["编辑"],
    apiPaths: ["/dmetadata/v1/device/selectWebDevicesByTenantId"],
  });
}

export async function expectUserManageShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/userManage",
    labels: ["平台管理", "用户角色管理", "用户管理", "用户", "用户组", "添加用户"],
    tableHeaders: ["账号", "所属用户组", "邮箱", "手机号", "个人角色", "加入时间", "操作"],
    buttons: ["添加用户", "编辑角色", "移出产品"],
    apiPaths: ["/dassets/v1/user/pageUsers"],
  });
}

export async function expectRoleManageShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/roleManage",
    labels: ["平台管理", "用户角色管理", "角色管理", "权限点", "管理员", "数据开发", "访客"],
    tableHeaders: ["权限点", "管理员", "数据开发", "访客"],
    apiPaths: ["/dassets/v1/role/getRolePermission"],
  });
}

export async function expectNotificationSettingShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/notificationCenter",
    labels: ["平台管理", "通知中心", "通知设置", "通知记录", "接收人", "通知模块"],
    tableHeaders: ["接收人名称", "通知模块", "操作"],
    buttons: ["新 增"],
    apiPaths: ["/dmetadata/v1/notify/pageQuery"],
  });
}

export async function expectNotificationRecordShell(page: Page, sourceRef: string): Promise<void> {
  await expectPlatformPage(page, sourceRef, {
    path: "/notificationCenter",
    clickText: "通知记录",
    labels: ["平台管理", "通知中心", "通知记录", "通知模块", "接收人", "通知时间"],
    tableHeaders: ["通知模块", "接收人名称", "通知方式", "webhook", "通知内容", "通知时间"],
    apiPaths: ["/dmetadata/v1/alert/pageQuery"],
  });
}

async function expectPlatformPage(page: Page, sourceRef: string, target: PlatformPageTarget): Promise<void> {
  await gotoPlatformPage(page, target.path);
  expect(page.url(), `${sourceRef}: ${target.path} 不应被重定向到其他路由`).toContain(`#${target.path}`);

  if (target.clickText) {
    await page.getByText(target.clickText, { exact: true }).first().click({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
  }

  const body = page.locator("body");
  for (const label of target.labels) {
    await expect(body, `${sourceRef}: ${target.path} 应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of target.tableHeaders) {
    await expect(body, `${sourceRef}: ${target.path} 表格应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  for (const button of target.buttons ?? []) {
    await expect(body, `${sourceRef}: ${target.path} 应展示按钮「${button}」`).toContainText(button, {
      timeout: 30000,
    });
  }

  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((apiPath) => urls.some((url) => url.includes(apiPath)));
        }, [...target.apiPaths]),
      {
        message: `${sourceRef}: ${target.path} 应请求核心平台管理接口`,
        timeout: 30000,
      },
    )
    .toEqual([...target.apiPaths]);
}
