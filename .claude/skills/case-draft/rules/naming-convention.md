# Feature 目录命名规范

`workspace/{project}/features/` 下的目录命名格式：`【v{version}】[【{lanhu-prd-id}】][【{customer}】]【{module}】{description}`

## 目录层级

feature 目录位于版本层之下：`workspace/{project}/features/{version}/{feature}/`，
`{version}` 为语义版本目录（如 `v6.4.10`，与 `_shared/_meta/versions.yaml` 枚举一致）。
长期主流程/冒烟用例放 `features/_standing/`；已交付版本由 `kata features archive` 整体移入 `features/_archived/{version}/`。
feature 内只允许 `cases/`（用例产物）、`.process/`（过程与证据产物）、`automation/`（自动化）、`runs/`（运行结果）四区与 `metadata.yaml`、`prd.md`、`inputs/`。

## 字段规则

- `【v{version}】`：版本号，格式为 `v` + 数字（如 `v647`）；对应需求所属产品大版本，由 CLI 引擎归一化，不得手写构建号或分支名。目录段 version 仅决定归类；xmind 根节点展示版本另见 `prd_version`（详见下「版本概念分层」），两者不得互相复用。
- `【{lanhu-prd-id}】`（可选）：蓝湖 PRD 页面 ID，纯数字；通过 CLI 触发蓝湖链接时由引擎自动填入；历史存档目录无此字段时可省略。
- `【{customer}】`（可选）：定制化客户中文全称（如 `东风商用车`、`岚图汽车`、`中电信息`、`袋鼠云`）；标品需求省略此段。
- `【{module}】`：中文模块名（如 `数据质量`、`元数据`、`数据模型`、`通用配置`、`数据安全`、`数据标准`、`数据资产`、`血缘`、`多模态`、`生命周期`）。
- `{description}`：中文短语，简洁描述需求主题；多个并列需求用 `、` 分隔。

## 规则

- 同版本同模块同描述视为同一需求，不得为同一需求创建平行目录。
- 草稿、占位目录使用当前版本号加模块名加描述，不得使用特殊占位符。
- 版本号由 `kata features resolve` 引擎写入；模型不得自行拼接版本号。

## 示例

- `【v647】【13204】【东风商用车】【数据安全】批量创建脱敏规则、批量进行脱敏应用`
- `【v647】【数据质量】规则任务支持编辑分区信息`
- `【v647】【12801】【岚图汽车】【数据质量】Spark任务调参`
- `【v647】【岚图汽车】【数据质量】主流程用例整理`（草稿占位，无 lanhu-prd-id）

## 版本概念分层（勿混用）

同一需求涉及两类「版本」，落在不同出口，取值可能不同，**不得互相复用**：

- **迭代版本**：同源同值，同时决定 ① feature 目录归类（`features/{version}/`，喂 `kata features resolve --feature-version <vX.Y.Z>`，受 `VERSION_DIR_RE` 约束如 `v6.4.11`、CLI 归一化）② xmind 根节点版本段（archive frontmatter `prd_version`，如 `7.0.0`）。两处取自同一 lanhu-prd 迭代版本，不得互相矛盾。缺省 `--feature-version` 会落 `_standing`，版本类需求必须显式传；版本号未知先 `AskUserQuestion` 确认，不得自拼。
- **开发分支 / 客户平台版本**（如 `6.0_浙商证券`、`6.3 岚图定制分支`）：仅作环境信息写入 metadata（`dev_version` / `description`），**不进用例前置条件、不进目录、不进 xmind 根节点**。前置条件除非需求明确写了权限差异，否则连「使用 admin 账号登录系统」也不写。
- **产品线名**（如 `数据资产`）：xmind 根节点产品线段，由 archive frontmatter `product_line` 固定（缺省回退 xmind-gen `--project`）。

## 目录名与机器主键的关系

- 目录名是**人类可读标签**：可用上述中文约定，也可用引擎产出的 slug（`{yyyymm}-{slug}`，如 `2026-04-dq-json-config`）。`kata cases lint` 两种都接受。
- 机器主键是 `metadata.yaml` 的 `id` 字段（始终为 slug，FeatureMetadata@2），供 `INDEX.md` 与跨 feature 引用。中文目录的 `id` 仍是 slug，目录名无需等于它。
- 因此中文目录的 lint 不强制 `目录名 == metadata.id` 或 `目录名 == feature_id`；但 `feature_id` 必须是合法 slug，schema 与枚举校验照常生效。
