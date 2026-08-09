# Phase 1：准备

## 1. 锁定 canonical 范围

- 解析唯一 project 与 feature，读取 `cases/需求名.yaml`、相关 PRD、测试点和项目知识。
- 列出目标 case 的 `project_id/feature_id/case_id`、surface、effects、business record policy 与 implementations 状态。
- 区分 active、planned 和未映射 case；不从历史文件或旧实现推断状态。
- 完成条件：目标 case 清单和 canonical identity 唯一，无重复、缺失或隐式扩大范围。

## 2. 发现并选择 executor

- 按 [../references/executor-contract.md](../references/executor-contract.md) 发现已登记 descriptor。
- 优先使用用户显式 executor；否则依据 active implementation、surface 和项目默认值选择。多匹配且无权威默认值时停止并请求决策。
- 完整读取选中 `executor.toml` 及 `agent.guide` 指向的文件；不要把未发现的示例 ID当作已实现能力。
- 完成条件：executor 唯一，descriptor 校验通过，guide 已完整读取，required capabilities 可满足。

## 3. 校验环境与副作用权限

- 使用 `kata env list` 确认环境和凭据配置状态；只通过 `kata env doctor <env>` 做受控检查。
- 不直接读取 `config/private`，不展开、复制或回显 Cookie 和其他 secret。
- 对 `platform_write: true` 的 case 明确核对环境 `allowWrite`；只读 case 不借写权限创建数据。
- 完成条件：目标环境唯一，凭据状态可用，所有写入 case 已获受控权限；否则记录环境或权限阻塞。

## 4. 准备 executor 与预检收集

- 只有缺少 executor 依赖时运行 `kata automation setup --executor <id>`；随后运行 `kata automation doctor --executor <id>`。
- 对已有 active 实现运行 `kata automation collect <feature> --project <project> --executor <id>`，核对收集 identity 与目标清单完全一致。
- 对本次要实现的 planned case，把精确 collect 延后到实现完成并切换 active 后；不得为通过预检提前伪造 active。
- 完成条件：executor 可用；已有 active 范围精确收集，planned 范围有明确实现计划和后续 collect 闸门。

完成全部条件后：需要实现时进入 [implement.md](implement.md)，只需运行已有 active 实现时进入 [deliver.md](deliver.md)。
