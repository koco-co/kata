// spec: cases/archive.md#L5760-L5837
// intent: SR-INTENT-V6411-SQL-MERGE
//
// P2：验证「完整性校验」-「多字段」-「抽样关闭」校验全不通过功能（sparkthrift·test_info_1）
//
// read-only API 核验。/monitor/pageQuery 找已有 monitor，
// /monitor/packagelist→/monitor/packagesql 拉生成合并 SQL，核验 SUM(CASE WHEN) 形状。
// 已有 monitor id=4718，含 4 条完整性规则（期望值=全不通过阈值）。
// 被测特性为生成 SQL 合并，不靠 UI 立即执行触发。
import { expect, test } from "@playwright/test";

import {
  postDq,
  queryMonitorsByTable,
  type DqPackageItem,
} from "../data/sql-merge-contract";

const TABLE = "test_info_1";
const TARGET_RULE_NAME = "验证「完整性校验」-「多字段」-「抽样关闭」校验全不通过功能";
const EXPECTED_RULE_COUNT = 4;

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(120000);

test.describe("【P2】完整性校验·多字段·抽样关闭·全不通过（API→SQL核验）", () => {
  test("monitor→packagelist→packagesql→SUM(CASE WHEN) 合并", async ({ page }) => {
    const SRC = "SR-ARCHIVE-V6411-SQL-MERGE-CMP-FAIL";

    const monitors = await test.step("查 test_info_1 monitor", async () =>
      queryMonitorsByTable(page.request, TABLE, `${SRC}: monitor/pageQuery`),
    );

    const target =
      monitors.find((m) => String(m.ruleName).trim() === TARGET_RULE_NAME) ??
      monitors.find(
        (m) =>
          (String(m.ruleName) ?? "").includes("完整性校验") &&
          (String(m.ruleName) ?? "").includes("抽样关闭") &&
          (String(m.ruleName) ?? "").includes("全不通过"),
      );
    expect(target, `${SRC}: 应找到目标 monitor`).toBeTruthy();
    const monitorId = Number(target!.id);
    expect(monitorId, `${SRC}: monitor id > 0`).toBeGreaterThan(0);
    test.info().annotations.push({ type: "monitorId", description: String(monitorId) });

    const packages = await test.step("查拼接包列表", async () => {
      const data = await postDq<DqPackageItem[]>(
        page.request,
        "/dassets/v1/valid/monitor/packagelist",
        { monitorId },
        { sourceRef: `${SRC}: packagelist` },
      );
      expect(Array.isArray(data), `${SRC}: 拼接包应为数组`).toBe(true);
      expect(data.length, `${SRC}: 应有拼接包`).toBeGreaterThan(0);
      return data;
    });

    const pkg = packages[0];
    const packageId = pkg.packageId!;

    const sql = await test.step("拉取合并 SQL", async () => {
      const s = await postDq<string>(
        page.request,
        "/dassets/v1/valid/monitor/packagesql",
        { packageId },
        { sourceRef: `${SRC}: packagesql` },
      );
      expect(typeof s, `${SRC}: mergeSql 应为字符串`).toBe("string");
      expect(s.length, `${SRC}: SQL > 200 chars`).toBeGreaterThan(200);
      return s;
    });

    await test.step("核验 SQL 合并形状", () => {
      const caseCount = (sql.match(/SUM\s*\(\s*CASE\s+WHEN/gi) || []).length;
      expect(caseCount, `${SRC}: SUM(CASE WHEN) ≥ ${EXPECTED_RULE_COUNT}, 实际=${caseCount}`).toBeGreaterThanOrEqual(
        EXPECTED_RULE_COUNT,
      );

      expect(sql, `${SRC}: 应落脏数据管道`).toContain("dtstack_dq_monitor_temp_data");
      expect(sql, `${SRC}: 应引用源表`).toContain("test_info_1");

      test.info().annotations.push({
        type: "sql-summary",
        description: `SUM(CASE WHEN)×${caseCount}, src=test_info_1`,
      });
    });
  });
});
