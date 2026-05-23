// spec: features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md#L34370-L34528
// intent: src.archive.security.permission_cases@1
// probe: src.ui.security.retry2.roleManage@1
// page: _shared/pages/2099-01-lt-dq-launched-reqs/security/security-permission-page.ts
// generated_at: 2026-05-22T12:35:00.000Z
import { test } from "@playwright/test";

import {
  CURRENT_ADMIN_DQ_TARGETS,
  SecurityPermissionPage,
} from "../../../../_shared/pages/2099-01-lt-dq-launched-reqs/security";

test.describe("v6.4.4 数据质量权限点当前会话合同", () => {
  for (const target of CURRENT_ADMIN_DQ_TARGETS) {
    test(`${target.caseIds[0]} 当前管理员会话可进入 ${target.path}`, async ({ page }) => {
      await new SecurityPermissionPage(page).expectCurrentAdminAccess(target);
    });
  }

  test("LR-0777 质量模块权限点位置调整当前矩阵可见", async ({ page }) => {
    await new SecurityPermissionPage(page).expectQualityReportPermissionPosition();
  });

  test("LR-0778 质量模块权限点名称调整当前矩阵可见", async ({ page }) => {
    await new SecurityPermissionPage(page).expectQualityPermissionNames();
  });
});
