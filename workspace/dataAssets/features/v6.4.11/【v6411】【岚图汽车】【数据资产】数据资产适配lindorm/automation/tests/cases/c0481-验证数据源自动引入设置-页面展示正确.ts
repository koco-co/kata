// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0481",
  "title": "验证数据源自动引入设置-页面展示正确",
  "steps": [
    {
      "action": "入口",
      "expected": "平台管理-数据源管理-数据源自动引入设置"
    },
    {
      "action": "查看页面提示文案",
      "expected": "文案提示：！针对离线开发、指标、标签子产品自动引入的数据源信息，支持按照子产品、项目维度、数据源类型维度进行设置开启/关闭自动引入功能，关闭后在其他子产品生成的meta数据源将不会自动引入/自动创建周期同步任务，只能通过手动引入数据源的方式实现。"
    },
    {
      "action": "查看页面列表数据",
      "expected": "分别展示3个子产品设置（子模块名称、数据源类型、自动引入设置），默认值为：\n- 离线开发        、全部、开启；\n- 指标管理        、全部、关闭；\n- 客户数据洞察 、全部、关闭；"
    },
    {
      "action": "查看操作列",
      "expected": "只有离线开发才有编辑按钮"
    }
  ]
} as const;

test.describe("验证数据源自动引入设置-页面展示正确", () => {
  test("C0481 验证数据源自动引入设置-页面展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
