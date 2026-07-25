import { type Page } from "@playwright/test";

import { clickButtonByText, clickMetadataMenu, expectAnyText, gotoMetadataPage, waitForDassetsResponse } from "./metadata-shell-page";
import { openFirstTableDetail } from "./metadata-table-detail-page";

export async function openSubscribedData(page: Page, sourceRef: string): Promise<void> {
  await gotoMetadataPage(page);
  await clickMetadataMenu(page, "订阅的数据");
  await expectAnyText(page, ["订阅的数据", "数据表"], sourceRef);
}

export async function expectSubscribeFlow(page: Page, sourceRef: string): Promise<void> {
  await openFirstTableDetail(page, "test_table", sourceRef);
  await openSubscribeDialog(page, sourceRef);
  await chooseSubscribeMethods(page, ["邮箱"], sourceRef);
  await waitForDassetsResponse(
    page,
    async () => {
      await clickButtonByText(page, "确定", sourceRef);
    },
    sourceRef,
    (url) => /subscribe|subscription|notice|metadata/i.test(url),
  );
  await expectAnyText(page, ["取消订阅", "修改订阅"], sourceRef);
}

export async function expectSubscribeDialog(page: Page, sourceRef: string): Promise<void> {
  await openFirstTableDetail(page, "test_table", sourceRef);
  await openSubscribeDialog(page, sourceRef);
  await expectAnyText(page, ["订阅", "邮箱", "钉钉", "取消", "确定"], sourceRef);
}

async function openSubscribeDialog(page: Page, sourceRef: string): Promise<void> {
  await clickButtonByText(page, "订阅", sourceRef);
  await expectAnyText(page, ["订阅", "告警方式"], sourceRef);
}

async function chooseSubscribeMethods(page: Page, methods: readonly string[], sourceRef: string): Promise<void> {
  for (const method of methods) {
    const option = page.locator(".ant-checkbox-wrapper, .ant-radio-wrapper, label").filter({ hasText: method }).first();
    await option.click();
  }
  await expectAnyText(page, methods, sourceRef);
}
