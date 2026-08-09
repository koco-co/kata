# Executor 合同

## 发现与身份

- 只扫描 `automation/*/executor.toml`；目录名、descriptor `id`、`engine-surface` 组合必须一致。
- `playwright-web-ui`、`appium-app-ui`、`request-api`、`midscene-web-ui`、`midscene-app-ui` 是稳定 ID 示例，不是默认已实现列表。
- 只有 descriptor 校验通过且 `agent.guide` 存在时，executor 才可参与选择。

## Descriptor 职责

| 区域 | 说明 |
|---|---|
| identity | `schema_version`、`id`、`engine`、`surface` |
| runtime | 受控运行时类型、工作目录和固定环境覆盖 |
| commands | `setup`、`doctor`、`collect`、`run` 四个 lifecycle |
| capabilities | executor 的依赖与可交付能力 |
| agent | 必须完整读取的 engine-specific guide |

不要把 descriptor 的底层命令复制进 Skill、回复或 handoff。CLI 负责安全物化命令、环境白名单、manifest 路径和信号转发。

## 选择规则

1. 用户显式指定 executor 时，只接受已发现且 surface 匹配的 ID。
2. 未显式指定时，先使用 canonical active implementation，再使用项目明确默认值。
3. 仍有多个匹配时停止并请求决策；不得按目录顺序或个人偏好猜选。
4. planned implementation 只表示待实现，不得用于正式 run。

## 责任边界

- 控制面读取 canonical YAML、项目和私密环境，生成 immutable execution manifest。
- Executor 只消费 manifest 和受控环境，不扫描 workspace 来猜 case、项目或 secret。
- Engine-specific 文件名、fixture、SDK/API、并发和证据写法只由选中 guide 定义。
- 新增 executor 只新增 descriptor、guide、runtime 与 suite，不改变 prepare → implement → deliver 三阶段合同。
