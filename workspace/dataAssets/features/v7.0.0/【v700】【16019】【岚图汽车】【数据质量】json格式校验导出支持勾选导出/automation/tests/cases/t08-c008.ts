// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C008",
  "title": "验证导出文件「数据源类型」列对 SparkThrift2.x、Hive2.x、Doris3.x 取值正确",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "1) 列表正常加载，keySpark、keyHive、keyDoris 三行均显示\n2) 三行「数据源类型」列分别显示 SparkThrift2.x、Hive2.x、Doris3.x"
    },
    {
      "action": "勾选 keySpark、keyHive、keyDoris 三行，点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 三行复选框均选中，列表底部显示「当前选中：3」\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对各行「数据源类型」列取值",
      "expected": "1) keySpark 行数据源类型=SparkThrift2.x\n2) keyHive 行数据源类型=Hive2.x\n3) keyDoris 行数据源类型=Doris3.x\n4) 与列表显示一致，无错位、无丢失"
    }
  ]
} as const;

test.describe("验证导出文件「数据源类型」列对 SparkThrift2.x、Hive2.x、Doris3.x 取值正确", () => {
  test("C008 验证导出文件「数据源类型」列对 SparkThrift2.x、Hive2.x、Doris3.x 取值正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
