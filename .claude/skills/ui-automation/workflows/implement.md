# Phase 2：实现

## Steps

1. 注入知识并探测真实 UI
   - 运行 `kata knowledge read --project <项目> --module <模块>`；存疑枚举使用 `kata repos grep/show` 查源码。
   - 用真实浏览器逐页探测菜单、表单、按钮和枚举，截图与 DOM 证据存入当前 run。
   - 完成条件：每条用例所需 UI 路径、字段、可选值和前置数据均有真实证据；书面用例差异已记录。

2. 设计逐条实现
   - 为每条用例明确页面动作、业务断言、fixture/SQL 和清理或隔离策略。
   - `automation.spec_file` 指向 `automation/tests/cases/c<四位序号>-<slug>.spec.ts`；runner 只负责编排。
   - 完成条件：每个已映射 case ID 对应唯一脚本计划，没有自然语言占位实现或重复 slug。

3. 实现真实业务流程
   - 每个步骤使用页面动作，断言真实业务结果；导航加可见性不能替代业务覆盖。
   - 会改变平台状态的用例创建唯一记录，并记录名称或 ID；共享环境重建前先清理或隔离历史自动化数据。
   - 完成条件：脚本覆盖 YAML 的动作与预期，产生或验证的业务记录可由 UI、截图和 Allure 追踪。

4. 逐条运行并分类修复

   ```bash
   kata runs exec <版本目录/需求目录名> --project <project> --type selfrun -- \
     kata env run <env> -- bunx playwright test \
     automation/tests/runners/full.spec.ts -g "<用例标题>"
   ```

   - 产品 Bug：保留断言并记录；脚本问题：修选择器、时序或等待；数据问题：修 fixture/SQL；权限或环境问题：交付阻塞。
   - 每个 spec 最多修复并重跑 3 轮；仍失败则标记未完成，不把排除表述为通过。
   - 完成条件：每个用例有通过证据或明确失败类别、最后命令和退出码；没有无限重试或被吞掉的错误。

5. 运行实现闸门
   - 每轮修复后运行 `kata automation lint <featureDir> --exit-code`；修改共享能力时同步运行 shared lint。
   - 用 [../references/conventions.md](../references/conventions.md) 检查页面对象、流程、断言、fixture 和 SQL 归属。
   - 完成条件：feature 与受影响 shared lint 均为零违规，准备进入 full 运行。

用户明确要求并行子代理时，才按 [../prompts/worker.md](../prompts/worker.md) 分配互不重叠的用例；主会话仍负责探测结论、统一规范和最终 full 运行。
