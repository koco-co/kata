import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl } from "../../helpers/test-setup";

const PROJECT_ID = 92;
const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

type SecurityPageTarget = {
  path: string;
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

export async function gotoDataSecurityPage(page: Page, path: string): Promise<void> {
  await installProject(page);
  await page.goto(buildDataAssetsUrl(path, PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProject(page);
}

export async function expectDataPermissionAssignShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/dataAuth/permissionAssign",
    labels: ["数据安全", "数据权限管理", "权限分配", "权限回收", "用户组"],
    tableHeaders: ["数据源", "数据库", "数据表", "表权限", "有效期", "用户", "用户组", "操作"],
    buttons: ["重 置", "查 询", "新 增", "删 除"],
    apiPaths: ["/dmetadata/v1/dataPermission/pageQueryStrategy"],
  });
}

export async function expectDataDesensitizationRuleShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/dataDesensitization",
    labels: ["数据安全", "数据脱敏管理", "新增规则"],
    tableHeaders: ["规则名称", "直接脱敏表", "脱敏方式", "最近修改人", "最近修改时间", "操作"],
    buttons: ["新增规则"],
    apiPaths: ["/dassets/v1/dataMaskingRule/list"],
  });
}

export async function expectDataDesensitizationUseShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/useDesensitization",
    labels: ["数据安全", "数据脱敏管理", "脱敏规则", "添加脱敏表"],
    tableHeaders: ["直接脱敏表", "脱敏字段", "数据源", "数据库", "血缘脱敏表", "血缘启用状态", "操作"],
    buttons: ["添加脱敏表", "批量开启", "批量关闭"],
    apiPaths: ["/dassets/v1/dataMaskingTable/pageQuery"],
  });
}

export async function expectDataClassifyGradeShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/dataClassify/gradeManage",
    labels: [
      "数据安全",
      "数据分级分类",
      "级别管理",
      "自动分级",
      "分级数据",
      "机密",
      "秘密",
      "核心商密",
      "普通商密",
      "内部",
      "公开",
    ],
    tableHeaders: ["级别", "级别名称", "级别描述", "开放用户等级", "更新时间", "操作"],
    buttons: ["添加级别", "编辑", "删除", "置顶"],
    apiPaths: ["/dmetadata/v1/ranks/list"],
  });
}

export async function expectAutoClassifyRuleShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/dataClassify/hierarchicalSet",
    labels: ["数据安全", "数据分级分类", "自动分级", "分类"],
    tableHeaders: ["规则名称", "分类", "级别", "更新时间", "状态", "操作"],
    buttons: ["重 置", "添 加", "重新生效", "删 除"],
    apiPaths: ["/dmetadata/v1/rank/rules/page", "/dmetadata/v1/rank/classes/tree"],
  });
}

export async function expectRankDataShell(page: Page, sourceRef: string): Promise<void> {
  await expectSecurityPage(page, sourceRef, {
    path: "/dataClassify/rankData",
    labels: [
      "数据安全",
      "数据分级分类",
      "分级数据",
      "数据级别",
      "机密",
      "秘密",
      "核心商密",
      "普通商密",
      "内部",
      "公开",
      "手动分级",
    ],
    tableHeaders: [
      "字段名",
      "级别",
      "字段中文名",
      "分类",
      "分级方式",
      "表名",
      "数据库",
      "数据源",
      "数据源类型",
      "分级时间",
      "操作",
    ],
    buttons: ["重 置", "手动分级", "下 架"],
    apiPaths: ["/dmetadata/v1/rank/datas/page"],
  });
}

async function expectSecurityPage(page: Page, sourceRef: string, target: SecurityPageTarget): Promise<void> {
  await gotoDataSecurityPage(page, target.path);
  expect(page.url(), `${sourceRef}: ${target.path} 不应被重定向到其他路由`).toContain(`#${target.path}`);

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
        message: `${sourceRef}: ${target.path} 应请求核心数据安全接口`,
        timeout: 30000,
      },
    )
    .toEqual([...target.apiPaths]);
}
