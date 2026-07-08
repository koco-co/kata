# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI 合同 >> 落标检查页覆盖总览、设置/结果列表和新增检查任务入口
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:43:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API response /dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource

expect(received).not.toBeNull()

Received: null
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]: DataAssets · 数据资产
  - img [ref=e15]
```

# Test source

```ts
  145 |       "/dmetadata/v1/standardCatalog/listCatalog",
  146 |     ]);
  147 |     await this.expectBodyTexts(sourceRef, ["标准定义", "标准目录", "导出标准", "导入标准", "新建标准"]);
  148 |     await this.expectTableHeaders(sourceRef, ["中文名称", "英文名称", "英文缩写", "业务定义", "状态", "创建时间", "操作"]);
  149 |   }
  150 | 
  151 |   async expectStandardMapping(sourceRef: string): Promise<void> {
  152 |     await this.goto("/standardMapping", sourceRef, [
  153 |       "/dmetadata/v1/standardMapping/mappingList",
  154 |       "/dmetadata/v1/standardCatalog/listCatalog",
  155 |     ]);
  156 |     await this.expectBodyTexts(sourceRef, ["标准映射", "标准目录"]);
  157 |     await expect(
  158 |       this.page.getByRole("button", { name: looseLabel("标准映射") }).first(),
  159 |       `${sourceRef}: standard mapping button should be visible`,
  160 |     ).toBeVisible({ timeout: 20_000 });
  161 |     await this.expectTableHeaders(sourceRef, ["中文名称", "英文名称", "字段绑定(个)", "最近映射时间", "操作"]);
  162 |   }
  163 | 
  164 |   async expectStandardCheck(sourceRef: string): Promise<void> {
  165 |     await this.goto("/standardCheck", sourceRef, [
  166 |       "/dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource",
  167 |       "/dmetadata/v1/standardTableCheck/overview",
  168 |       "/dmetadata/v1/standardTableCheck/list",
  169 |     ]);
  170 |     await this.expectBodyTexts(sourceRef, [
  171 |       "落标检查总览",
  172 |       "检查数据表",
  173 |       "标准达标率",
  174 |       "检查字段总数",
  175 |       "达标字段数",
  176 |       "落标检查设置",
  177 |       "落标检查结果",
  178 |       "新增检查任务",
  179 |       "批量开启",
  180 |       "批量关闭",
  181 |     ]);
  182 |     await this.expectTableHeaders(sourceRef, [
  183 |       "数据表名称",
  184 |       "所属数据源",
  185 |       "所属数据库",
  186 |       "检查字段数/总字段数",
  187 |       "检查周期",
  188 |       "检查状态",
  189 |       "标准达标率",
  190 |       "不达标字段数/检查失败数",
  191 |       "最近编辑时间",
  192 |       "最近检查时间",
  193 |       "操作",
  194 |     ]);
  195 |   }
  196 | 
  197 |   async expectStandardCheckAddEntry(sourceRef: string): Promise<void> {
  198 |     await this.expectStandardCheck(sourceRef);
  199 |     await this.page.getByRole("button", { name: "新增检查任务" }).click();
  200 |     await expect(this.body(), `${sourceRef}: add check task should expose content configuration`).toContainText(
  201 |       /数据源|数据库|数据表|标准目录|下一步|取消/,
  202 |       { timeout: 30_000 },
  203 |     );
  204 |   }
  205 | 
  206 |   private async installProjectContext(): Promise<void> {
  207 |     const id = String(projectId());
  208 |     await this.page.addInitScript(
  209 |       ({ keys, value }: { keys: readonly string[]; value: string }) => {
  210 |         for (const key of keys) window.sessionStorage.setItem(key, value);
  211 |       },
  212 |       { keys: [...PROJECT_STORAGE_KEYS], value: id },
  213 |     );
  214 |   }
  215 | 
  216 |   private async applyProjectContext(): Promise<void> {
  217 |     const id = String(projectId());
  218 |     await this.page.evaluate(
  219 |       ({ keys, value }: { keys: readonly string[]; value: string }) => {
  220 |         for (const key of keys) window.sessionStorage.setItem(key, value);
  221 |       },
  222 |       { keys: [...PROJECT_STORAGE_KEYS], value: id },
  223 |     );
  224 |   }
  225 | 
  226 |   private async expectBodyTexts(sourceRef: string, labels: readonly string[]): Promise<void> {
  227 |     for (const label of labels) {
  228 |       await expect(this.body(), `${sourceRef}: body should contain ${label}`).toContainText(label, {
  229 |         timeout: 30_000,
  230 |       });
  231 |     }
  232 |   }
  233 | 
  234 |   private async expectTableHeaders(sourceRef: string, headers: readonly string[]): Promise<void> {
  235 |     const thead = this.page.locator(".ant-table-thead").first();
  236 |     await expect(thead, `${sourceRef}: table header should be visible`).toBeVisible({ timeout: 20_000 });
  237 |     for (const header of headers) {
  238 |       await expect(thead, `${sourceRef}: table header should contain ${header}`).toContainText(header, {
  239 |         timeout: 20_000,
  240 |       });
  241 |     }
  242 |   }
  243 | 
  244 |   private expectOkResponse(response: Response | null, apiPath: string, sourceRef: string): void {
> 245 |     expect(response, `${sourceRef}: expected API response ${apiPath}`).not.toBeNull();
      |                                                                            ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API response /dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource
  246 |     expect(response?.ok(), `${sourceRef}: expected API ${apiPath} to return 2xx`).toBe(true);
  247 |   }
  248 | 
  249 |   private body() {
  250 |     return this.page.locator("body");
  251 |   }
  252 | }
  253 | 
```