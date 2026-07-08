# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI 合同 >> 标准管理页覆盖标准定义和标准映射入口
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:33:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API /dmetadata/v1/standardMapping/mappingList to return 2xx

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6] [cursor=pointer]:
          - img [ref=e8]
          - generic [ref=e10]:
            - img "logo" [ref=e12]
            - generic [ref=e14]: DataAssets
        - menu [ref=e17]:
          - menuitem "资产盘点" [ref=e18] [cursor=pointer]:
            - link "资产盘点" [ref=e20]:
              - /url: "#/assetsStatistics"
          - menuitem "元数据" [ref=e21] [cursor=pointer]:
            - link "元数据" [ref=e23]:
              - /url: "#/metaDataCenter"
          - menuitem "数据标准" [ref=e24] [cursor=pointer]:
            - link "数据标准" [ref=e26]:
              - /url: "#/standardStatistic"
          - menuitem "数据模型" [ref=e27] [cursor=pointer]:
            - link "数据模型" [ref=e29]:
              - /url: "#/builtSpecificationTable"
          - menuitem "数据质量" [ref=e30] [cursor=pointer]:
            - link "数据质量" [ref=e32]:
              - /url: "#/dq/overview"
          - menuitem "数据安全" [ref=e33] [cursor=pointer]:
            - link "数据安全" [ref=e35]:
              - /url: "#/dataAuth/permissionAssign"
          - menuitem "平台管理" [ref=e36] [cursor=pointer]:
            - link "平台管理" [ref=e38]:
              - /url: "#/dataSourceManage"
          - menuitem [disabled]:
            - img:
              - img
      - list [ref=e40]:
        - button [ref=e41] [cursor=pointer]:
          - img [ref=e43]
        - generic "帮助文档" [ref=e51] [cursor=pointer]:
          - link "question-circle" [ref=e52]:
            - /url: /helpSite/docs/assets/root/summary/
            - img "question-circle" [ref=e53]:
              - img [ref=e54]
        - link "message" [ref=e56] [cursor=pointer]:
          - /url: http://shuzhan63-test-ltqc.k8s.dtstack.cn/portal/#/message?app=dataAssets
          - img "message" [ref=e58]:
            - img [ref=e59]
        - img "setting" [ref=e62] [cursor=pointer]:
          - img [ref=e63]
        - generic "admin@dtstack.com" [ref=e66] [cursor=pointer]
    - generic [ref=e68]:
      - complementary [ref=e69]:
        - generic [ref=e70]:
          - img [ref=e72] [cursor=pointer]
          - menu [ref=e75]:
            - menuitem "标准统计" [ref=e76] [cursor=pointer]:
              - link "标准统计" [ref=e78]:
                - /url: "#/standardStatistic"
                - generic [ref=e79]:
                  - img [ref=e80]
                  - generic [ref=e83]: 标准统计
            - menuitem "标准管理" [expanded] [ref=e84] [cursor=pointer]:
              - generic [ref=e86]:
                - img [ref=e87]
                - generic [ref=e90]: 标准管理
            - list [ref=e91]:
              - menuitem "标准定义" [ref=e92] [cursor=pointer]:
                - link "标准定义" [ref=e94]:
                  - /url: "#/dataStandard"
                  - generic [ref=e97]: 标准定义
              - menuitem "标准映射" [ref=e98] [cursor=pointer]:
                - link "标准映射" [ref=e100]:
                  - /url: "#/standardMapping"
                  - generic [ref=e103]: 标准映射
              - menuitem "落标检查" [ref=e104] [cursor=pointer]:
                - link "落标检查" [ref=e106]:
                  - /url: "#/standardCheck"
                  - generic [ref=e109]: 落标检查
            - menuitem "标准基础" [ref=e110] [cursor=pointer]:
              - generic [ref=e112]:
                - img [ref=e113]
                - generic [ref=e116]: 标准基础
      - main [ref=e118]:
        - generic [ref=e120]:
          - generic [ref=e123]:
            - generic [ref=e124]:
              - generic [ref=e125]:
                - generic [ref=e126]: 
                - generic [ref=e127]: 标准目录
              - img [ref=e130]
            - generic [ref=e133]:
              - generic:
                - tree:
                  - generic:
                    - textbox "for screen reader"
          - generic [ref=e136]:
            - generic [ref=e138]:
              - generic [ref=e140]:
                - textbox "请输入标准名称进行搜索" [ref=e141]
                - button "search" [ref=e143] [cursor=pointer]:
                  - img "search" [ref=e144]:
                    - img [ref=e145]
              - button "标准映射" [ref=e147] [cursor=pointer]:
                - generic [ref=e148]: 标准映射
            - generic [ref=e153]:
              - table [ref=e155]:
                - rowgroup [ref=e162]:
                  - row "中文名称 英文名称 字段绑定(个) caret-up caret-down 最近映射时间 caret-up caret-down 操作" [ref=e163]:
                    - columnheader "中文名称" [ref=e164]
                    - columnheader "英文名称" [ref=e165]
                    - columnheader "字段绑定(个) caret-up caret-down" [ref=e166] [cursor=pointer]:
                      - generic [ref=e167]:
                        - generic [ref=e168]: 字段绑定(个)
                        - generic [ref=e170]:
                          - img "caret-up" [ref=e171]:
                            - img [ref=e172]
                          - img "caret-down" [ref=e174]:
                            - img [ref=e175]
                    - columnheader "最近映射时间 caret-up caret-down" [ref=e177] [cursor=pointer]:
                      - generic [ref=e178]:
                        - generic [ref=e179]: 最近映射时间
                        - generic [ref=e181]:
                          - img "caret-up" [ref=e182]:
                            - img [ref=e183]
                          - img "caret-down" [ref=e185]:
                            - img [ref=e186]
                    - columnheader "操作" [ref=e188]
              - table [ref=e190]:
                - rowgroup [ref=e197]:
                  - row "暂无数据 暂无数据" [ref=e198]:
                    - cell "暂无数据 暂无数据" [ref=e199]:
                      - generic [ref=e201]:
                        - img "暂无数据" [ref=e203]
                        - generic [ref=e204]: 暂无数据
  - generic [ref=e207]:
    - generic [ref=e208]:
      - alert [ref=e210]:
        - img "close-circle" [ref=e211]:
          - img [ref=e212]
        - generic [ref=e215]:
          - generic [ref=e216]:
            - text: 服务器异常
            - generic [ref=e217] [cursor=pointer]: 全部关闭
          - generic [ref=e218] [cursor=pointer]: 全部关闭
        - generic [ref=e219]: 服务器出现了点问题
      - img "close" [ref=e222] [cursor=pointer]:
        - img [ref=e223]
    - generic [ref=e225]:
      - alert [ref=e227]:
        - img "close-circle" [ref=e228]:
          - img [ref=e229]
        - generic [ref=e232]: 请求异常
        - generic [ref=e233]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e236] [cursor=pointer]:
        - img [ref=e237]
    - generic [ref=e239]:
      - alert [ref=e241]:
        - img "close-circle" [ref=e242]:
          - img [ref=e243]
        - generic [ref=e246]: 服务器异常
        - generic [ref=e247]: 服务器出现了点问题
      - img "close" [ref=e250] [cursor=pointer]:
        - img [ref=e251]
    - generic [ref=e253]:
      - alert [ref=e255]:
        - img "close-circle" [ref=e256]:
          - img [ref=e257]
        - generic [ref=e260]: 请求异常
        - generic [ref=e261]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e264] [cursor=pointer]:
        - img [ref=e265]
```

# Test source

```ts
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
  245 |     expect(response, `${sourceRef}: expected API response ${apiPath}`).not.toBeNull();
> 246 |     expect(response?.ok(), `${sourceRef}: expected API ${apiPath} to return 2xx`).toBe(true);
      |                                                                                   ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API /dmetadata/v1/standardMapping/mappingList to return 2xx
  247 |   }
  248 | 
  249 |   private body() {
  250 |     return this.page.locator("body");
  251 |   }
  252 | }
  253 | 
```