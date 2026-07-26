# 起草：需求源 → 用例

## 总原则

任何写进 yaml 的内容，动笔前必须已有答案；答案只能来自需求源、知识库、源码或用户确认。四者都没有的内容不进产物——宁可不写，也不留「待确认」。

## Phase 1：取证

- Lanhu/Axure URL：用 `kata lanhu fetch`（参数见 `--help`）抓取设计稿与 PRD 内容。
- PRD md、截图、功能描述：由用户直接提供，或读用户给的路径。
- 用户只发 URL、不带任何文字时：全程不输出计划与进度，直接执行；但 Phase 2、4 的澄清提问不受此限，必须照问。唯一可见的被动输出是最终的产物说明，或被阻塞时的两行缺口说明（首行缺什么，次行需要用户补什么）。

## Phase 2：确认需求身份，定位 feature 目录

先自行推断 workspace 项目，无候选或多候选无法消歧时才问。需求名、版本号、模块、客户不知道就逐个问用户（一次一个、带推荐答案），禁止自己编。然后执行：

```bash
kata features resolve --project <项目> --module <模块> --description <需求名> \
  --feature-version <vX.Y.Z> [--customer <客户>] [--lanhu-page <pageId>] --json
```

取返回的 featureDir。常驻需求（无迭代版本）改传 `--standing`。

## Phase 3：读知识库命中条目

起草任何含菜单 / 页面 / 表单字段的用例前必读：

```bash
kata knowledge read --project <项目> --module <模块>
```

返回命中条目（界面文案、规则语义、踩坑），以它们为准；不足时按 `--keyword <关键词>` 补查，或用 `kata repos grep/show` 查源码枚举。

## Phase 4：逐个确认疑点，落盘 prd.md

把需求源与知识库都答不了的疑点逐个向用户确认。规则：

- 一次只问一个问题，每题给出推荐答案；全部疑点清零前不动笔写任何产物。
- 能自己查到的不问：知识库、`kata repos grep/show` 源码枚举命中的直接采用，不占提问。
- 确认维度至少覆盖：业务条件与前置、边界值、枚举全集、异常流、权限与角色、数据依赖。
- 用例设计原则（P0 占比 1/4 ~ 1/3、枚举逐项覆盖等）按默认值执行，不逐项问；需要偏离默认值时才单独确认。
- 疑点清零后，把确认过的内容整理成 `<featureDir>/prd.md` 落盘，结构照 [../templates/prd.md](../templates/prd.md)，填写示例见 [../examples/prd.md](../examples/prd.md)：每条标注来源（需求源 / 知识库 / 源码 / 用户确认），适用的设计原则也写明。prd.md 记录确认过的需求内容，后续起草与编辑都以它为准。
- 用户中途要求「别问了直接写」：剩余疑点按未确认处理——对应内容不进 yaml，交付时列出。

## Phase 5：对齐测试点，落盘 test-points.md

把 prd.md 拆成测试点清单交给用户确认——正常流 / 异常流 / 边界、枚举值逐项覆盖、P0 占比约 1/4 ~ 1/3。用户确认后照 [../templates/test-points.md](../templates/test-points.md) 落盘 `<featureDir>/test-points.md`：确认过的进覆盖清单（标依据的 prd 条目），用户也确认不了的进未覆盖清单（写清原因）。

## Phase 6：写 cases/需求名.yaml

格式照 [../examples/cases.yaml](../examples/cases.yaml)。文件名就是需求名，不带【vXXX】【客户】【模块】前缀；`meta.feature_id` 写 resolve 返回的 id。只写 prd.md 有依据、且在 test-points.md 覆盖清单里的内容；未覆盖清单里的点不写进 yaml。未实现自动化的正式用例允许暂不填写 `automation.spec_file`，由 coverage 报告为 `unmapped`；已有映射但脚本尚未实现时报告为 `mapped-not-implemented`，不得伪造通过。

## Phase 7：派生与检查

```bash
kata cases build --feature <featureDir>
kata cases lint --project <项目> --feature <目录名或 metadata.id> --exit-code
```

报错就改 yaml 重建，直到全部通过。lint 对 yaml 里的「待确认」字样直接报 violation。

## Phase 8：交付

按 [../checklists/review.md](../checklists/review.md) 自审后，给出产物路径与覆盖说明（覆盖了哪些测试点；未覆盖的逐条对照 test-points.md 未覆盖清单说明原因）。
