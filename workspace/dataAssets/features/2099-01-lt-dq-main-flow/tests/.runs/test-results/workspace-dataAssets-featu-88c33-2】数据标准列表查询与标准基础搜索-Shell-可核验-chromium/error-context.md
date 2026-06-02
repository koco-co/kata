# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/runners/smoke.spec.ts >> 【P1/P2】数据标准列表查询与标准基础搜索 Shell 可核验
- Location: workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/cases/t05-standard-statistic-check-shell.ts:40:1

# Error details

```
Error: SR-2099-01-STD-002: 数据标准列表应展示「数据标准」

expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected substring: "数据标准"
Received string:    " 亲，是不是走错地方了？"
Timeout: 30000ms

Call log:
  - SR-2099-01-STD-002: 数据标准列表应展示「数据标准」 with timeout 30000ms
  - waiting for locator('body')
    4 × locator resolved to <body>…</body>
      - unexpected value "DataAssets · 数据资产"
    59 × locator resolved to <body>…</body>
       - unexpected value " 亲，是不是走错地方了？"

```

```yaml
- heading "frown 亲，是不是走错地方了？" [level=1]:
  - img "frown"
  - text: 亲，是不是走错地方了？
```

# Test source

```ts
  10  |     ([key, projectId]) => {
  11  |       sessionStorage.setItem(key, projectId);
  12  |     },
  13  |     [PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  14  |   );
  15  | }
  16  | 
  17  | async function injectProject(page: Page): Promise<void> {
  18  |   await page.evaluate(
  19  |     ([key, projectId]) => {
  20  |       sessionStorage.setItem(key, projectId);
  21  |     },
  22  |     [PROJECT_STORAGE_KEY, String(PROJECT_ID)],
  23  |   );
  24  | }
  25  | 
  26  | export async function gotoStandardPage(page: Page, path: string): Promise<void> {
  27  |   await installProject(page);
  28  |   await page.goto(buildDataAssetsUrl(path, PROJECT_ID), {
  29  |     waitUntil: "domcontentloaded",
  30  |     timeout: 60000,
  31  |   });
  32  |   await injectProject(page);
  33  | }
  34  | 
  35  | export async function expectStandardStatisticShell(page: Page, sourceRef: string): Promise<void> {
  36  |   await gotoStandardPage(page, "/standardStatistic");
  37  |   const body = page.locator("body");
  38  |   for (const label of [
  39  |     "标准统计",
  40  |     "数据标准",
  41  |     "已上线",
  42  |     "待上线",
  43  |     "代码表",
  44  |     "词根管理",
  45  |     "标准热度",
  46  |     "标准目录分布",
  47  |     "标准趋势",
  48  |     "标准来源分布",
  49  |   ]) {
  50  |     await expect(body, `${sourceRef}: 标准统计页应展示「${label}」`).toContainText(label, {
  51  |       timeout: 30000,
  52  |     });
  53  |   }
  54  | }
  55  | 
  56  | export async function expectStandardStatisticApis(page: Page, sourceRef: string): Promise<void> {
  57  |   const expected = [
  58  |     "/dmetadata/v1/standardStatistic/standardHot",
  59  |     "/dmetadata/v1/standardStatistic/standardTrend",
  60  |     "/dmetadata/v1/standardStatistic/rootCount",
  61  |     "/dmetadata/v1/standardStatistic/standardSource",
  62  |     "/dmetadata/v1/standardStatistic/codeCount",
  63  |     "/dmetadata/v1/standardStatistic/standardCatalog",
  64  |     "/dmetadata/v1/standardStatistic/standardCount",
  65  |   ];
  66  |   await expect
  67  |     .poll(
  68  |       () =>
  69  |         page.evaluate((paths) => {
  70  |           const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
  71  |           return paths.filter((path) => urls.some((url) => url.includes(path)));
  72  |         }, expected),
  73  |       {
  74  |         message: `${sourceRef}: 标准统计页应请求核心 standardStatistic 接口`,
  75  |         timeout: 30000,
  76  |       },
  77  |     )
  78  |     .toEqual(expected);
  79  | }
  80  | 
  81  | export async function expectStandardCheckShell(page: Page, sourceRef: string): Promise<void> {
  82  |   await gotoStandardPage(page, "/standardCheck");
  83  |   const body = page.locator("body");
  84  |   for (const label of [
  85  |     "落标检查",
  86  |     "新增检查任务",
  87  |     "批量开启",
  88  |     "批量关闭",
  89  |     "数据表名称",
  90  |     "所属数据源",
  91  |     "所属数据库",
  92  |     "检查字段数/总字段数",
  93  |     "检查周期",
  94  |     "检查状态",
  95  |     "标准达标率",
  96  |     "不达标字段数/检查失败数",
  97  |   ]) {
  98  |     await expect(body, `${sourceRef}: 落标检查页应展示「${label}」`).toContainText(label, {
  99  |       timeout: 30000,
  100 |     });
  101 |   }
  102 | }
  103 | 
  104 | // ─── 数据标准列表查询 Shell（t05） ───
  105 | 
  106 | export async function expectDataStandardQueryShell(page: Page, sourceRef: string): Promise<void> {
  107 |   await gotoStandardPage(page, "/standardDefinition");
  108 |   const body = page.locator("body");
  109 |   for (const label of ["数据标准", "标准编号", "标准名称", "标准状态", "新建标准"]) {
> 110 |     await expect(body, `${sourceRef}: 数据标准列表应展示「${label}」`).toContainText(label, {
      |                                                             ^ Error: SR-2099-01-STD-002: 数据标准列表应展示「数据标准」
  111 |       timeout: 30000,
  112 |     });
  113 |   }
  114 |   // 搜索框应可见
  115 |   const searchInput = page
  116 |     .locator("input[placeholder*='标准名称'], input[placeholder*='请输入'], input[placeholder*='搜索']")
  117 |     .first();
  118 |   await expect(searchInput, `${sourceRef}: 数据标准列表搜索框应可见`).toBeVisible({ timeout: 15000 });
  119 |   // 空条件查询返回列表或空态
  120 |   await expect(body, `${sourceRef}: 数据标准列表应展示结果或空态`).toContainText(
  121 |     /数据标准|暂无数据|标准名称/,
  122 |     { timeout: 30000 },
  123 |   );
  124 | }
  125 | 
  126 | // ─── 标准基础搜索（词根/码表）Shell（t05） ───
  127 | 
  128 | export async function expectStandardBasisSearchShell(page: Page, sourceRef: string): Promise<void> {
  129 |   // 词根管理
  130 |   await gotoStandardPage(page, "/wordRoot");
  131 |   const body = page.locator("body");
  132 |   await expect(body, `${sourceRef}: 词根管理页应展示词根列表`).toContainText(/词根|词根名称|新建词根/, {
  133 |     timeout: 30000,
  134 |   });
  135 |   const wordRootSearch = page
  136 |     .locator("input[placeholder*='词根'], input[placeholder*='请输入'], input[placeholder*='搜索']")
  137 |     .first();
  138 |   await expect(wordRootSearch, `${sourceRef}: 词根管理搜索框应可见`).toBeVisible({ timeout: 15000 });
  139 | 
  140 |   // 码表管理
  141 |   await gotoStandardPage(page, "/codeTable");
  142 |   await expect(body, `${sourceRef}: 码表管理页应展示码表列表`).toContainText(/码表|代码表|新建码表/, {
  143 |     timeout: 30000,
  144 |   });
  145 |   const codeTableSearch = page
  146 |     .locator("input[placeholder*='码表'], input[placeholder*='请输入'], input[placeholder*='搜索']")
  147 |     .first();
  148 |   await expect(codeTableSearch, `${sourceRef}: 码表管理搜索框应可见`).toBeVisible({ timeout: 15000 });
  149 | }
  150 | 
  151 | // ─── 标准目录 Shell（t14） ───
  152 | 
  153 | export async function expectStandardDirectoryShell(page: Page, sourceRef: string): Promise<void> {
  154 |   await gotoStandardPage(page, "/standardDefinition");
  155 |   const body = page.locator("body");
  156 |   for (const label of ["数据标准", "标准目录", "标准编号", "标准名称"]) {
  157 |     await expect(body, `${sourceRef}: 标准定义页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  158 |   }
  159 |   // 目录树应可见
  160 |   const directoryTree = page.locator(".ant-tree, [class*='tree'], [class*='catalog']").first();
  161 |   await expect(directoryTree, `${sourceRef}: 标准目录树应可见`).toBeVisible({ timeout: 15000 });
  162 | }
  163 | 
  164 | // ─── 标准映射 Shell（t14） ───
  165 | 
  166 | export async function expectStandardMappingShell(page: Page, sourceRef: string): Promise<void> {
  167 |   await gotoStandardPage(page, "/standardMapping");
  168 |   const body = page.locator("body");
  169 |   for (const label of ["标准映射", "数据表名称", "字段名称", "标准名称"]) {
  170 |     await expect(body, `${sourceRef}: 标准映射页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  171 |   }
  172 |   const searchInput = page
  173 |     .locator("input[placeholder*='表名'], input[placeholder*='请输入'], input[placeholder*='搜索']")
  174 |     .first();
  175 |   await expect(searchInput, `${sourceRef}: 标准映射搜索框应可见`).toBeVisible({ timeout: 15000 });
  176 | }
  177 | 
  178 | // ─── 数据标准详情导入导出 Shell（t18 & t41） ───
  179 | 
  180 | export async function expectDataStandardDetailImportExportShell(page: Page, sourceRef: string): Promise<void> {
  181 |   await gotoStandardPage(page, "/standardDefinition");
  182 |   const body = page.locator("body");
  183 |   // 主列表入口
  184 |   for (const label of ["数据标准", "新建标准", "导入标准", "导出标准"]) {
  185 |     await expect(body, `${sourceRef}: 数据标准页应展示「${label}」`).toContainText(label, { timeout: 30000 });
  186 |   }
  187 |   // 打开导入弹窗
  188 |   const importButton = page.getByRole("button", { name: /导入标准|导入/ }).first();
  189 |   const importVisible = await importButton.isVisible({ timeout: 5000 }).catch(() => false);
  190 |   if (importVisible) {
  191 |     await importButton.click();
  192 |     await expect(body, `${sourceRef}: 导入标准弹窗应展示上传入口`).toContainText(/上传|模板/, { timeout: 30000 });
  193 |     const cancelButton = page.getByRole("button", { name: /取消/ }).last();
  194 |     await cancelButton.click().catch(() => {});
  195 |   }
  196 |   // 打开详情（点击第一条标准）
  197 |   const firstStandardRow = page.locator(".ant-table-tbody tr").first();
  198 |   const firstRowVisible = await firstStandardRow.isVisible({ timeout: 10000 }).catch(() => false);
  199 |   if (firstRowVisible) {
  200 |     const nameLink = firstStandardRow.locator("a, .ant-btn-link, [class*='link']").first();
  201 |     const linkVisible = await nameLink.isVisible({ timeout: 3000 }).catch(() => false);
  202 |     if (linkVisible) {
  203 |       await nameLink.click();
  204 |       await expect(body, `${sourceRef}: 标准详情抽屉应展示标准名称与基础信息`).toContainText(
  205 |         /标准名称|标准状态|上线|下线/,
  206 |         { timeout: 30000 },
  207 |       );
  208 |       // 关闭详情
  209 |       const closeButton = page.locator(".ant-drawer-close, [aria-label='Close']").first();
  210 |       await closeButton.click().catch(() => {});
```