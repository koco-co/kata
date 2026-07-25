# 起草：需求源 → 用例

## 总原则

任何写进 yaml 的事实，动笔前必须已有答案；答案只能来自需求源、知识库、源码或用户确认。四者都没有的内容不进产物——宁可不写，也不留「待确认」。

## 步骤

1. **取证**
   - Lanhu/Axure URL：用 `kata lanhu fetch`（参数见 `--help`）抓取设计稿与 PRD 内容。
   - PRD md、截图、功能描述：由用户直接提供，或读用户给的路径。
   - 用户只发 URL、不带任何文字时：全程不播报计划与进度，直接执行；但步骤 2、4 的澄清提问不受此限，必须照问。唯一可见的被动输出是最终的产物说明，或被阻塞时的两行缺口说明（首行缺什么，次行需要用户补什么）。

2. **确认需求身份，定位 feature 目录**：先自行推断 workspace 项目，无候选或多候选无法消歧时才问。需求名、版本号、模块、客户不知道就逐个问用户（一次一个、带推荐答案），不要自己编。然后执行：

   ```bash
   kata features resolve --project <项目> --module <模块> --description <需求名> \
     --feature-version <vX.Y.Z> [--customer <客户>] [--lanhu-page <pageId>] --json
   ```

   取返回的 featureDir。**漏传 `--feature-version` 会落到 `features/_standing/`**；版本类需求必须显式传。

3. **读事实基线**（起草任何含菜单 / 页面 / 表单字段的用例前必读）：
   - 先 `kata knowledge read --project <项目> --module <模块>` 注入命中条目；再按索引读 `workspace/<project>/knowledge/sites/<host>/dom-*.md`：真实菜单名、路由、向导步骤、表单字段文案。
   - 涉及规则语义（规则类型 / 统计函数 / 字段类型约束）再读 `knowledge/modules/<module>.md`。

4. **逐个拷问，落定 `prd.md`**：把需求源与事实基线都答不了的疑点逐个向用户确认。规则：
   - 一次只问一个问题，每题给出推荐答案；全部疑点清零前不动笔写任何产物。
   - 能自己查到的事实不问：知识库、`kata repos grep/show` 源码枚举命中的直接采用，不占提问。
   - 拷问维度至少覆盖：业务条件与前置、边界值、枚举全集、异常流、权限与角色、数据依赖。
   - 用例设计原则（P0 占比 1/4 ~ 1/3、枚举逐项覆盖等）按默认值执行，不逐项问；需要偏离默认值时才单独确认。
   - 疑点清零后，把确认过的需求事实整理成 `<featureDir>/prd.md` 落盘：每条事实标注来源（需求源 / 知识库 / 源码 / 用户确认），适用的设计原则也写明。prd.md 是本需求的事实基线，后续起草与编辑都以它为准。
   - 用户中途要求「别问了直接写」：剩余疑点按未确认处理——对应内容不进 yaml，交付时列出。

5. **对齐测试点**：把 prd.md 拆成测试点清单交给用户确认——正常流 / 异常流 / 边界、枚举值逐项覆盖、P0 占比约 1/4 ~ 1/3。用户确认后再写文件。

6. **写 `cases/需求名.yaml`**：格式照 [../examples/cases.yaml](../examples/cases.yaml)。文件名就是需求名，不带【vXXX】【客户】【模块】前缀；`meta.feature_id` 写 resolve 返回的 id。只写 prd.md 里有依据的内容；用户也确认不了的测试点不写进 yaml，记入交付说明的未覆盖清单。

7. **派生与检查**：

   ```bash
   kata cases build --feature <featureDir>
   kata cases lint --project <项目> --feature <id> --exit-code
   ```

   报错就改 yaml 重建，直到全部通过。lint 对 yaml 里的「待确认」字样直接报 violation。

8. **交付**：按 [../checklists/review.md](../checklists/review.md) 自审后，给出产物路径与覆盖说明（覆盖了哪些测试点、哪些点因用户未确认而未覆盖及原因）。
