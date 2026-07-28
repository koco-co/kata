// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0164",
  "title": "验证导入元数据-异常场景-业务属性值不规范逻辑处理正确",
  "steps": [
    {
      "action": "点击【导入元数据】->选择数据源-> 上传excel文件；\nexcel文件中业务属性值存在以下情况：\n\t·枚举类属性的数据不在枚举范围内；\n\t·整型类属性的数据为字符型\n\t·datetime类属性的属性为bigint类型值；\n点击【确定】；",
      "expected": "弹窗提示：导入表格中存在错误数据，请检查后重新导入，点击导出错误文件。"
    },
    {
      "action": "点击提示弹窗中【点击】按钮",
      "expected": "导出错误excel文件成功；\n错误文件命名格式为：import_template_${yyyyMMdd}_error.csv\nexcel文件中标注错误数据并分别提示错误原因：\n\t·错误数据，请查看元模型该属性信息"
    }
  ]
} as const;

test.describe("验证导入元数据-异常场景-业务属性值不规范逻辑处理正确", () => {
  test("C0164 验证导入元数据-异常场景-业务属性值不规范逻辑处理正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
