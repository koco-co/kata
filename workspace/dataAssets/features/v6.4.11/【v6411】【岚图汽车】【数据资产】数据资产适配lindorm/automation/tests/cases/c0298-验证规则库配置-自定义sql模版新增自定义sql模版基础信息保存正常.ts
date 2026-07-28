// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0298",
  "title": "验证【规则库配置-自定义sql模版】新增自定义sql模版基础信息保存正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置】并点击「自定义sql模版」页签",
      "expected": "1)展示「新增自定义sql模版」按钮\n2)列表列包含「规则名称」「规则分类」「关联范围」「关联规则」「规则描述」「操作」"
    },
    {
      "action": "点击「新增自定义sql模版」并填写「基本信息」:\n- 规则名称: 自定义SQL主流程模板\n- 规则分类: 完整性校验\n- 关联范围: 字段\n- 规则描述: 使用自定义sql模版统计目标字段质量\n点击「保存」",
      "expected": "1)基础信息校验通过\n2)保存成功后列表展示模板名称\n3)详情回显规则名称、规则分类、关联范围和规则描述"
    }
  ]
} as const;

test.describe("验证【规则库配置-自定义sql模版】新增自定义sql模版基础信息保存正常", () => {
  test("C0298 验证【规则库配置-自定义sql模版】新增自定义sql模版基础信息保存正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
