import { expect, type Locator, type Page } from "@playwright/test";

import { buildDataAssetsApiUrl } from "../../../helpers/test-setup";
import { DataAssetsShellPage } from "../base/data-assets-shell-page";

type ApiEnvelope<T> = {
  readonly code?: number;
  readonly message?: string | null;
  readonly data?: T;
};

type DataMapPage<T> = {
  readonly records?: T[];
  readonly contentList?: T[];
  readonly total?: number;
};

type ResourceCatalogNode = {
  readonly id?: number | string;
  readonly catalogName?: string;
  readonly name?: string;
  readonly title?: string;
  readonly children?: ResourceCatalogNode[];
  readonly childList?: ResourceCatalogNode[];
  readonly subCatalogList?: ResourceCatalogNode[];
};

type DataMapFieldRecord = {
  readonly columnName?: string;
  readonly fieldName?: string;
  readonly name?: string;
  readonly tableName?: string;
  readonly table?: string;
  readonly dbName?: string;
};

type FieldDirectoryFixture = {
  readonly customerCatalogName: string;
  readonly orderCatalogName: string;
  readonly customerTableName: string;
  readonly orderTableName: string;
  readonly customerFields: readonly string[];
  readonly orderFields: readonly string[];
};

export class LaunchedAssetsPage {
  private readonly shell: DataAssetsShellPage;

  constructor(private readonly page: Page) {
    this.shell = new DataAssetsShellPage(page);
  }

  async gotoDataMap(sourceRef: string): Promise<void> {
    await this.shell.goto("/metaDataCenter", sourceRef);
    await expect(this.page.getByText("数据地图", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  async openFieldResults(sourceRef: string): Promise<void> {
    await this.page.getByText("字段", { exact: true }).first().click();
    await expect(this.page, `${sourceRef}: clicking field asset type should open field results`).toHaveURL(
      /#\/metaDataSearch/,
      { timeout: 30_000 },
    );
    await expect(this.page.locator("body")).toContainText("是否开启模糊匹配", { timeout: 30_000 });
  }

  async expectFieldResultCatalogShell(sourceRef: string): Promise<void> {
    const body = this.page.locator("body");
    for (const text of ["字段", "数据目录", "数据源类型(4)", "请选择数据源类型"]) {
      await expect(body, `${sourceRef}: field result shell should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async expectCurrentFieldRows(sourceRef: string, totalText: RegExp): Promise<void> {
    const body = this.page.locator("body");
    await expect(body, `${sourceRef}: field result list should show current rows`).toContainText(totalText, {
      timeout: 30_000,
    });
    await expect(body, `${sourceRef}: field result list should include field rows`).toContainText(/id|score|category/, {
      timeout: 30_000,
    });
  }

  async expectFieldDirectoryBusinessFlow(
    sourceRef: string,
    fixtures: FieldDirectoryFixture,
  ): Promise<void> {
    const catalogIds = await this.resolveCatalogIds(sourceRef, [
      fixtures.customerCatalogName,
      fixtures.orderCatalogName,
    ]);
    const customerCatalogId = catalogIds.get(fixtures.customerCatalogName);
    const orderCatalogId = catalogIds.get(fixtures.orderCatalogName);

    expect(customerCatalogId, `${sourceRef}: customer resource catalog should exist`).toBeTruthy();
    expect(orderCatalogId, `${sourceRef}: order resource catalog should exist`).toBeTruthy();

    const customerCust = await this.queryFields({ search: "cust", resourceCatalogId: customerCatalogId });
    this.expectOnlyTables(sourceRef, customerCust.records, [fixtures.customerTableName]);
    this.expectFieldKeys(sourceRef, customerCust.records, [
      `${fixtures.customerTableName}.cust_name`,
      `${fixtures.customerTableName}.cust_cert_code`,
    ]);

    const customerName = await this.queryFields({ search: "name", resourceCatalogId: customerCatalogId });
    this.expectFieldKeys(sourceRef, customerName.records, [`${fixtures.customerTableName}.cust_name`]);
    this.expectMissingFieldKeys(sourceRef, customerName.records, [`${fixtures.orderTableName}.order_name`]);

    const customerNoMatch = await this.queryFields({
      search: "vehicle_not_exist",
      resourceCatalogId: customerCatalogId,
    });
    expect(customerNoMatch.total, `${sourceRef}: no-match field query should return an empty page`).toBe(0);

    const orderAll = await this.queryFields({ search: "", resourceCatalogId: orderCatalogId });
    this.expectOnlyTables(sourceRef, orderAll.records, [fixtures.orderTableName]);
    this.expectFieldKeys(sourceRef, orderAll.records, [
      `${fixtures.orderTableName}.order_amount`,
      `${fixtures.orderTableName}.order_name`,
    ]);
    this.expectMissingFieldKeys(sourceRef, orderAll.records, [`${fixtures.customerTableName}.cust_name`]);

    const exactCustomerName = await this.queryFields({
      search: "cust_name",
      resourceCatalogId: customerCatalogId,
      matchMode: 0,
    });
    expect(exactCustomerName.total, `${sourceRef}: exact cust_name query should return one field`).toBe(1);
    this.expectFieldKeys(sourceRef, exactCustomerName.records, [`${fixtures.customerTableName}.cust_name`]);

    const globalCustomerName = await this.queryFields({ search: "cust_name", matchMode: 0 });
    const globalOrderName = await this.queryFields({ search: "order_name", matchMode: 0 });
    this.expectFieldKeys(sourceRef, globalCustomerName.records, [`${fixtures.customerTableName}.cust_name`]);
    this.expectFieldKeys(sourceRef, globalOrderName.records, [`${fixtures.orderTableName}.order_name`]);
  }

  async gotoMetadataSync(sourceRef: string): Promise<void> {
    await this.shell.goto("/metaDataSync", sourceRef);
    const body = this.page.locator("body");
    for (const text of ["元数据同步", "周期同步", "新增周期同步任务"]) {
      await expect(body, `${sourceRef}: metadata sync page should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async openFirstSparkMetadataSyncEditSchedule(sourceRef: string, dataSourceName: string): Promise<void> {
    await expect(this.page.locator("body"), `${sourceRef}: spark sync task should exist`).toContainText(
      dataSourceName,
      { timeout: 30_000 },
    );
    // 必须定位到目标数据源所在行再点「编辑」，避免误改其他同步任务
    const targetRow = this.page
      .locator(".ant-table-tbody tr")
      .filter({ hasText: dataSourceName })
      .first();
    await expect(targetRow, `${sourceRef}: sync task row for ${dataSourceName} should exist`).toBeVisible({
      timeout: 30_000,
    });
    await targetRow.getByText("编辑", { exact: true }).first().click();
    await expect(this.page.locator("body")).toContainText("编辑周期同步任务", { timeout: 30_000 });
    await this.page.getByRole("button", { name: "下一步" }).click();
    await expect(this.page.locator("body")).toContainText("调度配置", { timeout: 30_000 });
  }

  async expectMetadataEnvironmentConfigButton(sourceRef: string): Promise<void> {
    await expect(
      this.page.getByRole("button", { name: "环境参数配置" }),
      `${sourceRef}: Spark metadata sync schedule should expose environment parameter config`,
    ).toBeVisible({ timeout: 30_000 });
  }

  async openMetadataEnvironmentConfigDialog(sourceRef: string): Promise<void> {
    await this.page.getByRole("button", { name: "环境参数配置" }).click();
    await expect(this.overlay(), `${sourceRef}: environment parameter dialog container should be visible`).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.overlay(), `${sourceRef}: environment parameter dialog should open`).toContainText(
      /环境参数|Spark|spark/i,
      { timeout: 30_000 },
    );
  }

  async gotoStandardCheck(sourceRef: string): Promise<void> {
    await this.shell.goto("/standardCheck", sourceRef);
    const body = this.page.locator("body");
    for (const text of ["落标检查", "落标检查设置", "新增检查任务"]) {
      await expect(body, `${sourceRef}: standard check page should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  async openNewStandardCheckTask(sourceRef: string): Promise<void> {
    await this.page.getByRole("button", { name: "新增检查任务" }).click();
    await expect(this.page, `${sourceRef}: new standard check task route should open`).toHaveURL(
      /#\/standardCheck\/addTask/,
      { timeout: 30_000 },
    );
    await expect(this.page.locator("body")).toContainText("检查内容", { timeout: 30_000 });
  }

  async expectStandardCheckSparkEntry(sourceRef: string): Promise<void> {
    const body = this.page.locator("body");
    for (const text of ["数据源", "请选择数据源", "数据库", "数据表", "下一步"]) {
      await expect(body, `${sourceRef}: standard check add form should expose ${text}`).toContainText(text, {
        timeout: 30_000,
      });
    }
  }

  private overlay(): Locator {
    return this.page.locator(".ant-modal, .ant-drawer, .ant-popover").last();
  }

  private async apiPost<T>(path: string, data: unknown, sourceRef: string): Promise<T> {
    const response = await this.page.request.post(buildDataAssetsApiUrl(path), { data });
    expect(response.ok(), `${sourceRef}: ${path} should return HTTP 2xx`).toBeTruthy();

    const body = (await response.json()) as ApiEnvelope<T>;
    expect(body.code, `${sourceRef}: ${path} should return business code=1 (${body.message ?? ""})`).toBe(1);
    return body.data as T;
  }

  private async resolveCatalogIds(
    sourceRef: string,
    catalogNames: readonly string[],
  ): Promise<Map<string, string>> {
    const data = await this.apiPost<
      ResourceCatalogNode[] | { records?: ResourceCatalogNode[]; contentList?: ResourceCatalogNode[] }
    >("/dassets/v1/resourceCatalog/listCatalogByQuery", {}, sourceRef);
    const roots = Array.isArray(data) ? data : (data.records ?? data.contentList ?? []);
    const nodes = this.flattenCatalogNodes(roots);
    const result = new Map<string, string>();

    for (const name of catalogNames) {
      const node = nodes.find((item) => this.catalogName(item) === name);
      if (node?.id !== undefined) result.set(name, String(node.id));
    }

    return result;
  }

  private flattenCatalogNodes(nodes: readonly ResourceCatalogNode[]): ResourceCatalogNode[] {
    const out: ResourceCatalogNode[] = [];
    for (const node of nodes) {
      out.push(node);
      out.push(...this.flattenCatalogNodes(node.children ?? node.childList ?? node.subCatalogList ?? []));
    }
    return out;
  }

  private catalogName(node: ResourceCatalogNode): string {
    return node.catalogName ?? node.name ?? node.title ?? "";
  }

  private async queryFields(input: {
    readonly search: string;
    readonly resourceCatalogId?: string;
    readonly matchMode?: number;
  }): Promise<{ total: number; records: DataMapFieldRecord[] }> {
    const payload: Record<string, unknown> = {
      current: 1,
      size: 50,
      metaType: 2,
      search: input.search,
      field: "hot",
      asc: false,
    };
    if (input.resourceCatalogId) payload.resourceCatalogId = input.resourceCatalogId;
    if (input.matchMode !== undefined) payload.matchMode = input.matchMode;

    const data = await this.apiPost<DataMapPage<DataMapFieldRecord>>(
      "/dassets/v1/datamap/queryDetail",
      payload,
      "src.ui.datamap.field-directory-api@1",
    );
    const records = data.records ?? data.contentList ?? [];
    return { total: Number(data.total ?? records.length), records };
  }

  private expectOnlyTables(sourceRef: string, records: readonly DataMapFieldRecord[], tableNames: readonly string[]) {
    expect(records.length, `${sourceRef}: field query should return records`).toBeGreaterThan(0);
    const actual = new Set(records.map((record) => this.tableName(record)).filter(Boolean));
    expect([...actual].sort(), `${sourceRef}: field query should only include expected tables`).toEqual(
      [...tableNames].sort(),
    );
  }

  private expectFieldKeys(sourceRef: string, records: readonly DataMapFieldRecord[], expectedKeys: readonly string[]) {
    const actual = new Set(records.map((record) => this.fieldKey(record)));
    for (const key of expectedKeys) {
      expect(actual.has(key), `${sourceRef}: expected field ${key} should be present`).toBeTruthy();
    }
  }

  private expectMissingFieldKeys(
    sourceRef: string,
    records: readonly DataMapFieldRecord[],
    missingKeys: readonly string[],
  ) {
    const actual = new Set(records.map((record) => this.fieldKey(record)));
    for (const key of missingKeys) {
      expect(actual.has(key), `${sourceRef}: field ${key} should not be present`).toBeFalsy();
    }
  }

  private fieldKey(record: DataMapFieldRecord): string {
    return `${this.tableName(record)}.${record.columnName ?? record.fieldName ?? record.name ?? ""}`;
  }

  private tableName(record: DataMapFieldRecord): string {
    return record.tableName ?? record.table ?? "";
  }
}
