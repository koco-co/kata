// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1149",
  "title": "验证【数据质量 通用配置-json格式校验管理 大数据量场景】大数据量场景key记录下载数量是否存在限制",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面正常打开，列表加载完成，分页组件显示总记录数"
    },
    {
      "action": "点击列表右上角【导出】按钮, 等待文件下载完成",
      "expected": "文件下载成功，打开下载的xlsx文件，核对导出的key记录总数与列表中显示的总记录数一致"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 大数据量场景】大数据量场景key记录下载数量是否存在限制", () => {
  test("C1149 验证【数据质量 通用配置-json格式校验管理 大数据量场景】大数据量场景key记录下载数量是否存在限制", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
