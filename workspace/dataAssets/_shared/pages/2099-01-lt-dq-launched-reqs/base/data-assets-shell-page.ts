import { expect, type Page } from "@playwright/test";

import { buildDataAssetsUrl, getEnvConfig } from "../../../helpers/test-setup";

const PROJECT_STORAGE_KEYS = ["X-Valid-Project-ID", "dq_project_id"] as const;

export type DataAssetsDomain =
  | "assets"
  | "metadata"
  | "standard"
  | "model"
  | "quality"
  | "security"
  | "platform";

export type ShellSnapshot = {
  readonly sourceRef: string;
  readonly url: string;
  readonly title: string;
  readonly bodyExcerpt: string;
  readonly menuItems: readonly string[];
  readonly buttons: readonly string[];
  readonly formLabels: readonly string[];
  readonly tableHeaders: readonly string[];
};

export const DATA_ASSETS_DOMAIN_LABELS: Record<DataAssetsDomain, readonly string[]> = {
  assets: ["资产盘点"],
  metadata: ["元数据"],
  standard: ["数据标准"],
  model: ["数据模型"],
  quality: ["数据质量"],
  security: ["数据安全"],
  platform: ["平台管理"],
};

function projectId(): number {
  return getEnvConfig().projects.quality.id;
}

export class DataAssetsShellPage {
  constructor(private readonly page: Page) {}

  async installProjectContext(): Promise<void> {
    const id = String(projectId());
    await this.page.addInitScript(
      ({ keys, value }: { keys: readonly string[]; value: string }) => {
        for (const key of keys) sessionStorage.setItem(key, value);
      },
      { keys: [...PROJECT_STORAGE_KEYS], value: id },
    );
  }

  async applyProjectContext(): Promise<void> {
    const id = String(projectId());
    await this.page.evaluate(
      ({ keys, value }: { keys: readonly string[]; value: string }) => {
        for (const key of keys) sessionStorage.setItem(key, value);
      },
      { keys: [...PROJECT_STORAGE_KEYS], value: id },
    );
  }

  async goto(path: string, sourceRef: string): Promise<void> {
    await this.installProjectContext();
    if (this.page.url().includes("/dataAssets/")) {
      await this.page.goto("about:blank", { waitUntil: "domcontentloaded" });
    }
    await this.page.goto(buildDataAssetsUrl(path, projectId()), {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await this.applyProjectContext();
    await expect(
      this.page.locator("body"),
      `${sourceRef}: dataAssets shell should not show login page`,
    ).not.toContainText(/欢迎登录|UIC账号登录|账号登录/, { timeout: 10_000 });
  }

  async expectShellReady(sourceRef: string): Promise<void> {
    for (const label of ["资产盘点", "元数据", "数据标准", "数据模型", "数据质量", "数据安全", "平台管理"]) {
      await expect(
        this.shellMenuItem(label),
        `${sourceRef}: dataAssets shell navigation should expose ${label}`,
      ).toBeVisible({ timeout: 30_000 });
    }
  }

  async expectDomainVisible(domain: DataAssetsDomain, sourceRef: string): Promise<void> {
    for (const label of DATA_ASSETS_DOMAIN_LABELS[domain]) {
      await expect(
        this.shellMenuItem(label),
        `${sourceRef}: shell navigation should expose domain label ${label}`,
      ).toBeVisible({ timeout: 30_000 });
    }
  }

  async collectSnapshot(sourceRef: string): Promise<ShellSnapshot> {
    const bodyText = await this.page.locator("body").innerText({ timeout: 10_000 });
    return {
      sourceRef,
      url: this.page.url(),
      title: await this.page.title(),
      bodyExcerpt: bodyText.slice(0, 1200),
      menuItems: await this.visibleTexts("nav li, aside li, [class*='menu'] li"),
      buttons: await this.visibleTexts("button"),
      formLabels: await this.visibleTexts(".ant-form-item-label, label"),
      tableHeaders: await this.visibleTexts(".ant-table-thead th"),
    };
  }

  private async visibleTexts(selector: string): Promise<readonly string[]> {
    return this.page.locator(selector).evaluateAll((nodes) =>
      Array.from(
        new Set(
          nodes
            .map((node) => (node.textContent ?? "").replace(/\s+/g, " ").trim())
            .filter((text) => text.length > 0),
        ),
      ).slice(0, 80),
    );
  }

  private shellMenuItem(label: string) {
    return this.page
      .locator("nav, aside, .ant-menu, [class*='menu']")
      .locator("a, [role='menuitem'], li, [class*='menu-item']")
      .filter({ hasText: label })
      .first();
  }
}
