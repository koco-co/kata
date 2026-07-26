// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1331",
  "title": "验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」\"已上线\"状态标准操作栏只有\"下线\"按钮",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】标准（该标准已上线），确认该标准操作栏",
      "expected": "该标准操作栏只有\"下线\"按钮"
    }
  ]
} as const;

test.describe("验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」\"已上线\"状态标准操作栏只有\"下线\"按钮", () => {
  test("C1331 验证【数据标准标准下线逻辑调整】「数据标准」-「标准定义」\"已上线\"状态标准操作栏只有\"下线\"按钮", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
