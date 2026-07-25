import { expect, type Page } from "@playwright/test";

import { clickButtonByText, expectAnyText, waitForDassetsResponse } from "./metadata-shell-page";
import { openFirstTableDetail } from "./metadata-table-detail-page";

export type LineageNodeType = "数据表" | "离线任务" | "实时任务" | "视图" | "API/指标";

export interface LineageOptions {
  readonly nodeType: LineageNodeType;
  readonly keyword: string;
  readonly sourceRef: string;
}

export async function expectLineage(page: Page, options: LineageOptions): Promise<void> {
  await openFirstTableDetail(page, options.keyword, options.sourceRef);
  await waitForDassetsResponse(
    page,
    async () => {
      await clickButtonByText(page, "血缘关系", options.sourceRef);
    },
    options.sourceRef,
    (url) => /lineage|relation|blood|metadata|asset/i.test(url),
  );
  await expectLineageShell(page, options);
}

export async function expectLineageParser(page: Page, sourceRef: string): Promise<void> {
  await expectLineage(page, { nodeType: "视图", keyword: "source_user_data", sourceRef });
  await clickButtonByText(page, "字段级血缘", sourceRef);
  await expectAnyText(page, ["字段级血缘", "source_user_data"], sourceRef);
}

export async function expectViewLineage(page: Page, sourceRef: string): Promise<void> {
  await expectLineage(page, { nodeType: "视图", keyword: "view", sourceRef });
  await clickButtonByText(page, "字段级血缘", sourceRef);
  await expectAnyText(page, ["字段级血缘", "表级血缘"], sourceRef);
}

async function expectLineageShell(page: Page, options: LineageOptions): Promise<void> {
  await expectAnyText(page, ["表级血缘", "展示文字信息", "资产类型", "导航器"], options.sourceRef);
  await expect(page.locator("body"), `${options.sourceRef}: 应展示节点类型 ${options.nodeType}`).toContainText(
    new RegExp(options.nodeType.replace("/", "|")),
    { timeout: 30000 },
  );
  await expectAnyText(page, ["每个节点都可右击查看该节点的全链路血缘"], options.sourceRef);
  await clickButtonByText(page, "展示文字信息", options.sourceRef);
  await clickButtonByText(page, "居中", options.sourceRef);
}
