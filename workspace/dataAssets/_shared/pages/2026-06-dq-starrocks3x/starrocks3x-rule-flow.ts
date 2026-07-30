import { waitForUiSettled } from "../../helpers/index";
// StarRocks3.x 数据质量「单表校验规则」深链路操作：建规则 → 详情抽屉 → 立即执行 → 轮询实例 → 编辑期望值 → 删除清理。
// 全部流程已对 zszq-test/pw_sr3 真实环境探测验证（SourceRef: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ）。
import { type Page, expect } from "@playwright/test";
import { loadPlaywrightAutomationConfig } from "../../../../../runtime/automation/playwright-config";

import { locateFormItem, selectAntOption } from "../../helpers/index";
import { STARROCKS3X_DATASOURCE_LABEL } from "./fixtures";
import {
  gotoZszqDataAssetsPage,
  postDataAssetsApi,
  projectId,
  selectStarRocksDatasource,
} from "./starrocks3x-quality-page";


// MonitorStatus（后端 com.dtstack.assets.common.enums.MonitorStatus）实例状态码：
// 0等待运行/1运行中/2运行失败/3校验通过/4校验不通过/5关联失败/6取消/7冻结/8已提交/9提交失败/10停止中/11校验异常/12校验中/13已停止。
const STATUS_PASS = 3;
// 终态集合（非终态={0,1,8,10,12} 等待/运行中/已提交/停止中/校验中）。
const TERMINAL_STATUSES = new Set([2, 3, 4, 5, 6, 7, 9, 11, 13]);
// 「校验异常」桶（UI 任务查询：校验不通过(4) 与 校验异常(11) 都显示为校验异常）。
const STATUS_ABNORMAL = new Set([4, 11]);

// ─── 类型 ───

/** 单表校验规则配置（一个规则块） */
export type SingleTableRuleSpec = {
  ruleName: string;
  table: string;
  /** 大规则：完整性校验 / 准确性校验 / 规范性校验 / 唯一性校验 / 自定义SQL */
  bigRule: string;
  /** 仅完整性有「规则类型」：字段级 / 表级；其余规则恒字段级，传 undefined */
  ruleLevel?: "字段级" | "表级";
  /** 字段级规则要选的字段（可多选） */
  fields?: string[];
  /** 统计函数逐字文案，如「表行数」「空值数」「求和」「数值-取值范围」；自定义SQL 时传 undefined */
  statFunc?: string;
  /** 比较符：> >= = < <= != */
  comparator: string;
  /** 期望值数值（字符串），如「5」「0」「10%」按 UI 输入 */
  threshold: string;
  /** 强弱规则：弱规则 / 强规则 */
  weak: "弱规则" | "强规则";
  ruleDesc?: string;
  // ── 数值-取值范围 (STATISTICS_FUNC.RANGE="25") 专用字段 ──
  /** 取值区间左端操作符，如 ">=" / ">" */
  rangeFirstOp?: string;
  /** 取值区间左端值，如 "0" */
  rangeFirstVal?: string;
  /** 区间组合条件：且 (AND) / 或 (OR)，默认「且」 */
  rangeCondition?: "且" | "或";
  /** 取值区间右端操作符，如 "<=" / "<" */
  rangeSecondOp?: string;
  /** 取值区间右端值，如 "1000" */
  rangeSecondVal?: string;
  // ── 自定义SQL 专用字段 ──
  /** bigRule="自定义SQL" 时填入的 SQL 语句 */
  customSql?: string;
};

export type MonitorInstance = {
  id?: number;
  monitorId?: number;
  status?: number;
  statusValue?: string;
  resultDescList?: string[];
  monitorResultDataList?: Array<{
    result?: string;
    expectValue?: string;
    operator?: string;
    isReachStandard?: number;
  }>;
  errorMsg?: string | null;
  [k: string]: unknown;
};

type MonitorPage = { data?: { data?: Array<Record<string, unknown>>; total?: number } };

// ─── 建规则向导 ───

/** 走完单表校验规则向导①②③并完成，返回新建规则的 monitorId（从规则列表回查）。 */
export async function createSingleTableRule(page: Page, spec: SingleTableRuleSpec): Promise<string> {
  // ① 监控对象 → ② 监控规则 带重试：共享环境偶发 ①→② 切换 >40s 或卡死（向导/数据源联动慢，
  // 高并发下尤甚），重进向导重填①再点下一步，最多 3 次，从源头自愈瞬态（不靠测试级 retry 整条重跑）。
  const addRuleBtn = page.locator("button:visible", { hasText: "添加规则" }).first();
  let inStepTwo = false;
  for (let attempt = 1; attempt <= 3 && !inStepTwo; attempt++) {
    try {
      await gotoZszqDataAssetsPage(page, "/dq/rule/add");
      if (attempt > 1) await waitForUiSettled(page);
      // ① 监控对象（数据源选择复用已验证的 selectStarRocksDatasource）
      await locateFormItem(page, "规则名称").locator("input").first().fill(spec.ruleName);
      await selectStarRocksDatasource(page, STARROCKS3X_DATASOURCE_LABEL);
      const tableForm = page
        .locator(".ant-form-item:visible")
        .filter({ has: page.locator("label", { hasText: "选择数据表" }) })
        .last();
      await selectAntOption(page, tableForm.locator(".ant-select").first(), spec.table);
      // 确认数据表已回显，再进入下一步（避免 ① 校验拦截停在本步）
      await expect(tableForm, `选择数据表应回显 ${spec.table}`).toContainText(spec.table, { timeout: 30000 });
      await clickNext(page);
      // ② 监控规则：等「添加规则」出现；未出现则本次失败，回循环重进向导
      inStepTwo = await addRuleBtn
        .waitFor({ state: "visible", timeout: 25000 })
        .then(() => true)
        .catch(() => false);
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
  expect(inStepTwo, "①→②向导切换重试 3 次仍未进入②监控规则步骤（出现「添加规则」）").toBe(true);
  await addRuleBtn.click();
  await waitForUiSettled(page);
  await page
    .locator(".ant-dropdown:visible li, .ant-dropdown-menu-item", { hasText: spec.bigRule })
    .first()
    .click();
  await waitForUiSettled(page);

  if (spec.bigRule === "自定义SQL") {
    // 自定义SQL：无 ruleLevel/fields/statFunc；填 SQL textarea，然后校验方法/期望值照常
    if (spec.customSql) {
      const sqlTextarea = page.locator("textarea.ant-input, .ant-form-item textarea").first();
      await expect(sqlTextarea, "自定义SQL 应展示 textarea").toBeVisible({ timeout: 10000 });
      await sqlTextarea.fill(spec.customSql);
      await waitForUiSettled(page);
    }
  } else {
    if (spec.ruleLevel) {
      await selectAntOption(page, locateFormItem(page, "规则类型").locator(".ant-select").first(), spec.ruleLevel);
      await waitForUiSettled(page);
    }
    if (spec.fields?.length) {
      // 注意：locateFormItem 按整项文本匹配，"字段" 会误命中规则类型项的值「字段级」；改用 label 精确定位 字段 项。
      const fieldSel = page
        .locator(".ant-form-item:visible")
        .filter({ has: page.locator("label", { hasText: /^\*?\s*字段$/ }) })
        .first()
        .locator(".ant-select")
        .first();
      // 多选字段：第 1 个用 selectAntOption 打开并选中；多选下拉会保持展开，
      // 后续字段直接在已展开的下拉里点选项（再点触发器会把下拉关掉 → 下拉等待超时）。
      for (let i = 0; i < spec.fields.length; i++) {
        const f = spec.fields[i];
        if (i === 0) {
          await selectAntOption(page, fieldSel, f);
        } else {
          let dd = page.locator(".ant-select-dropdown:visible").last();
          if (!(await dd.isVisible().catch(() => false))) {
            await fieldSel.click();
            dd = page.locator(".ant-select-dropdown:visible").last();
            await dd.waitFor({ state: "visible", timeout: 5000 });
          }
          await dd
            .locator(".ant-select-item-option", { hasText: f })
            .filter({ hasNotText: new RegExp(`${f}.+`) })
            .first()
            .click();
          await waitForUiSettled(page);
        }
      }
      if (spec.fields.length > 1) await page.keyboard.press("Escape").catch(() => {});
    }
    if (spec.statFunc) {
      await selectAntOption(page, locateFormItem(page, "统计函数").locator(".ant-select").first(), spec.statFunc).catch(
        () => {},
      );
    }
    await waitForUiSettled(page); // 等统计函数选择后动态 UI 渲染
  }

  // 数值-取值范围（renderRanges，id=range_*）：firstOperator/firstThreshold + 且或 radio +
  // secondOperator/secondThreshold + 强弱规则；此分支无 校验方法/期望值comparator/#threshold。
  if (spec.rangeFirstOp) {
    const firstOpItem = page
      .locator(".ant-form-item:visible")
      .filter({ has: page.locator("#range_firstOperator") })
      .first();
    await selectAntOption(page, firstOpItem.locator(".ant-select").first(), spec.rangeFirstOp);
    await page.locator("#range_firstThreshold").fill(spec.rangeFirstVal ?? "");
    if (spec.rangeCondition && spec.rangeSecondOp) {
      await page
        .locator(".ant-radio-wrapper:visible", { hasText: spec.rangeCondition })
        .first()
        .click()
        .catch(() => {});
    }
    if (spec.rangeSecondOp) {
      const secondOpItem = page
        .locator(".ant-form-item:visible")
        .filter({ has: page.locator("#range_secondOperator") })
        .first();
      await selectAntOption(page, secondOpItem.locator(".ant-select").first(), spec.rangeSecondOp);
      await page.locator("#range_secondThreshold").fill(spec.rangeSecondVal ?? "");
    }
    await waitForUiSettled(page);
    await selectAntOption(page, locateFormItem(page, "强弱规则").locator(".ant-select").first(), spec.weak);
  } else {
    // 格式校验(格式-身份证号/手机号/邮箱)走 renderOperator(isFlag) 分支：不渲染独立「校验方法」，
    // 而是把「固定值/占比」选择器与「比较符」选择器并列放进「期望值」项，故需在「期望值」项里
    // 取 nth(0)=固定值、nth(1)=比较符；其余规则(基础/字符串长度/多字段)是独立「校验方法」+「期望值」。
    // 格式校验(格式-*) 与「数值-枚举范围」同布局：固定值/占比 选择器在「期望值」项内、比较符紧邻 #threshold；
    // 数值-枚举范围 的枚举集合（如 1,2）即填进 #threshold（期望值「= 1,2」），无独立「枚举集合」输入框。
    const isFormat = (spec.statFunc ?? "").startsWith("格式") || spec.statFunc === "数值-枚举范围";
    if (isFormat) {
      // format 的「期望值」项只含「固定值/占比」选择器；比较符是其后、紧邻 #threshold 之前的独立 select。
      await selectAntOption(page, locateFormItem(page, "期望值").locator(".ant-select").first(), "固定值");
      await waitForUiSettled(page);
      const opSelect = page
        .locator("xpath=//input[@id='threshold']/preceding::div[contains(concat(' ', @class, ' '), ' ant-select ')][1]")
        .first();
      await selectAntOption(page, opSelect, spec.comparator);
    } else {
      await selectAntOption(page, locateFormItem(page, "校验方法").locator(".ant-select").first(), "固定值");
      // 字符串长度等 specialFunction 选「固定值」后，比较符选项会从 noEqual 异步重渲染成仅 [=]
      // (operatorSelectEqual)，re-render 会清掉先前的 operator 值；等其落定再选，避免提交时 operator 为空被拒。
      await waitForUiSettled(page);
      await selectAntOption(page, locateFormItem(page, "期望值").locator(".ant-select").first(), spec.comparator);
    }
    await page.locator("#threshold").fill(spec.threshold);
    await selectAntOption(page, locateFormItem(page, "强弱规则").locator(".ant-select").first(), spec.weak);
  }
  if (spec.ruleDesc) {
    await locateFormItem(page, "规则描述").locator("input, textarea").first().fill(spec.ruleDesc).catch(() => {});
  }

  // 保存规则块
  await page.locator("button:visible", { hasText: /保\s*存/ }).first().click();
  await waitForUiSettled(page);
  await expect(
    page.locator("button:visible", { hasText: /保\s*存/ }),
    "规则块应保存成功（保存按钮消失，块变只读）",
  ).toHaveCount(0, { timeout: 30000 });

  await clickNext(page);
  await waitForUiSettled(page);

  // ③ 调度周期默认为「天」，按 archive 要求切换为「手动触发」，再提交。
  await switchScheduleToManual(page);
  // 新建规则按钮为「新建」，编辑态为「完成」，两者择一。
  const finishBtn = page
    .locator("button:visible")
    .filter({ hasText: /新\s*建|完\s*成/ })
    .filter({ hasNotText: /上一步|取\s*消/ })
    .last();
  await expect(finishBtn, "③调度页应有「新建/完成」提交按钮").toBeVisible({ timeout: 20000 });
  await finishBtn.click();
  await expect(page, "提交后应回到规则列表").toHaveURL(/#\/dq\/rule(\?|$)/, { timeout: 20000 });

  // 回查 monitorId（一表一规则，按表名取最新最稳）
  return await getMonitorIdByName(page, spec.ruleName, spec.table);
}

/** ③调度步骤：把「调度周期」从默认的「天」切换为「手动触发」。 */
export async function switchScheduleToManual(page: Page): Promise<void> {
  const cycleSelect = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label", { hasText: /调度周期/ }) })
    .first()
    .locator(".ant-select")
    .first();
  const exists = await cycleSelect
    .waitFor({ state: "visible", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!exists) return;
  await selectAntOption(page, cycleSelect, "手动触发").catch(() => {});
  await waitForUiSettled(page);
}

async function clickNext(page: Page): Promise<void> {
  await page.locator("button:visible", { hasText: /^下一步$/ }).first().click();
  await waitForUiSettled(page);
}

// ─── 规则列表 / API ───

/** 按规则名从 monitor/pageQuery 回查 monitorId（字符串）。 */
export async function getMonitorIdByName(page: Page, ruleName: string, table?: string): Promise<string> {
  let lastRows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 8; i++) {
    const payload = (await postDataAssetsApi(page, "/dassets/v1/valid/monitor/pageQuery", {
      currentPage: 1,
      pageSize: 200,
      projectId: projectId(),
    }).catch(() => ({ data: { data: [] } }))) as MonitorPage;
    const rows = payload?.data?.data ?? [];
    lastRows = rows;
    // 优先精确规则名；否则按表名取最新（一表一规则，最新 monitorId 即刚建的）
    const byName = rows.find((r) => String(r.monitorName ?? r.name ?? "") === ruleName);
    if (byName) return String(byName.monitorId ?? byName.id);
    if (table) {
      const byTable = rows
        .filter((r) => String(r.tableName ?? "") === table)
        .sort((a, b) => Number(b.monitorId ?? b.id ?? 0) - Number(a.monitorId ?? a.id ?? 0))[0];
      if (byTable) return String(byTable.monitorId ?? byTable.id);
    }
    await waitForUiSettled(page);
  }
  const dump = lastRows.map((r) => ({ id: r.monitorId ?? r.id, name: r.monitorName ?? r.name, table: r.tableName })).slice(0, 10);
  throw new Error(`未回查到规则 name=${ruleName} table=${table}；当前规则=${JSON.stringify(dump)}`);
}

/**
 * 在规则列表按 monitorId（data-row-key）定位规则行，点表名链接打开右侧规则详情滑窗。
 * 该 build 规则行操作列只有「取消收藏/删除」，详情靠点表名链接打开；滑窗是自定义 Drawer 组件
 * （非 .ant-drawer），故以「编 辑 / 立即执行」按钮出现作为滑窗已打开的标志。
 */
export async function openRuleDetailDrawer(page: Page, monitorId: string | number): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dq/rule");
  // 等表格数据加载稳定，避免规则行未刷新就点
  await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
  await waitForUiSettled(page);
  const row = page.locator(`.ant-table-tbody tr[data-row-key="${monitorId}"]`);
  await expect(row, `规则列表应有 monitorId=${monitorId} 的规则行`).toBeVisible({ timeout: 20000 });
  // 点表名链接（首列 <a>）打开右侧详情滑窗
  await row.locator("td a, td .dt-link").first().click();
  await waitForUiSettled(page);
  await expect(
    page.locator("button:visible", { hasText: /编\s*辑|立即执行/ }).first(),
    "规则详情滑窗应打开（出现编辑/立即执行）",
  ).toBeVisible({ timeout: 12000 });
}

/** 在详情抽屉点「立即执行」。 */
export async function runRuleNow(page: Page): Promise<void> {
  const runBtn = page.locator(".ant-drawer:visible button", { hasText: "立即执行" }).first();
  await expect(runBtn, "详情抽屉应有「立即执行」按钮").toBeVisible({ timeout: 30000 });
  await runBtn.click();
  await waitForUiSettled(page);
}

/**
 * 触发「立即执行」：等价于 UI 详情抽屉「立即执行」按钮（onClick → executeMonitor）调用的后端接口
 * `POST /dassets/v1/valid/monitor/immediatelyExecuted {monitorId}`。同步触发服务端执行后由 pollLatestInstance 取结果。
 * （详情抽屉打开受收藏态/动画影响不稳定，改用与按钮完全一致的接口触发，业务行为等价。）
 */
export async function runRuleNowByApi(page: Page, monitorId: string | number): Promise<void> {
  if (!page.url().includes("/dataAssets")) await gotoZszqDataAssetsPage(page, "/dq/rule");
  // 触发失败不再静默吞掉：让接口异常向上抛出（配合 pollLatestInstance 的 afterId 基线，
  // 触发失败/未生成新实例会在轮询阶段超时报错，而非误判上一次的旧终态实例）。
  const resp = (await postDataAssetsApi(page, "/dassets/v1/valid/monitor/immediatelyExecuted", {
    monitorId,
  })) as { code?: number; success?: boolean; message?: string } | undefined;
  // 该后端成功响应形如 {code:1, success:true, data:"true"}——code:1（非 200）即成功，success:true 才是成功标志。
  // 故仅在 success===false 显式失败时抛错；字段缺省不误判，「未生成新实例」由 pollLatestInstance(afterId) 兜底。
  if (resp?.success === false) {
    throw new Error(`立即执行触发失败 monitorId=${monitorId}: ${JSON.stringify(resp)}`);
  }
}

/** 轮询 monitorRecord/pageQuery，等指定 monitorId 的最新实例进入终态（非运行中），返回实例。 */
export async function pollLatestInstance(
  page: Page,
  monitorId: string | number,
  opts: { timeoutMs?: number; afterId?: number } = {},
): Promise<MonitorInstance> {
  const deadline = opts.timeoutMs ?? 120000;
  const interval = 5000;
  const maxIter = Math.ceil(deadline / interval);
  // afterId：重跑场景下传入「重跑前已知实例 id」，只接受 id 更大的新实例，杜绝误判上一次的旧终态实例。
  const afterId = opts.afterId;
  let last: MonitorInstance | null = null;
  for (let i = 0; i < maxIter; i++) {
    const payload = (await postDataAssetsApi(page, "/dassets/v1/valid/monitorRecord/pageQuery", {
      currentPage: 1,
      pageSize: 100,
      projectId: projectId(),
    }).catch(() => ({ data: { data: [] } }))) as MonitorPage;
    const rows = (payload?.data?.data ?? []) as MonitorInstance[];
    const mine = rows
      .filter((r) => String(r.monitorId) === String(monitorId))
      .filter((r) => afterId === undefined || Number(r.id ?? 0) > afterId)
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))[0];
    if (mine) {
      last = mine;
      // 终态判定用数值 status（MonitorStatus）：非终态={0等待,1运行中,8已提交,10停止中,12校验中}，其余为终态。
      const st = Number(mine.status);
      if (Number.isFinite(st) && TERMINAL_STATUSES.has(st)) return mine;
    }
    await waitForUiSettled(page);
  }
  // 超时即硬失败：不再返回可能为非终态的 last（那只会让下游 expectInstanceStatus 报误导性错），
  // 直接带最后已知状态抛出，便于定位「重跑未真正跑起来」或后端慢。
  const tail = last ? `最后实例 id=${last.id} status=${last.status}（非终态）` : "未查到匹配实例";
  const base = afterId === undefined ? "" : `（afterId=${afterId}）`;
  throw new Error(`轮询超时：monitorId=${monitorId}${base} 未在 ${deadline}ms 内产生终态实例；${tail}`);
}

// ─── 编辑期望值（双向用例） ───

/** 打开详情抽屉 → 编辑调度属性/规则，改期望值比较符+阈值，保存。按 monitorId 定位规则行。 */
export async function editRuleThreshold(
  page: Page,
  monitorId: string | number,
  next: { comparator: string; threshold: string },
): Promise<void> {
  await openRuleDetailDrawer(page, monitorId);
  // 详情滑窗「规则管理」tab 的规则块底部有「编 辑」按钮，点它进入编辑态（字段从只读变可改）。
  await page.locator("button:visible", { hasText: /编\s*辑/ }).first().click();
  await waitForUiSettled(page);
  // 改期望值比较符 + 阈值（校验方法保持固定值；「期望值」项含 comparator 选择器 + #threshold 输入）。
  // 不再吞错：编辑动作若失败必须暴露，否则规则等同未改、重跑结果无意义。
  await selectAntOption(page, locateFormItem(page, "期望值").locator(".ant-select").first(), next.comparator);
  const thresholdInput = page.locator("#threshold");
  await thresholdInput.fill(next.threshold);
  await expect(thresholdInput, "阈值应已改为新值").toHaveValue(next.threshold, { timeout: 5000 });
  // 编辑态出现「保 存」，点它保存规则块改动；保存后断言编辑态退出（保存按钮消失），确认改动已持久化而非被表单拦截。
  const saveBtn = page.locator("button:visible", { hasText: /保\s*存/ }).first();
  await saveBtn.click();
  await expect(saveBtn, "保存后编辑态应退出（保存按钮消失）").toBeHidden({ timeout: 12000 });
}

/**
 * 多表比对编辑重跑：点表名开详情滑窗 → 点「修改规则」打开多表编辑向导（①选左表→②选右表→
 * ③选字段→④执行配置，前两步表已回填）→ 在③改匹配条件阈值（applyMatchConditions 复用，已勾选
 * 条件仅更新阈值）→ ④调度保持手动触发 → 完成。编辑全程走 UI（不走 API）。
 */
export async function editMatchConditionThreshold(
  page: Page,
  monitorId: string | number,
  conditions: MatchCondition[],
): Promise<void> {
  await openRuleDetailDrawer(page, monitorId);
  // 多表编辑入口是详情滑窗里「多表对比规则」旁的「修改规则」链接（非单表的「编 辑」按钮）
  await page.locator("a:visible, span:visible, button:visible", { hasText: "修改规则" }).first().click();
  await waitForUiSettled(page);
  // 编辑向导停在①选左侧表（表已回填）→ ② → ③选字段
  await clickMultiNext(page); // ① → ②
  await clickMultiNext(page); // ② → ③
  await waitForUiSettled(page);
  await applyMatchConditions(page, conditions);
  await clickMultiNext(page); // ③ → ④
  await switchScheduleToManual(page);
  // 编辑向导最终按钮文案可能是「完成/保存/确定/新建」之一
  const finishBtn = page
    .locator("button:visible")
    .filter({ hasText: /新\s*建|完\s*成|保\s*存|确\s*定/ })
    .filter({ hasNotText: /上一步|取\s*消/ })
    .last();
  await expect(finishBtn, "编辑向导④应有「完成/保存/确定」按钮").toBeVisible({ timeout: 20000 });
  await finishBtn.click();
  await expect(page, "保存后应回到规则列表").toHaveURL(/#\/dq\/rule(\?|$)/, { timeout: 20000 });
  await waitForUiSettled(page);
}

// ─── 删除清理（走后端 API：/monitor/delete，平台「一表一规则」约束下必须清理残留才能重建） ───

/** 按 monitorId 删除规则（后端 monitor/delete）。 */
export async function deleteMonitorById(page: Page, monitorId: string | number): Promise<void> {
  await postDataAssetsApi(page, "/dassets/v1/valid/monitor/delete", { monitorId }).catch(() => undefined);
}

/** 清理指定表的所有规则：查 monitor/pageQuery 找到该表所有规则，逐个按 monitorId 调 API 删除。 */
export async function cleanupRulesByTable(page: Page, table: string): Promise<void> {
  // 需要一个已注入项目上下文的页面来发带鉴权的请求；若当前不在 DataAssets 域则先导航
  if (!page.url().includes("/dataAssets")) await gotoZszqDataAssetsPage(page, "/dq/rule");
  const payload = (await postDataAssetsApi(page, "/dassets/v1/valid/monitor/pageQuery", {
    currentPage: 1,
    pageSize: 100,
    projectId: projectId(),
  }).catch(() => ({ data: { data: [] } }))) as MonitorPage;
  const rows = payload?.data?.data ?? [];
  const mine = rows.filter((r) => String(r.tableName ?? "") === table);
  for (const r of mine) {
    await deleteMonitorById(page, String(r.monitorId ?? r.id));
  }
}

/**
 * 删除指定表的规则（afterEach 清理用）。
 * 设公共配置 playwright.cleanup=false 时跳过删除，让规则与执行记录留在平台供人工核对；
 * beforeEach 的 cleanupRulesByTable 不受此开关影响，保证重跑前仍先清场（一表一规则）。
 */
export async function deleteRuleByTable(page: Page, table: string): Promise<void> {
  if (!loadPlaywrightAutomationConfig().cleanup) return;
  await cleanupRulesByTable(page, table);
}

/**
 * 在规则列表 UI 上对指定 monitorId 的规则行执行「删除」：点操作列「删除」→ 确认弹窗「确定」→ 断言行消失。
 * 用于 P2「规则任务删除」用例，真实点击 UI 删除路径（区别于 cleanup 的后端 API 删除）。
 */
export async function deleteRuleViaUi(page: Page, monitorId: string | number): Promise<void> {
  await gotoZszqDataAssetsPage(page, "/dq/rule");
  await page.locator(".ant-table-tbody tr.ant-table-row").first().waitFor({ state: "visible", timeout: 20000 });
  await waitForUiSettled(page);
  const row = page.locator(`.ant-table-tbody tr[data-row-key="${monitorId}"]`);
  await expect(row, `规则列表应有 monitorId=${monitorId} 的规则行`).toBeVisible({ timeout: 20000 });
  await row.locator("span.dt-link, a, button", { hasText: /删\s*除/ }).first().click();
  // 确认弹窗：Popconfirm 或 Modal 的「确定」
  const confirmBtn = page
    .locator(".ant-popover:visible button, .ant-modal:visible button, .ant-popconfirm:visible button", {
      hasText: /确\s*定|确\s*认/,
    })
    .first();
  await expect(confirmBtn, "应弹出删除确认按钮").toBeVisible({ timeout: 10000 });
  await confirmBtn.click();
  await expect(row, `删除后 monitorId=${monitorId} 行应从列表移除`).toHaveCount(0, { timeout: 30000 });
}

// ─── 多表比对规则向导 ───

/** 多表比对规则配置 */
/** 多表比对「匹配条件」一项：勾选条件复选框，带阈值的填入「差距小于等于」输入框。 */
export type MatchCondition = {
  /** 条件文案前缀，如「记录数差异」「数值差异绝对值」「数值差异百分比」「字符不区分大小写」「空值与NULL等价」 */
  type: string;
  /** 「差距小于等于」阈值（仅前三种数值条件需要；布尔型条件不传） */
  gap?: string;
};

export type MultiTableCompareSpec = {
  ruleName: string;
  /** 左侧表名 */
  leftTable: string;
  /** 右侧表名 */
  rightTable: string;
  /** 字段映射：[左字段, 右字段][]（默认点「同名映射」按名自动映射） */
  fieldMappings?: Array<[string, string]>;
  /** 主键字段名（用于明细关联） */
  primaryKey?: string;
  /** 匹配条件（③步勾选 + 填阈值） */
  matchConditions?: MatchCondition[];
};

/**
 * 走完多表比对规则四步向导并完成，返回新建规则的 monitorId。
 * 向导：① 左侧表（规则名 + 数据源 + 表）→ ② 右侧表（数据源 + 表）→ ③ 字段 → ④ 执行配置。
 */
export async function createMultiTableCompareRule(
  page: Page,
  spec: MultiTableCompareSpec,
): Promise<string> {
  await gotoZszqDataAssetsPage(page, "/dq/rule");
  // 点「新建监控规则」触发下拉，选「多表比对规则」
  const addBtn = page.locator("button:visible", { hasText: "新建监控规则" }).first();
  await expect(addBtn, "规则配置页应有「新建监控规则」按钮").toBeVisible({ timeout: 20000 });
  await addBtn.click();
  await waitForUiSettled(page);
  await page
    .locator(".ant-dropdown:visible li, .ant-dropdown-menu-item", { hasText: "多表比对规则" })
    .first()
    .click();
  await waitForUiSettled(page);

  // ① 选择左侧表
  const body = page.locator("body");
  await expect(body, "应进入多表比对左侧表步骤").toContainText(/选择左侧表|规则名称/, { timeout: 20000 });
  await locateFormItem(page, "规则名称").locator("input").first().fill(spec.ruleName);
  // 多表向导里数据源选完后表选择器标签是「选择左/右侧表」非「数据表」，selectStarRocksDatasource
  // 的后置断言对多表过严会误抛；数据源本身已选上，故吞掉断言异常继续。
  await selectStarRocksDatasource(page, STARROCKS3X_DATASOURCE_LABEL).catch(() => {});
  const leftTableForm = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label", { hasText: /选择.*表|数据表/ }) })
    .last();
  await selectAntOption(page, leftTableForm.locator(".ant-select").first(), spec.leftTable);
  await expect(leftTableForm, `左侧表应回显 ${spec.leftTable}`).toContainText(spec.leftTable, { timeout: 30000 });
  await clickMultiNext(page);

  // ② 选择右侧表
  await expect(body, "应进入右侧表步骤").toContainText(/选择右侧表/, { timeout: 20000 });
  await selectStarRocksDatasource(page, STARROCKS3X_DATASOURCE_LABEL).catch(() => {});
  const rightTableForm = page
    .locator(".ant-form-item:visible")
    .filter({ has: page.locator("label", { hasText: /选择.*表|数据表/ }) })
    .last();
  await selectAntOption(page, rightTableForm.locator(".ant-select").first(), spec.rightTable);
  await expect(rightTableForm, `右侧表应回显 ${spec.rightTable}`).toContainText(spec.rightTable, { timeout: 30000 });
  await clickMultiNext(page);

  // ③ 字段映射 + 加主键 + 匹配条件
  await expect(body, "应进入字段映射步骤").toContainText(/字段|映射|主键/, { timeout: 20000 });
  await waitForUiSettled(page); // 等字段加载
  // 同名映射：按字段名自动连线左右表同名字段
  await page.locator("button:visible", { hasText: "同名映射" }).first().click().catch(() => {});
  await waitForUiSettled(page);
  // 加主键：勾选左表主键字段所在行的复选框（主键用于明细关联）
  if (spec.primaryKey) {
    await page
      .locator(".ant-table-tbody tr", { hasText: spec.primaryKey })
      .first()
      .locator("input[type='checkbox'], .ant-checkbox-input")
      .first()
      .check()
      .catch(() => {});
    await waitForUiSettled(page);
  }
  // 匹配条件（勾选 + 填差距阈值）
  await applyMatchConditions(page, spec.matchConditions ?? []);
  await clickMultiNext(page);

  // ④ 执行配置 → 调度切手动触发 → 完成
  await expect(body, "应进入执行配置步骤").toContainText(/执行配置|调度/, { timeout: 20000 });
  await switchScheduleToManual(page);
  const finishBtn = page
    .locator("button:visible")
    .filter({ hasText: /新\s*建|完\s*成/ })
    .filter({ hasNotText: /上一步|取\s*消/ })
    .last();
  await expect(finishBtn, "执行配置页应有「新建/完成」按钮").toBeVisible({ timeout: 20000 });
  await finishBtn.click();
  await expect(page, "提交后应回到规则列表").toHaveURL(/#\/dq\/rule(\?|$)/, { timeout: 20000 });

  // 多表比对规则的 tableName 是「左表/右表」组合，回查兜底按此组合名匹配。
  return await getMonitorIdByName(page, spec.ruleName, `${spec.leftTable}/${spec.rightTable}`);
}

/** 多表比对规则的组合表名（left/right），用于 cleanup/回查。 */
export function multiTableName(leftTable: string, rightTable: string): string {
  return `${leftTable}/${rightTable}`;
}

async function clickMultiNext(page: Page): Promise<void> {
  const btn = page.locator("button:visible", { hasText: /^下一步$/ }).first();
  await expect(btn, "应有「下一步」按钮").toBeVisible({ timeout: 30000 });
  await btn.click();
  await waitForUiSettled(page);
}

/**
 * 多表比对③/编辑：勾选匹配条件复选框并填「差距小于等于」阈值。
 * 复选框与条件文案是分离的兄弟元素（wrapper 不含文案），故按条件文案定位其所在行，
 * 再在该行内点复选框、填阈值输入框（排除复选框自身的 input）。
 */
export async function applyMatchConditions(page: Page, conditions: MatchCondition[]): Promise<void> {
  for (const mc of conditions) {
    // 行 = 含该条件文案、且向上含 checkbox 的最近祖先容器
    const row = page
      .getByText(mc.type, { exact: false })
      .first()
      .locator("xpath=ancestor::*[.//input[@type='checkbox'] or .//span[contains(@class,'ant-checkbox')]][1]");
    const checkbox = row.locator("input[type='checkbox'], .ant-checkbox-input").first();
    if (!(await checkbox.isChecked())) {
      // antd 的 input 常被视觉隐藏，check 失败时回退点 .ant-checkbox 容器；失败不再静默吞掉。
      await checkbox.check({ force: true }).catch(async () => {
        await row.locator(".ant-checkbox").first().click();
      });
    }
    await waitForUiSettled(page);
    // 勾选是 t38/t39 等「增勾条件改变校验结果」的唯一业务变量，必须断言确已勾上，否则规则行为不变。
    await expect(checkbox, `匹配条件「${mc.type}」应已勾选`).toBeChecked({ timeout: 5000 });
    if (mc.gap !== undefined) {
      const gapInput = row
        .locator("input.ant-input, input.ant-input-number-input, input[type='text']")
        .filter({ hasNot: page.locator(".ant-checkbox-input") })
        .first();
      await gapInput.fill(mc.gap);
      await expect(gapInput, `匹配条件「${mc.type}」差距应填入 ${mc.gap}`).toHaveValue(mc.gap, { timeout: 5000 });
    }
    await waitForUiSettled(page);
  }
}

/**
 * 断言实例校验状态（按数值 status 判定；statusValue 经 immediatelyExecuted 触发后 API 返回不稳定，故不依赖文案）。
 * MonitorStatus：3=校验通过；4=校验不通过、11=校验异常（UI 任务查询都归「校验异常」桶）。
 */
export function expectInstanceStatus(instance: MonitorInstance, expected: "校验通过" | "校验异常"): void {
  const st = Number(instance.status);
  const detail = `实际 status=${instance.status} statusValue=${instance.statusValue}`;
  if (expected === "校验通过") {
    expect(st, `实例应「校验通过」(status=3)，${detail}`).toBe(STATUS_PASS);
  } else {
    expect(STATUS_ABNORMAL.has(st), `实例应「校验异常」(status∈{4,11})，${detail}`).toBe(true);
  }
}
