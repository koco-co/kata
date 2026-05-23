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

type DqRuleTaskRecord = {
  tableName?: string;
  ruleName?: string;
  sourceTypeName?: string;
  dataName?: string;
  assetsPeriodTypeName?: string;
  periodTypeName?: string;
  recentNotifyNum?: number | string;
  modifyUser?: string[] | string;
  gmtModified?: string;
  isClosed?: number;
  associated?: number;
};

type DqRuleTaskPageQuery = {
  success?: boolean;
  code?: number;
  data?: {
    data?: DqRuleTaskRecord[];
    rows?: DqRuleTaskRecord[];
    list?: DqRuleTaskRecord[];
    records?: DqRuleTaskRecord[];
    total?: number;
    totalCount?: number;
    count?: number;
  };
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

export async function expectDataQualityOverviewDashboardContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  const overviewApiPaths = [
    "/dassets/v1/valid/monitorOverview/countRecord",
    "/dassets/v1/valid/monitorOverview/getRuleDistribution",
    "/dassets/v1/valid/monitorOverview/listRecentError",
    "/dassets/v1/valid/monitorOverview/countErrorTopRecord",
  ] as const;
  await gotoDataQualityPage(page, "/dq/overview");

  const body = page.locator("body");
  for (const label of [
    "数据质量概览",
    "规则数",
    "规则集总数",
    "规则任务数",
    "校验通过数/校验异常数",
    "规则库分布",
    "已配置规则分类",
    "校验异常top排名",
    "近期校验异常结果",
  ]) {
    await expect(body, `${sourceRef}: 数据质量总览应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const header of [
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
  ]) {
    await expect(body, `${sourceRef}: 近期校验异常结果列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expect(
    page.locator("canvas, svg").filter({ visible: true }).first(),
    `${sourceRef}: 总览趋势/分布/排行图表应渲染为可见图形容器`,
  ).toBeVisible({ timeout: 30000 });

  await expect
    .poll(
      () => page.locator("canvas, svg").filter({ visible: true }).count(),
      {
        message: `${sourceRef}: 总览应至少渲染 3 个可见图形容器`,
        timeout: 30000,
      },
    )
    .toBeGreaterThanOrEqual(3);

  await expectDqApiPaths(page, sourceRef, "/dq/overview 总览数据接口", overviewApiPaths);
}

export async function expectDataQualityOverviewMoreLink(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/overview");
  await clickDqText(page, "查看更多", sourceRef);
  await expect(page, `${sourceRef}: 近期校验异常结果「查看更多」应跳转至校验结果查询`).toHaveURL(
    /\/dq\/taskQuery/,
    { timeout: 30000 },
  );
  await expect(page.locator("body"), `${sourceRef}: 跳转后应展示校验结果查询页面`).toContainText(
    "校验结果查询",
    { timeout: 30000 },
  );
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

export async function expectDataQualityRuleTaskListContract(page: Page, sourceRef: string): Promise<void> {
  const pageQueryResponse = page.waitForResponse(
    (response) => response.url().includes("/dassets/v1/valid/monitor/pageQuery") && response.status() === 200,
    { timeout: 60000 },
  );
  await gotoDataQualityPage(page, "/dq/rule");

  await expect(page, `${sourceRef}: 规则任务管理应保持在 /dq/rule 路由`).toHaveURL(/\/dq\/rule/, {
    timeout: 30000,
  });
  const body = page.locator("body");
  for (const label of ["规则任务管理", "最近修改人", "我收藏的表", "新建监控规则"]) {
    await expect(body, `${sourceRef}: 规则任务管理页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const header of [
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
  ]) {
    await expect(body, `${sourceRef}: 规则任务列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  const payload = (await (await pageQueryResponse).json()) as DqRuleTaskPageQuery;
  expect(payload.success ?? payload.code === 1, `${sourceRef}: monitor/pageQuery 应返回成功状态`).toBe(true);
  const records = getDqRuleTaskRecords(payload);
  expect(records.length, `${sourceRef}: monitor/pageQuery 应返回至少一条规则任务记录`).toBeGreaterThan(0);
  expect(getDqRuleTaskTotal(payload), `${sourceRef}: monitor/pageQuery total 应覆盖当前返回记录数`).toBeGreaterThanOrEqual(
    records.length,
  );

  const firstRecord = records[0];
  const tableName = expectNonEmptyString(firstRecord.tableName, `${sourceRef}: API 首条记录应包含 tableName`);
  const ruleName = expectNonEmptyString(firstRecord.ruleName, `${sourceRef}: API 首条记录应包含 ruleName`);
  const dataSource = [
    expectNonEmptyString(firstRecord.sourceTypeName, `${sourceRef}: API 首条记录应包含 sourceTypeName`),
    expectNonEmptyString(firstRecord.dataName, `${sourceRef}: API 首条记录应包含 dataName`),
  ].join(" / ");
  const period = expectNonEmptyString(
    firstRecord.assetsPeriodTypeName ?? firstRecord.periodTypeName,
    `${sourceRef}: API 首条记录应包含执行周期`,
  );
  const status = formatDqRuleTaskStatus(firstRecord.isClosed, sourceRef);
  const associated = formatDqRuleTaskAssociated(firstRecord.associated, sourceRef);
  const recentNotifyNum = String(firstRecord.recentNotifyNum);
  expect(recentNotifyNum, `${sourceRef}: API 首条记录应包含最近30天告警数`).toMatch(/^\d+$/);
  const modifyUser = formatDqRuleTaskModifyUser(firstRecord.modifyUser, sourceRef);
  const gmtModified = expectNonEmptyString(firstRecord.gmtModified, `${sourceRef}: API 首条记录应包含最近修改时间`);

  const firstRecordRow = page.locator(".ant-table-tbody tr", { hasText: ruleName }).filter({ hasText: tableName }).first();
  await expect(firstRecordRow, `${sourceRef}: 规则任务列表应展示 API 首条记录 ${ruleName}`).toBeVisible({
    timeout: 30000,
  });
  for (const expectedText of [tableName, ruleName, dataSource, period, status, associated, recentNotifyNum, modifyUser, gmtModified]) {
    await expect(firstRecordRow, `${sourceRef}: API 首条记录字段「${expectedText}」应在表格行中展示`).toContainText(
      expectedText,
      { timeout: 30000 },
    );
  }
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

export async function expectDataQualityResultFilterContract(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/taskQuery");

  const body = page.locator("body");
  for (const label of ["校验结果查询", "计划时间", "最近修改人", "我收藏的表"]) {
    await expect(body, `${sourceRef}: 校验结果查询筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const placeholder of ["请输入表名/任务名称搜索", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 校验结果查询应展示占位符「${placeholder}」`,
    ).toBeVisible({ timeout: 30000 });
  }

  for (const header of [
    "表",
    "任务名称",
    "状态",
    "数据源",
    "执行周期",
    "计划时间",
    "开始时间",
    "结束时间",
    "运行时长",
    "提交人",
    "最近修改人",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 校验结果查询列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/taskQuery 筛选列表", [
    "/dassets/v1/valid/monitorRecord/pageQuery",
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

export async function expectDataQualityRuleSetFilterContract(page: Page, sourceRef: string): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleSet");

  const body = page.locator("body");
  await expect(body, `${sourceRef}: 规则集管理应展示新建规则集入口`).toContainText("新建规则集", {
    timeout: 30000,
  });
  await expect(
    page.getByPlaceholder("输入表名搜索").first(),
    `${sourceRef}: 规则集管理应展示表名搜索输入框`,
  ).toBeVisible({ timeout: 30000 });

  for (const header of [
    "表名",
    "所属数据库",
    "所属数据源",
    "规则包数量",
    "规则数量",
    "规则集描述",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 规则集管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/ruleSet 筛选列表", [
    "/dassets/v1/valid/monitorRuleSet/pageQuery",
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

export async function expectDataQualityRuleBaseCustomRegexContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/ruleBase");
  await clickDqText(page, "自定义正则", sourceRef);

  const body = page.locator("body");
  for (const label of ["自定义正则", "新增自定义正则", "规则名称", "规则分类", "关联范围", "关联规则数", "规则描述"]) {
    await expect(body, `${sourceRef}: 自定义正则列表应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    page.locator("input[placeholder='请输入规则名称进行搜索']:visible").first(),
    `${sourceRef}: 自定义正则列表应展示规则名称搜索输入框`,
  ).toBeVisible({ timeout: 30000 });
}

export async function expectDataQualityGeneratedReportFilterContract(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/qualityReport");
  await clickDqText(page, "已生成报告", sourceRef);

  const body = page.locator("body");
  for (const label of ["已生成报告", "报告名称", "数据表", "生成时间", "报告状态"]) {
    await expect(body, `${sourceRef}: 已生成报告筛选区应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }

  for (const placeholder of ["请输入报告名称", "请输入数据表名", "开始日期", "结束日期"]) {
    await expect(
      page.getByPlaceholder(placeholder).first(),
      `${sourceRef}: 已生成报告应展示占位符「${placeholder}」`,
    ).toBeVisible({ timeout: 30000 });
  }

  for (const header of [
    "报告名称",
    "报告类型",
    "关联数据表",
    "生成样式",
    "规则范围",
    "数据周期",
    "报告状态",
    "生成时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: 已生成报告列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/qualityReport 已生成报告筛选列表", [
    "/dassets/v1/valid/monitorReportRecord/pageList",
  ]);
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

export async function expectDataQualityCommonConfigJsonShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");

  const body = page.locator("body");
  for (const label of ["通用配置", "json格式校验管理"]) {
    await expect(body, `${sourceRef}: json格式校验管理页面应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  for (const label of ["导入", "导出", "新增"]) {
    await expectDqCompactButton(page, label, sourceRef);
  }

  for (const header of [
    "key",
    "中文名称",
    "value格式",
    "数据源类型",
    "创建人",
    "创建时间",
    "更新人",
    "更新时间",
    "操作",
  ]) {
    await expect(body, `${sourceRef}: json格式校验管理列表应展示列「${header}」`).toContainText(header, {
      timeout: 30000,
    });
  }

  await expectDqApiPaths(page, sourceRef, "/dq/generalConfig/jsonValidationConfig 列表", [
    "/dassets/v1/valid/jsonValidationConfig/getTreeByPage",
  ]);
}

export async function expectDataQualityCommonConfigJsonImportModalShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导入", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 导入弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["导入", "重复处理规则", "重复则跳过", "上传文件"]) {
    await expect(modal, `${sourceRef}: 导入弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(
    modal.locator("input[type='file']").first(),
    `${sourceRef}: 导入弹窗应包含文件上传控件`,
  ).toBeAttached({ timeout: 30000 });
  await closeDqModal(page, sourceRef);
}

export async function expectDataQualityCommonConfigJsonExportConfirmShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "导出", sourceRef);

  const body = page.locator("body");
  await expect(
    body,
    `${sourceRef}: 导出只验证确认壳，不点击确认下载`,
  ).toContainText("请确认是否导出列表数据", { timeout: 30000 });
  await clickDqCompactButton(page, "取消", sourceRef);
}

export async function expectDataQualityCommonConfigJsonAddRegexShell(
  page: Page,
  sourceRef: string,
): Promise<void> {
  await gotoDataQualityPage(page, "/dq/generalConfig/jsonValidationConfig");
  await clickDqCompactButton(page, "新增", sourceRef);

  const modal = page.locator(".ant-modal:visible").last();
  await expect(modal, `${sourceRef}: 新增弹窗应打开`).toBeVisible({ timeout: 30000 });
  for (const label of ["新建", "key", "中文名称", "value格式", "数据源类型"]) {
    await expect(modal, `${sourceRef}: 新增弹窗应展示「${label}」`).toContainText(label, {
      timeout: 30000,
    });
  }
  await expect(modal, `${sourceRef}: 数据源类型默认应展示 SparkThrift2.x`).toContainText(
    /SparkThrift2\.x|sparkthrift2\.x/i,
    { timeout: 30000 },
  );
  await expect(
    modal.getByText("测试数据", { exact: true }),
    `${sourceRef}: 未填写 value格式 前不展示测试数据输入`,
  ).toHaveCount(0);

  const valueFormatInput = modal
    .locator(".ant-form-item")
    .filter({ hasText: "value格式" })
    .locator("input")
    .first();
  await valueFormatInput.fill("^[a-zA-Z]+$");

  await expect(modal, `${sourceRef}: value格式填写后应展示正则测试区域`).toContainText("测试数据", {
    timeout: 30000,
  });
  const testDataInput = modal.locator("textarea").first();
  await expect(testDataInput, `${sourceRef}: 正则测试输入框应可见`).toBeVisible({ timeout: 30000 });
  await testDataInput.fill("testValue");

  const regexTestButton = modal.getByRole("button", { name: /正则匹配测试/ }).first();
  await expect(regexTestButton, `${sourceRef}: 正则匹配测试按钮应可见`).toBeVisible({
    timeout: 30000,
  });
  await regexTestButton.click();
  await expect(modal, `${sourceRef}: 正则匹配测试应显示成功结果`).toContainText(/符合正则|匹配成功/, {
    timeout: 30000,
  });
  await closeDqModal(page, sourceRef);
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

async function clickDqCompactButton(page: Page, label: string, sourceRef: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await page
    .getByRole("button", { name: new RegExp(`^${spacedLabel}$`) })
    .first()
    .click({ timeout: 30000 });
  await expect(page.locator("body"), `${sourceRef}: 点击「${label}」后页面主体应仍可见`).toBeVisible({
    timeout: 30000,
  });
}

async function expectDqCompactButton(page: Page, label: string, sourceRef: string): Promise<void> {
  const spacedLabel = label.split("").join("\\s*");
  await expect(
    page.getByRole("button", { name: new RegExp(`^${spacedLabel}$`) }).first(),
    `${sourceRef}: 应展示「${label}」按钮`,
  ).toBeVisible({ timeout: 30000 });
}

async function closeDqModal(page: Page, sourceRef: string): Promise<void> {
  const modal = page.locator(".ant-modal:visible").last();
  await modal.locator(".ant-modal-close").first().click({ timeout: 30000 });
  await expect(modal, `${sourceRef}: 弹窗应关闭且未提交`).toBeHidden({ timeout: 30000 });
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

function getDqRuleTaskRecords(payload: DqRuleTaskPageQuery): DqRuleTaskRecord[] {
  return payload.data?.data ?? payload.data?.rows ?? payload.data?.list ?? payload.data?.records ?? [];
}

function getDqRuleTaskTotal(payload: DqRuleTaskPageQuery): number {
  return payload.data?.total ?? payload.data?.totalCount ?? payload.data?.count ?? 0;
}

function expectNonEmptyString(value: unknown, message: string): string {
  expect(typeof value, message).toBe("string");
  const text = value as string;
  expect(text.length, message).toBeGreaterThan(0);
  return text;
}

function formatDqRuleTaskStatus(isClosed: unknown, sourceRef: string): string {
  expect([0, 1], `${sourceRef}: API isClosed 应为 0 或 1`).toContain(isClosed);
  return isClosed === 0 ? "已开启检测" : "已关闭检测";
}

function formatDqRuleTaskAssociated(associated: unknown, sourceRef: string): string {
  expect([0, 1], `${sourceRef}: API associated 应为 0 或 1`).toContain(associated);
  return associated === 1 ? "是" : "否";
}

function formatDqRuleTaskModifyUser(modifyUser: unknown, sourceRef: string): string {
  if (Array.isArray(modifyUser)) {
    return expectNonEmptyString(modifyUser[0], `${sourceRef}: API modifyUser 应包含最近修改人`);
  }
  return expectNonEmptyString(modifyUser, `${sourceRef}: API modifyUser 应包含最近修改人`);
}
