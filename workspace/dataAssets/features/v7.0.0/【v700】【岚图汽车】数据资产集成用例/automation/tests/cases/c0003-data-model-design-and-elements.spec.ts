import { test } from "@playwright/test";
import {
  expectModelApprovalShell,
  expectModelBuildTableShell,
  expectModelBuildTableTypeHdfsInteraction,
  expectModelBuildVariantsAndParsingShell,
  expectModelNormDesignShell,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/model-page";

test.describe("C0003 验证「数据模型」规范设计、建表变体与审批入口", () => {
  test("数据模型管理员入口与建表变体", async ({ page }) => {
    await expectModelBuildTableShell(page, "C0003-01");
    await expectModelNormDesignShell(page, "C0003-02");
    await expectModelBuildVariantsAndParsingShell(page, "C0003-03");
    await expectModelBuildTableTypeHdfsInteraction(page, "C0003-04");
    await expectModelApprovalShell(page, "C0003-05");
  });
});
