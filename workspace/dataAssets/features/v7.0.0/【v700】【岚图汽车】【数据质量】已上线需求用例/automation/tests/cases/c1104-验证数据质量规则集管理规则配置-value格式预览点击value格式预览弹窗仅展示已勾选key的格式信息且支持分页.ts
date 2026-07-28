// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1104",
  "title": "验证【数据质量 规则集管理 规则配置-value格式预览】点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到规则集\"rule_set_preview_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"value预览测试包\"中点击【新增规则】，添加有效性校验规则，按如下配置：\n- *字段：info（json）\n-*统计规则：格式-json格式校验\n展开「校验key」下拉框，勾选「check-key-01」「check-key-02」「check-key-03」共3个key",
      "expected": "3个key成功勾选"
    },
    {
      "action": "点击「value格式预览」按钮，等待弹窗加载完成",
      "expected": "弹窗正常打开：\n1) 弹窗内列表仅展示已勾选的3个key对应的信息，未勾选的「check-key-04」至「check-key-15」不显示\n2) 列表包含两列：「key」列和「value格式」列\n3) 「check-key-01」对应「^[A-Z]{2}\\\\d{4}$」\n4) 「check-key-02」对应「^1[3-9]\\\\d{9}$」"
    },
    {
      "action": "关闭弹窗，取消勾选「check-key-03」，再次点击「value格式预览」按钮，等待弹窗加载完成",
      "expected": "弹窗内列表更新为仅展示「check-key-01」和「check-key-02」共2条记录，「check-key-03」不再显示"
    },
    {
      "action": "关闭弹窗，重新勾选「check-key-03」至「check-key-12」共12个key（合计12个），点击「value格式预览」按钮，查看弹窗分页情况",
      "expected": "1) 弹窗展示分页控件\n2) 默认展示第1页数据\n3) 可翻页查看剩余key的格式信息"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则配置-value格式预览】点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页", () => {
  test("C1104 验证【数据质量 规则集管理 规则配置-value格式预览】点击「value格式预览」弹窗仅展示已勾选key的格式信息且支持分页", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
