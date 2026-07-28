// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0044",
  "title": "验证【数据目录】-移动功能正确",
  "steps": [
    {
      "action": "按住“一级目录-2”右侧移动按钮，拖拽到“一级目录-1”上面",
      "expected": "目录层级变更为\n一级目录-2\n\t二级目录-3\n\t二级目录-4\n一级目录-1\n\t二级目录-1\n\t二级目录-2"
    },
    {
      "action": "按住“二级目录-4”右侧移动按钮，拖拽到“二级目录-3”上面",
      "expected": "目录层级变更为\n一级目录-2\n\t二级目录-4\n\t二级目录-3\n一级目录-1\n\t二级目录-1\n\t二级目录-2"
    },
    {
      "action": "按住“二级目录-4”右侧移动按钮，拖拽到“一级目录-1”上面",
      "expected": "目录层级变更为\n一级目录-2\n\t二级目录-3\n二级目录-4\t\n一级目录-1\n\t二级目录-1\n\t二级目录-2"
    }
  ]
} as const;

test.describe("验证【数据目录】-移动功能正确", () => {
  test("C0044 验证【数据目录】-移动功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
