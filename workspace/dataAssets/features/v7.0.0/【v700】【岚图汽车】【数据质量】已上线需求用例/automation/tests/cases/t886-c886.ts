// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C886",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】类型选择",
  "steps": [
    {
      "action": "必选",
      "expected": "为空提示"
    },
    {
      "action": "选择枚举包含",
      "expected": "支持选择数值、数组、逻辑关系、当前校验表、当前校验表字段、自定义参数"
    },
    {
      "action": "类型选择数值型，参数值只允许输入数值（bigint类型），适用于配置时间差值、计算差值等场景",
      "expected": "配置自定义正则时，该参数值只能填写数值型增加校验"
    },
    {
      "action": "类型选择数组，参数值为数组配置框，适用于配置枚举范围",
      "expected": "配置自定义正则时，该参数值支持选择，支持多选，输入选择框"
    },
    {
      "action": "类型选择逻辑关系，参数值支持选择支持配置>、=、<、>=、<=、!=",
      "expected": "配置自定义正则时，该参数值支持支持按照逻辑关系配置"
    },
    {
      "action": "类型选择当前校验表，不可编辑，系统会自动填充当前校验表名拼接到sql中",
      "expected": "配置自定义正则时，该参数值显示--"
    },
    {
      "action": "类型选择校验表字段，支持选择当前校验表下的字段名称，只支持单选",
      "expected": "配置自定义正则时，该参数值支持选择表下所有字段，且仅支持单选；\n若表字段变更，此处选择内容同步变更 下一步校验"
    },
    {
      "action": "类型选择自定义类，支持输入",
      "expected": "配置自定义正则时，该参数值支持输入"
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】类型选择", () => {
  test("C886 验证【数据质量-规则库管理 自定义SQL模版 新增 自定义配置 参数列表】类型选择", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
