# Phase 2：实现

## 1. 建立逐 case 实现计划

- 完整读取选中 executor guide 与 [../references/conventions.md](../references/conventions.md)。
- 对每个 canonical case 列出真实动作、业务断言、前置数据、隔离策略、副作用和必需业务记录。
- 对 UI executor 先探测真实页面、菜单、表单、枚举和可访问名称；对 API/App executor 按 guide 探测真实目标，不猜接口或控件。
- 完成条件：每个目标 case 有独立实现计划，书面用例与真实系统差异已记录并正确分流。

## 2. 先定义失败合同

- 先添加或更新能证明目标行为、边界和错误处理的测试；确认缺实现时测试确实失败。
- 一条 canonical case 对应一个可收集 item；identity 绑定方式和文件布局完全服从选中 guide。
- 不生成自然语言占位实现，不用 skip、预期失败或空断言表示进度。
- 完成条件：红灯对应待实现行为，而不是环境、语法或错误的测试装配。

## 3. 实现真实业务流程

- 只在 `automation/<executor>/` 的已登记 suite 内实现；共享能力先放项目 suite，确有跨 suite 复用再提升。
- 使用真实业务动作和可读回的结果断言；创建记录时使用 executor 提供的隔离身份能力，确保并行安全和可追踪。
- 禁止直接引导认证、另建非受控客户端、mock 被测业务、硬编码环境或绕过 executor 的安全 fixture。
- 完成条件：实现覆盖 YAML 动作与预期，失败不会被吞掉，业务记录与 evidence policy 一致。

## 4. 逐条验证并分类修复

- 运行受影响的离线测试、格式、类型和 executor guide 指定的检查；只通过 `kata automation collect` 验证正式 collection。
- 将失败归类为产品缺陷、实现错误、数据问题、权限问题或环境问题；只修本任务范围内的实现错误。
- 不自动重试，不删除失败产物；环境或产品阻塞保留强断言并如实交付。
- 完成条件：每个 case 有精确 collection 结果或明确失败分类，未出现重复和额外 item。

## 5. 更新 canonical implementation 状态

- 只有真实实现存在、离线门禁通过且正式 collect 精确时，才把对应 implementation 从 planned 改为 active。
- effects 与 business record policy 来自业务语义，不因实现方便机械改写。
- 运行 `kata cases lint --project <project> --feature <feature> --exit-code`，确认 YAML 合同有效。
- 完成条件：代码、collection 与 active 状态三者一致；未实现或未收集成功的 case 保持 planned。

范围可独立且主会话已完成准备时，可按 [../prompts/worker.md](../prompts/worker.md) 委派实现；完成后进入 [deliver.md](deliver.md)。
