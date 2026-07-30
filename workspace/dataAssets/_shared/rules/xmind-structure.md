# XMind 结构偏好

> 优先级：用户当前指令 > 项目级偏好规则 > 全局偏好规则 > skill 内置规则
> 本文件只描述展示结构；项目根节点名称与禅道模块 ID 统一由
> `config/xmind/projects.yaml` 管理，禁止在项目规则中重复配置。

<artifact_contract>
<xmind_intermediate contract="A">

<title>验证xxx</title>
<priority>P1</priority>
</xmind_intermediate>
<archive_md contract="B">
<display_title>【P1】验证xxx</display_title>
</archive_md>
</artifact_contract>

## Root 节点

- 根据 YAML 所在 workspace 项目读取 `config/xmind/projects.yaml`。
- 固定格式：`{root_name}v{version}迭代用例(#{zentao_module_id})`。
- `dataAssets` 示例：`数据资产v6.4.9迭代用例(#23)`。
- 未配置项目映射时硬错误，不从需求标题回退推断。

## L1 需求节点

- 基础标题来自 YAML `meta.title`。
- `meta.case_module_id` 非空时，在标题末尾追加 `(#case_module_id)`；为空时不追加。
- `meta.requirement_id` 存在时，添加 `(#requirement_id)` 标签；缺失时不臆造。
- XMind 默认只展示 Root 与 L1。Root 保持展开；L1 及其下方所有有子节点的节点均标记为折叠，用户每次展开只看到下一层。

## 层级映射

| XMind 层级 | YAML 来源 | 说明 |
| --- | --- | --- |
| Root | 项目映射 + feature 父级版本目录 | 项目迭代根节点 |
| L1 | `meta.title` + `meta.case_module_id` | 需求名称；标签取 `meta.requirement_id` |
| L2+ | `cases[].tags[]` | 标签有多少级就生成多少级，不设上限 |
| 用例 | `cases[].title` | 标题以「验证」开头，优先级通过 marker 表达 |
| 步骤/预期 | `cases[].steps[]` | action 下挂 expected |

## 换行

- YAML 是唯一中间态；XMind 原样消费 YAML 中的换行。
- `<br>`、CRLF 先规范为 `\n`。
- 表单项使用 `- 字段: 值` 逐行书写。
- 两个及以上编号项使用 `1) ...`、`2) ...` 逐行书写。
- 普通说明、SQL、版本号和函数语法不做启发式拆分。

## 版本格式

版本取 feature 父级目录，使用完整版本号（如 `v6.4.9`），不得缩写成 `v6.4` 来代替已知的三段版本。
