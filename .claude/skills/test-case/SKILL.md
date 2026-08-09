---
name: test-case
description: 编写、更新、导入、同步或标准化 Kata 测试用例。Lanhu/Axure URL、PRD、截图和功能描述等需求源走 create；既有 .yaml、.csv、.xlsx、.md、.xmind 或明确更新诉求走 update。只发 feature 目录且要求 Web UI、App UI 或 API 自动化时转 automation；ZenTao hotfix 回归转 defect-analyze。
---

# Outcome

建立或更新可追溯的需求、测试点和 YAML 用例权威，只通过 `kata cases build` 生成派生格式。

## Routing

- 新需求、PRD、设计稿、截图或功能描述：执行 [workflows/create.md](workflows/create.md)。
- 既有 YAML 或 CSV、XLSX、Markdown、XMind、标题同步、格式标准化：执行 [workflows/update.md](workflows/update.md)。
- 只给 feature 目录并要求生成、修复、运行或验证任何 executor 自动化：转 `automation`。
- ZenTao Bug ID/URL 的 hotfix 回归报告：转 `defect-analyze`；需要正式 YAML 回归用例时返回本 Skill。

## Steps

1. 查明事实
   - 读取需求源、用户指定 feature、已有 `prd/prd.md`、`cases/test-points.md`、`cases/需求名.yaml` 及相关知识和 CLI 状态。
   - 不向用户询问可从需求源、路径、CLI 或已有文件查明的事实。
   - 完成条件：项目和 `<项目>:<版本目录>/<需求目录名>` 唯一，create/update 分支和证据缺口明确。
2. 确认关键决策
   - 只询问需求语义、覆盖取舍、最终发布或不可恢复删除等无法从证据确定且会改变结果的决策。
   - 无业务证据的步骤保持待确认，不把历史用例或当前 UI 猜成需求事实。
   - 完成条件：PRD、测试点、YAML 权威链的变更范围和排除项明确。
3. 执行
   - **写 YAML 前解析客户身份并注入知识与规范**：完整例程见 [references/customer-bootstrap.md](references/customer-bootstrap.md)——识别客户编号（高置信度自行确认 / 低置信度先基于知识库/源码验证给推荐答案再确认），`kata knowledge list/read` 注入公共+客户专属规范与业务知识，无客户文件时按补齐分支先建 `standards/<customer>/` 再写用例。
     - 完成条件：客户身份确定，规范与知识已加载，客户专属文件存在且时效满足需求
   - create/update workflow 按确认范围维护 PRD、测试点和 YAML；派生产物仅由 `kata cases build` 生成。
   - **PRD 需求澄清阶段按 [checklists/clarify.md](checklists/clarify.md) 逐条判定遗漏问题；`asked` 才进入逐问，`skipped`/`self-resolved` 写明理由与自查结论。**
   - **写 YAML 必须严格遵循 [examples/cases.yaml](examples/cases.yaml) 及 [examples/best-practices.md](examples/best-practices.md)。超出两份文件明确范围的禁止自行创建规范，必须给出建议并取得用户确认。** cases.yaml 是用例编写框架，best-practices.md 是各字段值通用填写规范（前置条件分界、表单配置、分区一正一异、明细脏数据、tags 平级模块等强制规则见对应章节）；客户专属表单配置细节从 `kata knowledge read --type standard --customer` 加载，无客户文件时按 [templates/standard-template.md](templates/standard-template.md) 结构先创建再写用例。
   - **用例规范变更分流：收到格式/内容调整诉求时先判公共/专属——高置信度自行处理，低置信度先基于知识库/源码验证并给出推荐答案再向用户确认。公共范改写 skill 文件（须经确认），专属范写 `standards/<customer>/` 知识（须经确认）。**
   - 完成条件：每个测试点可追溯到 PRD，每条用例可追溯到测试点，不得伪造自动化映射或占位脚本。
4. 验证
   - 运行 `kata prd lint`、`kata cases build`、`kata cases lint --exit-code`。
   - 完成条件：机械校验成功，逐项标明已验证、缺业务证据未验证和明确排除项。

## Delivery

- 返回 feature 路径、PRD、测试点、YAML 和实际生成的 exports。
- 逐项说明已验证、缺少业务证据保持不变、以及被明确排除的覆盖。
- 导入原件归档 `cases/imports/`；默认只导出 YAML 同名 `需求名.xmind`，其他格式由 `meta.exports` 声明。

## Guardrails

- 模型不得直接读取 `config/`；机械硬规则通过 `kata cases lint`/`kata cases build` 执行。
- 需求事实不足时不猜菜单、字段、枚举、步骤或预期。
- create 流程在发布确认前不写 `prd/prd.md`。
- YAML 是唯一用例源；不为缺失自动化伪造 `automation.implementations`、executor 状态或占位实现，也不因 executor 类型复制业务用例。
- 环境与业务实例使用语义占位符，不写真实凭据、Cookie 或私密配置。

## References

- create 分支：完整读取 [workflows/create.md](workflows/create.md)。
- update 分支：完整读取 [workflows/update.md](workflows/update.md)。
- 客户身份解析与知识注入例程：[references/customer-bootstrap.md](references/customer-bootstrap.md)。
- 写 YAML：按 [examples/cases.yaml](examples/cases.yaml) 顶部索引按需读取 [examples/best-practices.md](examples/best-practices.md) 对应章节。
- 客户专属表单配置模板：[templates/standard-template.md](templates/standard-template.md)。
- 需求澄清遗漏清单：[checklists/clarify.md](checklists/clarify.md)。
- 交付前自审：[checklists/review.md](checklists/review.md)。
