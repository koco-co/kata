# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI + 业务记录 >> 标准基础页创建词根、码表并执行数据库拾取
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:22:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: Doris collection source should be available

expect(locator).toBeVisible() failed

Locator: locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /Doris3\.x|Doris2\.x|Doris/i }).first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: Doris collection source should be available with timeout 10000ms
  - waiting for locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /Doris3\.x|Doris2\.x|Doris/i }).first()

```

```yaml
- banner:
  - img "logo"
  - text: DataAssets
  - menu:
    - menuitem "资产盘点":
      - link "资产盘点":
        - /url: "#/assetsStatistics"
    - menuitem "元数据":
      - link "元数据":
        - /url: "#/metaDataCenter"
    - menuitem "数据标准":
      - link "数据标准":
        - /url: "#/standardStatistic"
    - menuitem "数据模型":
      - link "数据模型":
        - /url: "#/builtSpecificationTable"
    - menuitem "数据质量":
      - link "数据质量":
        - /url: "#/dq/overview"
    - menuitem "数据安全":
      - link "数据安全":
        - /url: "#/dataAuth/permissionAssign"
    - menuitem "平台管理":
      - link "平台管理":
        - /url: "#/dataSourceManage"
  - list:
    - button:
      - img
    - link "question-circle":
      - /url: /helpSite/docs/assets/root/summary/
      - img "question-circle"
    - link "message":
      - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
      - img "message"
    - img "setting"
    - text: admin@dtstack.com
- complementary:
  - menu:
    - menuitem "标准统计":
      - link "标准统计":
        - /url: "#/standardStatistic"
    - menuitem "标准管理"
    - menuitem "标准基础" [expanded]
    - list:
      - menuitem "词根管理":
        - link "词根管理":
          - /url: "#/rootManage"
      - menuitem "码表管理":
        - link "码表管理":
          - /url: "#/codeTableManage"
      - menuitem "行业模版":
        - link "行业模版":
          - /url: "#/industryTemplate"
      - menuitem "数据库拾取":
        - link "数据库拾取":
          - /url: "#/databaseCollect"
- main:
  - button "新建拾取"
  - table:
    - rowgroup:
      - row "拾取类型 filter 拾取来源 拾取条件 状态 filter 拾取数量 创建时间 完成时间 操作":
        - columnheader "拾取类型 filter":
          - text: 拾取类型
          - button "filter":
            - img "filter"
        - columnheader "拾取来源"
        - columnheader "拾取条件":
          - text: 拾取条件
          - img
        - columnheader "状态 filter":
          - text: 状态
          - button "filter":
            - img "filter"
        - columnheader "拾取数量"
        - columnheader "创建时间"
        - columnheader "完成时间"
        - columnheader "操作"
  - table:
    - rowgroup:
      - row "暂无数据 暂无数据":
        - cell "暂无数据 暂无数据":
          - img "暂无数据"
          - text: 暂无数据
- dialog "新建拾取":
  - button "Close":
    - img "close"
  - text: 新建拾取
  - img
  - text: 拾取类型
  - radio "词根管理" [checked]
  - text: 词根管理
  - radio "数据标准"
  - text: 数据标准 * 拾取来源
  - combobox "* 拾取来源" [expanded]:
    - listbox:
      - option "45"
      - option "118"
  - text: 请选择拾取来源 * 拾取条件 重复数>
  - button "Increase Value":
    - img "up"
  - button "Decrease Value":
    - img "down"
  - spinbutton
  - button "取 消"
  - button "确 定"
- text: SparkThrift2.x STAR_ROCKS_3.x
```

# Test source

```ts
  742 |   private async findStandardRecord(standardNameCn: string): Promise<StandardRow> {
  743 |     const data = this.expectApiData(
  744 |       "query standard records",
  745 |       await this.postJsonFromPage<ApiResponse<PagedListData<StandardRow>>>("/dmetadata/v1/dataStandard/pageQuery", {
  746 |         asc: false,
  747 |         current: 1,
  748 |         field: "create_at",
  749 |         search: standardNameCn,
  750 |         size: 20,
  751 |       }),
  752 |     );
  753 |     const record = (data.contentList ?? []).find((item) => item.standardNameCn === standardNameCn);
  754 |     if (!record) throw new Error(`Standard record not found: ${standardNameCn}`);
  755 |     return record;
  756 |   }
  757 | 
  758 |   private async fillModalFormInput(modal: Locator, label: string, value: string): Promise<void> {
  759 |     const field = modal.locator(".ant-form-item").filter({ hasText: looseLabel(label) }).first();
  760 |     const input = field.locator("input").first();
  761 |     await expect(input, `input ${label} should be visible`).toBeVisible({ timeout: 10_000 });
  762 |     await input.fill(value);
  763 |     await expect(input, `input ${label} should have value`).toHaveValue(value);
  764 |   }
  765 | 
  766 |   private async listDatabaseCollections(): Promise<DatabaseCollectionRecord[]> {
  767 |     const data = this.expectApiData(
  768 |       "list database collections",
  769 |       await this.postJsonFromPage<ApiResponse<PagedListData<DatabaseCollectionRecord>>>(
  770 |         "/dmetadata/v1/databaseCollection/pageQueryCollection",
  771 |         {
  772 |           asc: false,
  773 |           current: 1,
  774 |           size: 50,
  775 |         },
  776 |       ),
  777 |     );
  778 |     return data.contentList ?? [];
  779 |   }
  780 | 
  781 |   private async createDatabaseCollection(
  782 |     typeLabel: "词根管理" | "数据标准",
  783 |     existingCollectionIds: Set<string>,
  784 |     sourceRef: string,
  785 |   ): Promise<DatabaseCollectionRecord> {
  786 |     const modal = await this.openDatabaseCollectModal(sourceRef);
  787 |     await this.fillDatabaseCollectModal(modal, typeLabel, sourceRef);
  788 |     const saveResponse = this.page.waitForResponse(
  789 |       (response) => response.url().includes("/dmetadata/v1/databaseCollection/addCollection"),
  790 |       { timeout: 30_000 },
  791 |     );
  792 |     await modal.locator(".ant-modal-footer .ant-btn-primary").click();
  793 |     await this.expectOkApiResponse(await saveResponse, "/dmetadata/v1/databaseCollection/addCollection", sourceRef);
  794 | 
  795 |     return this.waitForDatabaseCollection(
  796 |       (record) =>
  797 |         !existingCollectionIds.has(String(record.id)) &&
  798 |         Number(record.collectType) === (typeLabel === "词根管理" ? 0 : 1) &&
  799 |         DORIS_COLLECTION_SOURCE.test(String(record.collectFrom ?? "")) &&
  800 |         /1/.test(String(record.collectCondition ?? "")),
  801 |       `${sourceRef}: ${typeLabel} database collection should be created`,
  802 |     );
  803 |   }
  804 | 
  805 |   private async openDatabaseCollectModal(sourceRef: string): Promise<Locator> {
  806 |     const addBtn = this.page.getByRole("button", { name: looseLabel("新建拾取") }).first();
  807 |     await expect(addBtn, `${sourceRef}: add database collection button should be visible`).toBeVisible({
  808 |       timeout: 10_000,
  809 |     });
  810 |     await addBtn.click();
  811 | 
  812 |     const modal = this.page.locator(".ant-modal:visible").first();
  813 |     await expect(modal, `${sourceRef}: add database collection modal should be visible`).toBeVisible({
  814 |       timeout: 10_000,
  815 |     });
  816 |     await expect(modal, `${sourceRef}: add database collection modal should have title`).toContainText("新建拾取");
  817 |     return modal;
  818 |   }
  819 | 
  820 |   private async fillDatabaseCollectModal(
  821 |     modal: Locator,
  822 |     typeLabel: "词根管理" | "数据标准",
  823 |     sourceRef: string,
  824 |   ): Promise<void> {
  825 |     const typeRadio = modal
  826 |       .locator(".ant-radio-wrapper")
  827 |       .filter({ hasText: new RegExp(`^${escapeRegExp(typeLabel)}$`) })
  828 |       .first();
  829 |     await expect(typeRadio, `${sourceRef}: ${typeLabel} radio should be visible`).toBeVisible({ timeout: 10_000 });
  830 |     await typeRadio.click();
  831 | 
  832 |     const sourceField = modal.locator(".ant-form-item").filter({ hasText: /拾取来源/ }).first();
  833 |     const sourceSelect = sourceField.locator(".ant-select").first();
  834 |     await expect(sourceSelect, `${sourceRef}: collection source select should be visible`).toBeVisible({
  835 |       timeout: 10_000,
  836 |     });
  837 |     await sourceSelect.locator(".ant-select-selector").click();
  838 |     const sourceOption = this.page
  839 |       .locator(".ant-select-dropdown:visible .ant-select-item-option")
  840 |       .filter({ hasText: DORIS_COLLECTION_SOURCE })
  841 |       .first();
> 842 |     await expect(sourceOption, `${sourceRef}: Doris collection source should be available`).toBeVisible({
      |                                                                                             ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: Doris collection source should be available
  843 |       timeout: 10_000,
  844 |     });
  845 |     await sourceOption.click();
  846 |     await modal.locator(".ant-modal-title").click();
  847 |     await expect(sourceField, `${sourceRef}: selected source should be shown`).toContainText(DORIS_COLLECTION_SOURCE);
  848 | 
  849 |     const conditionInput = modal
  850 |       .locator(".ant-form-item")
  851 |       .filter({ hasText: /拾取条件/ })
  852 |       .locator('input[role="spinbutton"], input.ant-input-number-input')
  853 |       .first();
  854 |     await expect(conditionInput, `${sourceRef}: collection condition input should be visible`).toBeVisible({
  855 |       timeout: 10_000,
  856 |     });
  857 |     await conditionInput.fill("1");
  858 |     await expect(conditionInput, `${sourceRef}: collection condition should be 1`).toHaveValue("1");
  859 |   }
  860 | 
  861 |   private async waitForDatabaseCollection(
  862 |     matcher: (record: DatabaseCollectionRecord) => boolean,
  863 |     message: string,
  864 |   ): Promise<DatabaseCollectionRecord> {
  865 |     let matchedRecord: DatabaseCollectionRecord | null = null;
  866 |     await expect
  867 |       .poll(
  868 |         async () => {
  869 |           matchedRecord = (await this.listDatabaseCollections()).find(matcher) ?? null;
  870 |           return matchedRecord ? String(matchedRecord.id) : "";
  871 |         },
  872 |         {
  873 |           timeout: 60_000,
  874 |           message,
  875 |         },
  876 |       )
  877 |       .not.toBe("");
  878 |     return matchedRecord as DatabaseCollectionRecord;
  879 |   }
  880 | 
  881 |   private async waitForDatabaseCollectionComplete(
  882 |     collectionId: number | string,
  883 |     sourceRef: string,
  884 |   ): Promise<DatabaseCollectionRecord> {
  885 |     let matchedRecord: DatabaseCollectionRecord | null = null;
  886 |     await expect
  887 |       .poll(
  888 |         async () => {
  889 |           matchedRecord =
  890 |             (await this.listDatabaseCollections()).find((record) => String(record.id) === String(collectionId)) ??
  891 |             null;
  892 |           return matchedRecord?.collectStatus ?? -1;
  893 |         },
  894 |         {
  895 |           timeout: 120_000,
  896 |           message: `${sourceRef}: database collection ${collectionId} should complete`,
  897 |         },
  898 |       )
  899 |       .toBe(1);
  900 |     return matchedRecord as DatabaseCollectionRecord;
  901 |   }
  902 | 
  903 |   private async expectDatabaseCollectionRow(
  904 |     record: DatabaseCollectionRecord,
  905 |     typeLabel: "词根管理" | "数据标准",
  906 |     sourceRef: string,
  907 |   ): Promise<void> {
  908 |     await this.goto("/databaseCollect", sourceRef, ["/dmetadata/v1/databaseCollection/pageQueryCollection"]);
  909 |     const row = this.page.locator(".ant-table-row").filter({ hasText: typeLabel }).filter({ hasText: "拾取完成" }).first();
  910 |     await expect(row, `${sourceRef}: ${typeLabel} database collection row should be visible`).toBeVisible({
  911 |       timeout: 30_000,
  912 |     });
  913 |     await expect(row, `${sourceRef}: collection source should be Doris`).toContainText(DORIS_COLLECTION_SOURCE);
  914 |     await expect(row, `${sourceRef}: collection condition should be visible`).toContainText(
  915 |       String(record.collectCondition ?? 1),
  916 |     );
  917 |     await expect(row.getByRole("button", { name: looseLabel("查看拾取") }).first()).toBeVisible();
  918 |   }
  919 | 
  920 |   private toDatabaseCollectionPlatformRecord(
  921 |     record: DatabaseCollectionRecord,
  922 |     typeLabel: "词根管理" | "数据标准",
  923 |   ): CreatedPlatformRecord {
  924 |     return {
  925 |       recordType: "database-collection",
  926 |       recordName: `${typeLabel}拾取_${record.id}`,
  927 |       recordId: String(record.id),
  928 |       status: "拾取完成",
  929 |       route: "/databaseCollect",
  930 |       evidence: `${typeLabel}数据库拾取记录完成，拾取数量=${record.collectCount ?? "unknown"}`,
  931 |       api: "/dmetadata/v1/databaseCollection/addCollection",
  932 |     };
  933 |   }
  934 | 
  935 |   private activeDatasourceType(): number {
  936 |     const config = getEnvConfig();
  937 |     const datasourceName = config.runtime.defaultDatasource;
  938 |     const datasource = config.datasources[datasourceName];
  939 |     const typeId = datasource.ui?.sourceTypeId ?? datasource.metadata.typeId;
  940 |     if (!typeId) throw new Error(`No datasource type configured for ${datasourceName}`);
  941 |     return typeId;
  942 |   }
```