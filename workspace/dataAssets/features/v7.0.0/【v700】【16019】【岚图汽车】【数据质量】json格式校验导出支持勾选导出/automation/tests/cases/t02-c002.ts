// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C002",
  "title": "验证未勾选任何记录时点击导出，沿用导出全量旧行为",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "1) 所有行复选框均未勾选\n2) 顶部【导出】按钮可点击（未置灰）"
    },
    {
      "action": "不勾选任何行，直接点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 【导出】按钮在零勾选状态下仍可点击\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，与列表当前全部数据对比",
      "expected": "1) 文件含当前列表全部记录\n2) 验证零勾选时沿用「导出全部数据」旧行为，不受勾选导出影响"
    }
  ]
} as const;

test.describe("验证未勾选任何记录时点击导出，沿用导出全量旧行为", () => {
  test("C002 验证未勾选任何记录时点击导出，沿用导出全量旧行为", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
