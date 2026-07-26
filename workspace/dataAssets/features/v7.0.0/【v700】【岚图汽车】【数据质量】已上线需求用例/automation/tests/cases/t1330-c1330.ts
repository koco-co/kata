// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1330",
  "title": "验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时标准映射、绑定关系均会删除",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】标准（该标准已上线且存在标准映射、绑定关系），点击【下线】按钮",
      "expected": "弹出提示框\"该数据标准已被引用至0张数据表，下线数据标准数据表中将不再展示字段的标准标签信息，且会同步删除标准映射结果\""
    },
    {
      "action": "点击提示框【下线】按钮",
      "expected": "弹出顶部提示框\"申请下线成功，若需查看审批进度可前往【公共管理-审批管理】模块，点击跳转可直接查看审批进度。\""
    },
    {
      "action": "点击【跳转】完成审批操作后，进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "【test】标准改为\"待上线\""
    },
    {
      "action": "进入【数据标准】-【标准管理】-【标准映射】页面",
      "expected": "进入成功"
    },
    {
      "action": "查找原【test】标准生成的映射记录",
      "expected": "映射记录已清除，绑定关系同步清除"
    }
  ]
} as const;

test.describe("验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时标准映射、绑定关系均会删除", () => {
  test("C1330 验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」标准进行\"下线\"操作时标准映射、绑定关系均会删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
