// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1347",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导出标准」一条标准根据「车型/车系」存在多条「技术属性」配置时，「导出标准」能正确进行导出",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【导出标准】按钮",
      "expected": "进入[导出标准]配置页面"
    },
    {
      "action": "勾选导出标准（包含一条标准根据【车型/车系】存在多条【技术属性】的情况），点击【确定】按钮",
      "expected": "自动下载导入模板"
    },
    {
      "action": "打开下载文件",
      "expected": "5. 存在多条记录，且记录内容正确"
    },
    {
      "action": "检查导出记录表是否根据【车型/车系】存在多条【技术属性】",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导出标准」一条标准根据「车型/车系」存在多条「技术属性」配置时，「导出标准」能正确进行导出", () => {
  test("C1347 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「导出标准」一条标准根据「车型/车系」存在多条「技术属性」配置时，「导出标准」能正确进行导出", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
