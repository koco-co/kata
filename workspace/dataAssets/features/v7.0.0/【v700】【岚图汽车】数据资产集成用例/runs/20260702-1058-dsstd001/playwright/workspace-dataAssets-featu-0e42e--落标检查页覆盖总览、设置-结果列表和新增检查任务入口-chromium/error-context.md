# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/runners/full.spec.ts >> @serial 【P1】「数据标准」模块集成测试用例 - live UI 合同 >> 落标检查页覆盖总览、设置/结果列表和新增检查任务入口
- Location: workspace/dataAssets/features/v7.0.0/【v700】【数据资产】数据资产集成用例/automation/tests/cases/t01-data-standard-module-contract.ts:43:3

# Error details

```
Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API /dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource to return 2xx

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
        - generic [ref=e119]:
          - paragraph [ref=e120]: 落标检查总览
          - generic [ref=e123]:
            - generic [ref=e124]:
              - paragraph [ref=e125]: 检查数据表
              - paragraph [ref=e126]: "--"
              - generic [ref=e128]: "标准达标率: --"
            - generic [ref=e129]:
              - generic [ref=e131]:
                - paragraph [ref=e132]: 检查字段总数
                - paragraph [ref=e133]: "--"
              - generic [ref=e136]:
                - paragraph [ref=e137]: 达标字段数
                - paragraph [ref=e138]: "--"
          - generic [ref=e139]:
            - generic [ref=e140]:
              - tablist [ref=e141]:
                - generic [ref=e143]:
                  - tab "落标检查设置" [selected] [ref=e145] [cursor=pointer]
                  - tab "落标检查结果" [ref=e147] [cursor=pointer]
              - generic:
                - generic:
                  - tabpanel "落标检查设置"
            - generic [ref=e149]:
              - generic [ref=e151]:
                - generic [ref=e154]:
                  - textbox "请输入数据表名/字段名搜索" [ref=e156]
                  - button "search" [ref=e159] [cursor=pointer]:
                    - img "search" [ref=e160]:
                      - img [ref=e161]
                - button "新增检查任务" [ref=e164] [cursor=pointer]:
                  - generic [ref=e165]: 新增检查任务
              - generic [ref=e169]:
                - generic [ref=e170]:
                  - table [ref=e172]:
                    - rowgroup [ref=e186]:
                      - row "数据表名称 所属数据源 filter 所属数据库 filter 检查字段数/总字段数 检查周期 检查状态 filter 标准达标率 不达标字段数/检查失败数 最近编辑时间 caret-up caret-down 最近检查时间 caret-up caret-down 操作" [ref=e187]:
                        - columnheader [ref=e188]:
                          - generic [ref=e191]:
                            - checkbox [disabled]
                        - columnheader "数据表名称" [ref=e193]
                        - columnheader "所属数据源 filter" [ref=e194]:
                          - generic [ref=e195]:
                            - generic [ref=e196]: 所属数据源
                            - button "filter" [ref=e197] [cursor=pointer]:
                              - img "filter" [ref=e198]:
                                - img [ref=e199]
                        - columnheader "所属数据库 filter" [ref=e201]:
                          - generic [ref=e202]:
                            - generic [ref=e203]: 所属数据库
                            - button "filter" [ref=e204] [cursor=pointer]:
                              - img "filter" [ref=e205]:
                                - img [ref=e206]
                        - columnheader "检查字段数/总字段数" [ref=e208]
                        - columnheader "检查周期" [ref=e209]
                        - columnheader "检查状态 filter" [ref=e210]:
                          - generic [ref=e211]:
                            - generic [ref=e212]: 检查状态
                            - button "filter" [ref=e213] [cursor=pointer]:
                              - img "filter" [ref=e214]:
                                - img [ref=e215]
                        - columnheader "标准达标率" [ref=e217]
                        - columnheader "不达标字段数/检查失败数" [ref=e218]
                        - columnheader "最近编辑时间 caret-up caret-down" [ref=e219] [cursor=pointer]:
                          - generic [ref=e220]:
                            - generic [ref=e221]: 最近编辑时间
                            - generic [ref=e223]:
                              - img "caret-up" [ref=e224]:
                                - img [ref=e225]
                              - img "caret-down" [ref=e227]:
                                - img [ref=e228]
                        - columnheader "最近检查时间 caret-up caret-down" [ref=e230] [cursor=pointer]:
                          - generic [ref=e231]:
                            - generic [ref=e232]: 最近检查时间
                            - generic [ref=e234]:
                              - img "caret-up" [ref=e235]:
                                - img [ref=e236]
                              - img "caret-down" [ref=e238]:
                                - img [ref=e239]
                        - columnheader "操作" [ref=e241]
                  - table [ref=e243]:
                    - rowgroup [ref=e257]:
                      - row "暂无数据 暂无数据" [ref=e258]:
                        - cell "暂无数据 暂无数据" [ref=e259]:
                          - generic [ref=e261]:
                            - img "暂无数据" [ref=e263]
                            - generic [ref=e264]: 暂无数据
                - generic [ref=e266]:
                  - generic [ref=e267]:
                    - checkbox [ref=e270] [cursor=pointer]
                    - generic [ref=e272]: 当前选中:0
                    - generic [ref=e273]:
                      - button "批量开启" [disabled] [ref=e275]:
                        - generic: 批量开启
                      - button "批量关闭" [disabled] [ref=e277]:
                        - generic: 批量关闭
                  - list [ref=e278]:
                    - listitem [ref=e279]: 共 0 条数据，每页显示 10 条
                    - listitem "上一页" [ref=e280]:
                      - button "left" [disabled] [ref=e281]:
                        - img "left" [ref=e282]:
                          - img [ref=e283]
                    - listitem "1" [ref=e285] [cursor=pointer]:
                      - generic [ref=e286]: "1"
                    - listitem "下一页" [ref=e287]:
                      - button "right" [disabled] [ref=e288]:
                        - img "right" [ref=e289]:
                          - img [ref=e290]
                    - listitem [ref=e292]:
                      - generic "页码" [ref=e293] [cursor=pointer]:
                        - generic [ref=e294]:
                          - combobox "页码" [ref=e296]
                          - generic "10 条/页" [ref=e297]
  - generic [ref=e300]:
    - generic [ref=e301]:
      - alert [ref=e303]:
        - img "close-circle" [ref=e304]:
          - img [ref=e305]
        - generic [ref=e308]:
          - generic [ref=e309]:
            - text: 服务器异常
            - generic [ref=e310] [cursor=pointer]: 全部关闭
          - generic [ref=e311] [cursor=pointer]: 全部关闭
        - generic [ref=e312]: 服务器出现了点问题
      - img "close" [ref=e315] [cursor=pointer]:
        - img [ref=e316]
    - generic [ref=e318]:
      - alert [ref=e320]:
        - img "close-circle" [ref=e321]:
          - img [ref=e322]
        - generic [ref=e325]: 请求异常
        - generic [ref=e326]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e329] [cursor=pointer]:
        - img [ref=e330]
    - generic [ref=e332]:
      - alert [ref=e334]:
        - img "close-circle" [ref=e335]:
          - img [ref=e336]
        - generic [ref=e339]: 服务器异常
        - generic [ref=e340]: 服务器出现了点问题
      - img "close" [ref=e343] [cursor=pointer]:
        - img [ref=e344]
    - generic [ref=e346]:
      - alert [ref=e348]:
        - img "close-circle" [ref=e349]:
          - img [ref=e350]
        - generic [ref=e353]: 请求异常
        - generic [ref=e354]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e357] [cursor=pointer]:
        - img [ref=e358]
    - generic [ref=e360]:
      - alert [ref=e362]:
        - img "close-circle" [ref=e363]:
          - img [ref=e364]
        - generic [ref=e367]: 服务器异常
        - generic [ref=e368]: 服务器出现了点问题
      - img "close" [ref=e371] [cursor=pointer]:
        - img [ref=e372]
    - generic [ref=e374]:
      - alert [ref=e376]:
        - img "close-circle" [ref=e377]:
          - img [ref=e378]
        - generic [ref=e381]: 请求异常
        - generic [ref=e382]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e385] [cursor=pointer]:
        - img [ref=e386]
    - generic [ref=e388]:
      - alert [ref=e390]:
        - img "close-circle" [ref=e391]:
          - img [ref=e392]
        - generic [ref=e395]: 服务器异常
        - generic [ref=e396]: 服务器出现了点问题
      - img "close" [ref=e399] [cursor=pointer]:
        - img [ref=e400]
    - generic [ref=e402]:
      - alert [ref=e404]:
        - img "close-circle" [ref=e405]:
          - img [ref=e406]
        - generic [ref=e409]: 请求异常
        - generic [ref=e410]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e413] [cursor=pointer]:
        - img [ref=e414]
    - generic [ref=e416]:
      - alert [ref=e418]:
        - img "close-circle" [ref=e419]:
          - img [ref=e420]
        - generic [ref=e423]: 服务器异常
        - generic [ref=e424]: 服务器出现了点问题
      - img "close" [ref=e427] [cursor=pointer]:
        - img [ref=e428]
    - generic [ref=e430]:
      - alert [ref=e432]:
        - img "close-circle" [ref=e433]:
          - img [ref=e434]
        - generic [ref=e437]: 请求异常
        - generic [ref=e438]: 服务器可能出了点问题, 请稍后再试！
      - img "close" [ref=e441] [cursor=pointer]:
        - img [ref=e442]
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
      |                                                                                   ^ Error: SR-UI-PROBE-20260702-DATA-STANDARD-LTQC: expected API /dmetadata/v1/standardTableCheck/configStandardTableCheckDatasource to return 2xx
  247 |   }
  248 | 
  249 |   private body() {
  250 |     return this.page.locator("body");
  251 |   }
  252 | }
  253 | 
```