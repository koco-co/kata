# 编写：需求源 → 用例

## 总原则

写进 yaml 的任何内容，动笔前都必须已有答案；答案只能来自需求源、知识库、源码或用户确认。四者都答不了的内容不进产物——宁可不写，也不留「待确认」。

## Phase 1：取证

- Lanhu/Axure URL：用 `kata lanhu fetch`（参数见 `--help`）抓取设计稿与 PRD 内容；`--feature-dir` 会把原始 PRD 落到 `<featureDir>/prd.md`。目标 feature 目录已有 `prd.md` 时禁止重复跑 `--feature-dir`（会覆盖既有 PRD）；确需重抓时先与用户确认，再落到暂存目录。
- PRD md、截图、功能描述：由用户直接提供，或读取用户给出的路径。
- 用户只发 URL、不带任何文字时：全程不输出计划与进度，直接执行；但 Phase 2、4、5 的澄清提问与确认不受此限，必须照问。过程中唯一对用户可见的输出是最终的产物说明；若被阻塞，则用两行说明缺口（首行写缺什么，次行写需要用户补什么）。

## Phase 2：确认需求身份，定位 feature 目录

先自行推断 workspace 项目，没有候选、或多个候选无法消歧时才问用户。需求名、版本号、模块、客户不知道的就逐个问用户（一次一个、带推荐答案），禁止自己编。确认后执行：

```bash
kata features resolve --project <项目> --module <模块> --description <需求名> \
  --feature-version <vX.Y.Z> [--customer <客户>] --requirement-id <需求ID> [--lanhu-page <pageId>] --json
```

`--requirement-id` 使用页面树或禅道中的真实需求编号，写入 feature 目录第二个 `【】`；`--lanhu-page` 仅保留为来源 pageId，不能替代需求编号。

取返回的 featureDir 作为产物目录。常驻需求（无迭代版本）改传 `--standing`。

## Phase 3：读知识库命中条目

编写任何包含菜单 / 页面 / 表单字段的用例前，必须先读：

```bash
kata knowledge read --project <项目> --module <模块>
```

命令返回命中条目（界面文案、规则语义、踩坑），以这些条目为准；条目不足时按 `--keyword <关键词>` 补查，或用 `kata repos grep/show` 查源码枚举。

## Phase 4：逐个确认疑点，落盘 requirement-notes.md

把需求源与知识库都答不了的疑点逐个向用户确认。规则：

- 一次只问一个问题，每题给出推荐答案；全部疑点清零前不动笔写任何产物。
- 能自己查到的不要问：知识库或 `kata repos grep/show` 源码枚举能命中的直接采用，不占用提问。
- 确认维度至少覆盖：业务条件与前置、边界值、枚举全集、异常流、权限与角色、数据依赖。
- 用例设计原则（P0 占比 1/4 ~ 1/3、枚举逐项覆盖等）按默认值执行，不逐项问；需要偏离默认值时才单独确认。
- 疑点清零后，把确认过的内容整理成 `<featureDir>/requirement-notes.md` 落盘，结构照 [../templates/requirement-notes.md](../templates/requirement-notes.md)，填写示例见 [../examples/requirement-notes.md](../examples/requirement-notes.md)：每条标注来源（需求源 / 知识库 / 源码 / 用户确认），并写明适用的设计原则。requirement-notes.md 记录确认过的需求内容，后续编写与编辑都以它为准。
- 用户中途要求「别问了直接写」：剩余疑点按未确认处理——对应内容不进 yaml，交付时列出。

## Phase 5：对齐测试点，落盘 test-points.md

把 requirement-notes.md 拆成测试点清单交给用户确认，清单要覆盖正常流 / 异常流 / 边界，枚举值逐项覆盖，P0 占比约 1/4 ~ 1/3。用户确认后照 [../templates/test-points.md](../templates/test-points.md) 落盘 `<featureDir>/test-points.md`：确认过的进入覆盖清单（标注依据的 requirement-notes 条目），用户也确认不了的进入未覆盖清单（写清原因）。

## Phase 6：写 cases/需求名.yaml

格式照 [../examples/cases.yaml](../examples/cases.yaml)。文件名就是需求名，不带【vXXX】【客户】【模块】前缀；`meta.feature_id` 按 `{group}/{dirName}` 口径填写（feature 目录相对 `features/` 的两级路径，group 为版本目录或 `_standing`，如 `v6.4.11/【v6411】【岚图汽车】【数据质量】单表校验规则支持枚举值个数统计`）。`meta.case_module_id` 必填，未知写 `""`；默认 `meta.exports: [xmind]`。所有表单项和两个及以上编号项逐行写入 YAML `|-`。只写 requirement-notes.md 有依据、且在 test-points.md 覆盖清单里的内容；未覆盖清单里的点不写进 yaml。尚未实现自动化的用例允许暂不填写 `automation.spec_file`，由 coverage 报告为 `unmapped`；已有映射但脚本尚未实现时报告为 `mapped-not-implemented`，不得伪造通过。

## Phase 7：派生与检查

```bash
kata cases build --feature <featureDir>
kata cases lint --project <项目> --feature <目录名或 metadata.id> --exit-code
```

有报错就改 yaml 重建，直到全部通过。yaml 里出现「待确认」字样时，lint 会直接报 violation。

## Phase 8：交付

按 [../checklists/review.md](../checklists/review.md) 自审后，给出产物路径与覆盖说明：覆盖了哪些测试点；未覆盖的逐条对照 test-points.md 未覆盖清单说明原因。
