import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl } from "../../helpers/test-setup";

const PROJECT_ID = 92;
const PROJECT_STORAGE_KEY = "X-Valid-Project-ID";
const DQ_PROJECT_STORAGE_KEY = "dq_project_id";

type DqPageTarget = {
  path: string;
  labels: readonly string[];
  tableHeaders?: readonly string[];
  apiPaths?: readonly string[];
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

export async function gotoDataQualityPage(page: Page, path: string): Promise<void> {
  await installProject(page);
  await page.goto(buildDataAssetsUrl(path, PROJECT_ID), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await injectProject(page);
}

export async function expectDataQualityOverviewShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/overview",
    labels: [
      "数据质量概览",
      "规则数",
      "规则集总数",
      "规则任务数",
      "校验通过数/校验异常数",
      "规则库分布",
      "校验异常top排名",
      "近期校验异常结果",
      "总览",
      "规则库配置",
      "规则集管理",
      "规则任务管理",
      "校验结果查询",
      "数据质量报告",
    ],
    tableHeaders: [
      "数据表",
      "所属数据库",
      "所属数据源",
      "任务名称",
      "状态",
      "执行周期",
      "计划时间",
      "开始时间",
      "结束时间",
      "操作",
    ],
    apiPaths: [
      "/dassets/v1/valid/monitorOverview/countRecord",
      "/dassets/v1/valid/monitorOverview/getRuleDistribution",
      "/dassets/v1/valid/monitorOverview/listRecentError",
      "/dassets/v1/valid/monitorOverview/countErrorTopRecord",
    ],
  });
}

export async function expectDataQualityRuleShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/rule",
    labels: ["规则任务管理", "新建监控规则", "最近修改人", "我收藏的表"],
    tableHeaders: [
      "表",
      "任务名称",
      "数据源",
      "执行周期",
      "规则状态",
      "是否关联任务",
      "最近30天告警数",
      "最近修改人",
      "最近修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitor/pageQuery"],
  });
}

export async function expectDataQualityResultShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/taskQuery",
    labels: ["校验结果查询", "计划时间", "最近修改人", "我收藏的表"],
    tableHeaders: [
      "表",
      "任务名称",
      "状态",
      "数据源",
      "执行周期",
      "是否关联任务",
      "计划时间",
      "开始时间",
      "结束时间",
      "运行时长",
      "提交人",
      "最近修改人",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRecord/pageQuery"],
  });
}

export async function expectDataQualityReportShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/qualityReport",
    labels: ["数据质量报告", "已配置报告", "已生成报告", "新增报告"],
    tableHeaders: [
      "报告名称",
      "报告类型",
      "关联数据表",
      "报告周期",
      "生成样式",
      "规则范围",
      "创建人",
      "创建时间",
      "修改人",
      "修改时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorReport/page"],
  });
}

export async function expectDataQualityGeneratedReportTab(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态", "报告详情"]) {
    await expect(body, `${sourceRef}: 已生成报告页签应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
}

export async function expectDataQualityReportCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已配置报告", sourceRef);
  await expect(page.locator("body"), `${sourceRef}: 已配置报告页签应展示新增报告入口`).toContainText("新增报告", {
    timeout: 30000,
  });
  await clickDqText(page, "新增报告", sourceRef);
  await expect(page, `${sourceRef}: 新增报告入口应保持在数据质量报告路由`).toHaveURL(/\/dq\/qualityReport/);

  const body = page.locator("body");
  for (const label of ["新增报告", "报告名称", "报告类型", "报告周期", "生成样式", "规则范围"]) {
    await expect(body, `${sourceRef}: 新增报告页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 新增报告", [
    "/dassets/v1/valid/monitor/allCalender",
  ]);
}

export async function expectDataQualityRuleSetShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleSet",
    labels: ["规则集管理", "新建规则集"],
    tableHeaders: [
      "表名",
      "所属数据库",
      "所属数据源",
      "规则包数量",
      "规则数量",
      "规则集描述",
      "更新人",
      "更新时间",
      "操作",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRuleSet/pageQuery"],
  });
}

export async function expectDataQualityRuleTaskCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/rule");
  await clickDqText(page, "新建监控规则", sourceRef);
  await expect(page, `${sourceRef}: 新建监控规则应进入 /dq/rule/add`).toHaveURL(/\/dq\/rule\/add/);

  const body = page.locator("body");
  for (const label of [
    "新建单表校验规则",
    "监控对象",
    "规则名称",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建监控规则页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
}

export async function expectDataQualityRuleSetCreateEntry(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");
  await clickDqText(page, "新建规则集", sourceRef);
  await expect(page, `${sourceRef}: 新建规则集应进入 /dq/ruleSet/add`).toHaveURL(/\/dq\/ruleSet\/add/);

  const body = page.locator("body");
  for (const label of [
    "新增规则集",
    "基础信息",
    "选择数据源",
    "选择数据库",
    "选择数据表",
    "规则包名称",
    "下一步",
  ]) {
    await expect(body, `${sourceRef}: 新建规则集页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 新建规则集", [
    "/dassets/v1/valid/project/getDefaultMonitorDatasource",
  ]);
}

export async function expectDataQualityRuleBaseShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleBase",
    labels: ["规则库配置", "内置规则", "自定义正则", "自定义sql模版", "导出规则库"],
    tableHeaders: ["规则名称", "规则解释", "规则分类", "关联范围", "关联规则数", "规则状态", "规则描述"],
    apiPaths: ["/dassets/v1/valid/monitorRuleTemplate/pageQuery"],
  });
}

export async function expectDataQualityRuleBaseCustomSqlTemplate(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义sql模版", sourceRef);

  const body = page.locator("body");
  for (const label of ["自定义sql模版", "新增自定义sql模版", "规则名称", "规则分类", "关联范围"]) {
    await expect(body, `${sourceRef}: 自定义 SQL 模版列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 自定义 SQL 模版", [
    "/dassets/v1/valid/monitorRuleCustom/pageList",
  ]);

  await clickDqText(page, "新增自定义sql模版", sourceRef);
  await expect(page, `${sourceRef}: 新增自定义 SQL 模版应进入 /dq/ruleBase/sqlAdd`).toHaveURL(
    /\/dq\/ruleBase\/sqlAdd/,
  );

  for (const label of ["新增自定义SQL模板", "基本信息", "规则名称", "规则分类", "关联范围", "自定义配置"]) {
    await expect(body, `${sourceRef}: 新增自定义 SQL 模版页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleBase 新增自定义 SQL 模版", [
    "/dassets/v1/valid/monitor/getGlobalParams",
  ]);
}

export async function expectDataQualityRuleBaseBuiltInRulesShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/dq/ruleBase",
    labels: [
      "规则库配置",
      "内置规则",
      "多表字段值对比",
      "字段值计算对比",
      "规则名称",
      "规则解释",
      "规则分类",
      "关联范围",
      "规则状态",
    ],
    apiPaths: ["/dassets/v1/valid/monitorRuleTemplate/pageQuery"],
  });
}

export async function expectMetadataIntegrityShell(page: Page, sourceRef: string): Promise<void> {
  await expectDqPage(page, sourceRef, {
    path: "/integrityAnalysis",
    labels: ["元数据质量", "完整度分析", "质量统计", "统计类型", "质量分析", "分析方式"],
    tableHeaders: ["数据源名称", "数据源类型", "表元数据完整度"],
    apiPaths: [
      "/dassets/v1/metaDataValid/totalRateAnalysis",
      "/dassets/v1/metaDataValid/fillRateByDataSource",
    ],
  });
}

async function clickDqText(page: Page, label: string, sourceRef: string): Promise<void> {
  await page.getByText(label, { exact: true }).first().click({
    timeout: 30000,
  });
  await expect(page.locator("body"), `${sourceRef}: 点击「${label}」后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

async function expectDqPage(page: Page, sourceRef: string, target: DqPageTarget): Promise<void> {
  await gotoDataQualityPage(page, target.path);
  const body = page.locator("body");

  for (const label of target.labels) {
    await expect(body, `${sourceRef}: ${target.path} 应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of target.tableHeaders ?? []) {
    await expect(body, `${sourceRef}: ${target.path} 表格应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  if (target.apiPaths?.length) {
    await expectDqApiPaths(page, sourceRef, target.path, target.apiPaths);
  }
}

async function expectDqApiPaths(
  page: Page,
  sourceRef: string,
  target: string,
  apiPaths: readonly string[],
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate((paths) => {
          const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
          return paths.filter((apiPath) => urls.some((url) => url.includes(apiPath)));
        }, [...apiPaths]),
      {
        message: `${sourceRef}: ${target} 应请求核心数据质量接口`,
        timeout: 30000,
      },
    )
    .toEqual([...apiPaths]);
}
