# 起草：需求源 → 用例

## 步骤

1. **取证**
   - Lanhu/Axure URL：用 `bun .claude/plugins/lanhu/fetch.ts`（参数见 `--help`）抓取设计稿与 PRD 内容。
   - PRD md、截图、功能描述：由用户直接提供，或读用户给的路径。
   - 用户只发 URL、不带任何文字时：全程不播报计划与进度，直接执行；唯一可见输出是最终的产物说明，或被阻塞时的两行缺口说明（首行缺什么，次行需要用户补什么）。

2. **定位 feature 目录**：先自行推断 workspace 项目，无候选或多候选无法消歧时才问用户。然后执行：

   ```bash
   kata features resolve --project <项目> --module <模块> --description <需求名> \
     --feature-version <vX.Y.Z> [--customer <客户>] [--lanhu-page <pageId>] --json
   ```

   取返回的 featureDir。**漏传 `--feature-version` 会落到 `features/_standing/`**；版本类需求必须显式传，版本号不知道就先问用户，不要自己编。

3. **读事实基线**（起草任何含菜单 / 页面 / 表单字段的用例前必读）：
   - `workspace/<project>/_shared/knowledge/_index.md` → 涉及的 `sites/<host>/dom-*.md`：真实菜单名、路由、向导步骤、表单字段文案。
   - 涉及规则语义（规则类型 / 统计函数 / 字段类型约束）再读 `modules/<module>.md`。

4. **对齐测试点**：把需求拆成测试点清单交给用户确认——正常流 / 异常流 / 边界、枚举值逐项覆盖、P0 占比约 1/4 ~ 1/3。用户确认后再写文件。

5. **写 `cases/需求名.yaml`**：格式照 [../examples/cases.yaml](../examples/cases.yaml)。文件名就是需求名，不带【vXXX】【客户】【模块】前缀；`meta.feature_id` 写 resolve 返回的 id。

6. **派生与检查**：

   ```bash
   kata cases build --feature <featureDir>
   kata cases lint --project <项目> --feature <id> --exit-code
   ```

   报错就改 yaml 重建，直到全部通过。

7. **交付**：按 [../checklists/review.md](../checklists/review.md) 自审后，给出产物路径与覆盖说明（覆盖了哪些测试点、哪些点因缺证据未覆盖）。
