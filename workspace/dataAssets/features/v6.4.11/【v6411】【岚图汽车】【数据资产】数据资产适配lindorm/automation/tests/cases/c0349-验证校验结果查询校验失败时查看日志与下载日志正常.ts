// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0349",
  "title": "验证【校验结果查询】校验失败时查看日志与下载日志正常",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面",
      "expected": "1)页面展示「计划时间」「最近修改人」「我收藏的表」\n2)列表列包含「表」「任务名称」「状态」「数据源」「执行周期」「是否关联任务」「计划时间」「开始时间」「结束时间」「运行时长」「提交人」「最近修改人」「操作」"
    },
    {
      "action": "打开「校验失败」实例详情并查看日志、下载日志",
      "expected": "1)可查看失败日志\n2)日志包含失败原因和执行时间\n3)下载日志文件内容与页面日志一致"
    }
  ]
} as const;

test.describe("验证【校验结果查询】校验失败时查看日志与下载日志正常", () => {
  test("C0349 验证【校验结果查询】校验失败时查看日志与下载日志正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
