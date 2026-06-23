// spec: cases/archive.md 步骤「临时运行规则，查看实例详情」（结果符合预期、实例详情展示正确）
// intent: SR-INTENT-V6411-SQL-MERGE
// SourceRefs: SR-ARCHIVE-V6411-SQL-MERGE-T04, SR-UI-PROBE-V6411-SQL-MERGE-13
//
// ⚠️ 当前 ltqc 环境受阻，本用例「暂从 full.spec.ts 排除」，待校验实例执行链路恢复后再纳入：
//   实测证据（2026-06-23，runs/preflight-02/.../preflight/execute-signal-compare.json）：
//   1. UI「立即执行」→ POST /dassets/v1/valid/monitor/immediatelyExecuted 是「同步阻塞」接口，
//      后端在 HTTP 请求内同步跑完整个校验任务才返回；
//   2. 该请求在 300.0s（5min）处被 nginx 504 Gateway Time-out 掐断，前端拿不到 success；
//   3. 触发后轮询 606s（10min）monitorRecord 列表始终无新完成实例，且实例列表 4 种查询全 count=0。
//   → 即当前环境这个 P0 任务「立即执行」跑不出有效校验实例（疑似本需求要解决的性能问题或环境侧故障）。
//
// 入口路径（环境恢复后即可真实跑通）：
//   规则任务管理列表 → 按表名搜索 test_info_1 → 点击表名链接打开 SlidePane「规则管理」Tab
//   → 「立即执行」按钮 → POST immediatelyExecuted { monitorId }（同步返回即任务完成信号）
//   → 查最新校验实例明细 → 断言 SQL 合并形状（临时抽样表/分区谓词/过滤条件/可合并候选组）
import { expect, test } from "@playwright/test";

import {
  DQ_SQL_MERGE_FULL_TABLE,
  DQ_SQL_MERGE_TARGET_TASK,
  type DqMonitorRecord,
  expectMonitorRecordSqlShape,
  gotoDqSqlMergeRoute,
  queryMonitorRecordDetail,
  queryMonitorRecords,
} from "../data/sql-merge-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
// immediatelyExecuted 同步阻塞，任务实际运行约 5 分钟；加上 UI 操作，给 12 分钟上限
test.setTimeout(12 * 60 * 1000);

test("【P0】规则任务「立即执行」→ 新实例完成 → SQL 合并格式正确", async ({ page }) => {
  const sourceRef = "SR-ARCHIVE-V6411-SQL-MERGE-T04";

  // ─── Step 1: 进入规则任务管理，按表名搜索 test_info_1 ───────────────
  await test.step("步骤1: 进入规则任务管理 → 按表名搜索 test_info_1", async () => {
    await gotoDqSqlMergeRoute(page, "/dq/rule", sourceRef);

    // 按表名过滤，placeholder = "输入表名搜索"
    const searchInput = page.locator("input[placeholder='输入表名搜索']").first();
    await expect(searchInput, `${sourceRef}: 规则任务管理应有表名搜索框`).toBeVisible({
      timeout: 30_000,
    });
    await searchInput.fill("test_info_1");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);

    await expect(
      page.locator("body"),
      `${sourceRef}: 搜索结果应包含目标表 ${DQ_SQL_MERGE_FULL_TABLE}`,
    ).toContainText(DQ_SQL_MERGE_FULL_TABLE, { timeout: 15_000 });
  });

  // ─── Step 2: 找到 P0 任务行，点击表名链接打开 SlidePane ────────────
  await test.step("步骤2: 找 P0 任务行 → 点击表名链接 → 打开 SlidePane", async () => {
    const p0Row = page.locator("tr").filter({ hasText: "不同过滤条件" }).first();
    await expect(p0Row, `${sourceRef}: 搜索结果应包含 P0 任务（含「不同过滤条件」）`).toBeVisible({
      timeout: 15_000,
    });

    const tableLink = p0Row.locator("a").first();
    await expect(tableLink, `${sourceRef}: P0 行应有可点击的表名链接`).toBeVisible();
    await tableLink.click();
  });

  // ─── Step 3: 点「立即执行」→ 等同步响应（= 任务执行完成信号）─────────
  await test.step("步骤3: SlidePane 显示 → 点击「立即执行」→ 同步接口返回成功", async () => {
    const executeBtn = page.locator("button").filter({ hasText: "立即执行" }).first();
    await expect(executeBtn, `${sourceRef}: SlidePane 应展示「立即执行」按钮`).toBeVisible({
      timeout: 15_000,
    });
    await expect(executeBtn, `${sourceRef}: 「立即执行」按钮应处于可用状态`).toBeEnabled();

    const recordsBefore = await queryMonitorRecords(page.request, sourceRef);
    const idsBefore = new Set(recordsBefore.map((r) => String(r.id)));

    // immediatelyExecuted 是同步阻塞接口：HTTP 响应返回即代表后端任务已执行完成。
    // 故以「同步响应返回 success」作为任务完成信号，而非等按钮 loading 结束/SlidePane 关闭
    //（源码 ruleEditPane.executeMonitor 成功/失败分支都不复位 executeLoading）。
    const execResponsePromise = page.waitForResponse(
      (r) => r.url().includes("/monitor/immediatelyExecuted") && r.request().method() === "POST",
      { timeout: 10 * 60 * 1000 },
    );
    await executeBtn.click();
    const execResponse = await execResponsePromise;
    expect(execResponse.status(), `${sourceRef}: 立即执行接口应 HTTP 200（非 nginx 504 超时）`).toBe(200);
    const execBody = (await execResponse.json()) as { success?: boolean };
    expect(execBody?.success, `${sourceRef}: 立即执行应返回 success`).toBe(true);

    // ─── Step 4: 查最新已完成校验实例 ──────────────────────────────
    await test.step("步骤4: 等待并获取新的已完成校验实例", async () => {
      let newRecord: DqMonitorRecord | undefined;
      for (let attempt = 0; attempt < 24; attempt++) {
        const records = await queryMonitorRecords(page.request, sourceRef);
        newRecord = records.find((r) => !idsBefore.has(String(r.id)) && r.execEndTime);
        if (newRecord) break;
        await page.waitForTimeout(5_000);
      }
      expect(
        newRecord?.ruleName,
        `${sourceRef}: 应出现新的已完成校验实例（任务: ${DQ_SQL_MERGE_TARGET_TASK}）`,
      ).toBe(DQ_SQL_MERGE_TARGET_TASK);

      // ─── Step 5: 获取实例明细，验证 SQL 合并形状 ───────────────
      await test.step("步骤5: 获取实例明细 → 验证 SQL 合并形状", async () => {
        const detailRows = await queryMonitorRecordDetail(page.request, newRecord!, sourceRef);
        expectMonitorRecordSqlShape(detailRows, sourceRef);
      });
    });
  });
});
