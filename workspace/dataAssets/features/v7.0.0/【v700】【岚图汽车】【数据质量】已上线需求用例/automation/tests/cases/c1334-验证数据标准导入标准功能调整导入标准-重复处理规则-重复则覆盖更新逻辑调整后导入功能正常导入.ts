// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1334",
  "title": "验证【数据标准导入标准功能调整】「导入标准」-「重复处理规则」-「重复则覆盖更新」逻辑调整后导入功能（正常导入）",
  "steps": [
    {
      "action": "打开下载的导入模板文件，按规则填写内容（与现有标准没有重复现象）",
      "expected": "2. 进入成功"
    },
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "[导入标准]配置完成"
    },
    {
      "action": "导入标准配置如下：\n[重复处理规则] 重复则覆盖更新\n[上传文件] _上传填写后的文件_",
      "expected": "显示导入结果【导入总量/导入成功/导入失败/下载异常记录】"
    },
    {
      "action": "点击【确认】按钮",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准导入标准功能调整】「导入标准」-「重复处理规则」-「重复则覆盖更新」逻辑调整后导入功能（正常导入）", () => {
  test("C1334 验证【数据标准导入标准功能调整】「导入标准」-「重复处理规则」-「重复则覆盖更新」逻辑调整后导入功能（正常导入）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
