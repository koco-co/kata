// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1358",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」-「英文缩写」不填写正常导入",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "点击【下载模板】按钮",
      "expected": "自动下载导入模板"
    },
    {
      "action": "打开下载文件，按规则填写内容",
      "expected": "5. 进入成功"
    },
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入[导入标准]配置页面"
    },
    {
      "action": "点击【导入标准】按钮",
      "expected": "成功提交"
    },
    {
      "action": "点击【上传文件】按钮，提交导入文件",
      "expected": "成功导入，显示导入结果【导入总量/导入成功/导入失败/下载异常记录】"
    },
    {
      "action": "点击【确认】按钮",
      "expected": "导入成功"
    },
    {
      "action": "找到导入的标准（未填写英文缩写），确认标准导入成功",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」-「英文缩写」不填写正常导入", () => {
  test("C1358 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导入模板」-「英文缩写」不填写正常导入", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
