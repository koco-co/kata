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
  let subscribed = false;
  try {
    await chooseSubscribeMethods(page, ["邮箱"], sourceRef);
    await waitForDassetsResponse(
      page,
      async () => {
        await clickButtonByText(page, "确定", sourceRef);
      },
      sourceRef,
      (url) => /subscribe|subscription|notice|metadata/i.test(url),
    );
    subscribed = true;
    await expectAnyText(page, ["取消订阅", "修改订阅"], sourceRef);
  } finally {
    // 还原状态：已订阅的要取消订阅，未订阅成功的弹窗要关闭，避免污染后续用例
    if (subscribed) {
      await clickButtonByText(page, "取消订阅", sourceRef).catch(() => {});
      const confirmButton = page.getByRole("button", { name: /确定|确认/ }).first();
      if (await confirmButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmButton.click().catch(() => {});
      }
    } else {
      await closeDialogByCancel(page);
    }
  }
}

export async function expectSubscribeDialog(page: Page, sourceRef: string): Promise<void> {
  await openFirstTableDetail(page, "test_table", sourceRef);
  await openSubscribeDialog(page, sourceRef);
  try {
    await expectAnyText(page, ["订阅", "邮箱", "钉钉", "取消", "确定"], sourceRef);
  } finally {
    await closeDialogByCancel(page);
  }
}

async function closeDialogByCancel(page: Page): Promise<void> {
  const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cancelButton.click().catch(() => {});
  }
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
