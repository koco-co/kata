import { expect, type Page } from "@playwright/test";

import { DataAssetsShellPage } from "../base";

export type SecurityPermissionTarget = {
  readonly caseIds: readonly string[];
  readonly path: string;
  readonly labels: readonly string[];
  readonly sourceRef: string;
};

export const CURRENT_ADMIN_DQ_TARGETS: readonly SecurityPermissionTarget[] = [
  {
    caseIds: ["LR-0771"],
    path: "/dq/generalConfig/dimension",
    labels: ["数据质量", "通用配置", "报告关联维表设置"],
    sourceRef: "src.ui.security.retry2.generalConfigDimension@1",
  },
  {
    caseIds: ["LR-0776"],
    path: "/dq/overview",
    labels: ["数据质量", "总览"],
    sourceRef: "src.ui.security.retry2.overview@1",
  },
  {
    caseIds: ["LR-0774"],
    path: "/dq/rule",
    labels: ["规则任务管理"],
    sourceRef: "src.ui.security.retry2.rule@1",
  },
  {
    caseIds: ["LR-0773"],
    path: "/dq/taskQuery",
    labels: ["校验结果查询"],
    sourceRef: "src.ui.security.retry2.taskQuery@1",
  },
  {
    caseIds: ["LR-0772"],
    path: "/dq/qualityReport",
    labels: ["数据质量报告"],
    sourceRef: "src.ui.security.retry2.qualityReport@1",
  },
  {
    caseIds: ["LR-0775"],
    path: "/dq/ruleBase",
    labels: ["规则库配置", "内置规则"],
    sourceRef: "src.ui.security.retry2.ruleBase@1",
  },
];

export class SecurityPermissionPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async expectCurrentAdminAccess(target: SecurityPermissionTarget): Promise<void> {
    await this.shell.goto(target.path, target.sourceRef);
    const body = this.page.locator("body");
    for (const label of target.labels) {
      await expect(body, `${target.sourceRef}: ${target.path} should show ${label}`).toContainText(label, {
        timeout: 30_000,
      });
    }
  }

  async expectRoleManagementShell(sourceRef = "src.ui.security.retry2.roleManage@1"): Promise<void> {
    await this.shell.goto("/roleManage", sourceRef);
    const body = this.page.locator("body");
    for (const label of ["用户角色管理", "角色管理", "权限点", "管理员", "数据开发", "访客"]) {
      await expect(body, `${sourceRef}: role management should show ${label}`).toContainText(label, {
        timeout: 30_000,
      });
    }
  }

  async expectQualityReportPermissionPosition(sourceRef = "src.ui.security.retry2.roleManage@1"): Promise<void> {
    const permissionPayload = await this.loadRolePermissionPayload(sourceRef);
    const resultQueryIndex = permissionPayload.indexOf("任务实例查询");
    const qualityReportIndex = permissionPayload.indexOf("质量报告");
    expect(resultQueryIndex, `${sourceRef}: role permission data should contain current 任务实例查询`).toBeGreaterThanOrEqual(
      0,
    );
    expect(qualityReportIndex, `${sourceRef}: role permission data should contain current 质量报告`).toBeGreaterThanOrEqual(
      0,
    );
    expect(
      qualityReportIndex,
      `${sourceRef}: 质量报告 should appear after 任务实例查询 in role permission data`,
    ).toBeGreaterThan(resultQueryIndex);
  }

  async expectQualityPermissionNames(sourceRef = "src.ui.security.retry2.roleManage@1"): Promise<void> {
    const permissionPayload = await this.loadRolePermissionPayload(sourceRef);
    expect(permissionPayload, `${sourceRef}: role permission data should contain current 规则任务配置`).toContain(
      "规则任务配置",
    );
    expect(permissionPayload, `${sourceRef}: role permission data should contain current 任务实例查询`).toContain(
      "任务实例查询",
    );
  }

  private async loadRolePermissionPayload(sourceRef: string): Promise<string> {
    const permissionResponse = this.page.waitForResponse(
      (response) => response.url().includes("/dassets/v1/role/getRolePermission") && response.ok(),
      { timeout: 30_000 },
    );
    await this.expectRoleManagementShell(sourceRef);
    const payload = await (await permissionResponse).text();
    expect(payload, `${sourceRef}: role permission API should return permission data`).toContain("权限点");
    return payload;
  }
}
