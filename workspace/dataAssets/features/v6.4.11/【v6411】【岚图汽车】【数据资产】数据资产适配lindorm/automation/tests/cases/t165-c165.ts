// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C165",
  "title": "验证导入元数据-异常场景-catalog不规范逻辑处理正确",
  "steps": [
    {
      "action": "点击【导入元数据】->选择数据源-> 上传excel文件；\nexcel文件中catalog存在以下情况：\n\t·catalog在所在数据库中不存在;\n\t·catalog为空；\n点击【确定】；",
      "expected": "弹窗提示：导入表格中存在错误数据，请检查后重新导入，点击导出错误文件。"
    },
    {
      "action": "点击提示弹窗中【点击】按钮",
      "expected": "导出错误excel文件成功；\n错误文件命名格式为：import_template_${yyyyMMdd}_error.csv\nexcel文件中标注错误数据并分别提示错误原因：\n\t·当前catalog未同步到资产中\n\t·必填数据，请查看元模型该属性信息"
    }
  ]
} as const;

test.describe("验证导入元数据-异常场景-catalog不规范逻辑处理正确", () => {
  test("C165 验证导入元数据-异常场景-catalog不规范逻辑处理正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
