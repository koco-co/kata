# hotfix：bug → 单条回归用例

产出聚焦修复路径的一条回归用例，不外延成完整功能用例集；产出必须可直接执行，不是缺陷分析报告。

## 步骤

1. **取证**：

   ```bash
   kata zentao fetch --bug-id <id> --output <hotfixDir>/.temp
   # 或 --url <bug-view URL>
   ```

   从返回 JSON 的 fields / sections / history 定位：修复路径、受影响页面与字段、修复分支、最低修复版本。记录未修复或缺修复范围时，把缺口列给用户，不代用户假设。

2. **建目录**：`workspace/<project>/features/_hotfix/<yyyymm>-<bug_id>-<中文短标题>/`。`yyyymm` 取 bug 解决或打开月份；目录内结构与正式 feature 相同（`cases/` 放用例）。

3. **写 `cases/<目录名>.yaml`**，只含 1 条用例：
   - 标题以 `【<bug_id>】验证…` 开头；priority 按影响面给（一般 P1，阻塞性 P0）。
   - 相邻回归风险点并进同一条用例的步骤或预期，不拆第二条。
   - 数据源名、schema 名写 `${DataSourceA}`、`${SchemaA}`，多组环境递用 B、C；表名可以写具体名，但只要出现具体表名，precondition 必须含同名最简 `CREATE TABLE`。
   - 步骤质量与正式用例一致：表单 / 规则配置项逐条 `-` 列出，多条预期用 `1) 2)` 分行，QA 能逐项执行核对。
   - bug 记录或用户给出的任务角色、数据流方向、任务类型必须保留；任务名可用占位符，不得为方便造数替换成同质任务。
   - `meta.source` 写 ZenTao bug URL；前置条件里写清环境要求（部署版本含修复分支、数据源就绪、账号权限）。
   - 范围未定的疑问直接列在回复里，不外延到无证据的模块、数据源或版本。

4. **派生与检查**：

   ```bash
   kata cases build --feature <hotfixDir>
   kata cases lint --project <项目> --feature <id> --exit-code
   ```

5. **交付**：说明每条页面 / 字段断言的证据来源——来自本次 bug 记录、源码、真实界面探测，还是历史用例；来自历史用例的标注「未验证」。
