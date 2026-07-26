// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C199",
  "title": "验证标准目录-编辑",
  "steps": [
    {
      "action": "1）点击已有目录YYY右侧的“...”，点击“编辑”\n2）在输入框中输入目录名称“yyy”，回车",
      "expected": "目录编辑成功，YYY目录更新为“yyy”"
    },
    {
      "action": "1）点击已有目录XXX右侧的\"...\"（XXX与ZZZ同级）\n2）点击“编辑”\n3）在输入框中输入目录名称“ZZZ”，回车",
      "expected": "提示“修改名称与当前层级节点重名，不允许修改”"
    },
    {
      "action": "1）点击已有目录ZZZ右侧的\"...\"（ZZZ同级目录下无NNN目录）\n2）点击“编辑”\n3）在输入框中输入目录名称“NNN”，回车",
      "expected": "目录编辑成功，ZZZ目录更新为\"NNN\""
    }
  ]
} as const;

test.describe("验证标准目录-编辑", () => {
  test("C199 验证标准目录-编辑", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
