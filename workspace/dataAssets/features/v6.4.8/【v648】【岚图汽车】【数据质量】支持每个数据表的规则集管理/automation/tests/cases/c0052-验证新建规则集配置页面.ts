// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0052",
  "title": "验证新建规则集配置页面",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面, 支持配置基础信息和监控规则"
    },
    {
      "action": "基础信息UICHECK",
      "expected": "支持配置选择数据表、规则包:1) 选择数据表: 选择数据源(必填)、选择数据库(必填)、选择数据表(必填)、规则集描述2) 规则包: 支持对规则包名称进行增删改, 必填3) 按钮: 取消/下一步"
    },
    {
      "action": "正常配置基础信息内容, 点击下一步",
      "expected": "进入【新建规则集 ❯ 监控规则】配置页面"
    },
    {
      "action": "监控规则UICHECK",
      "expected": "1)支持对每一个规则包配置不同的校验规则2)支持规则包的增删改操作3) 支持对规则包中的校验规则增删改和克隆操作4) 支持查看全局参数5) 按钮: 下一步/保存"
    }
  ]
} as const;

test.describe("验证新建规则集配置页面", () => {
  test("C0052 验证新建规则集配置页面", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
