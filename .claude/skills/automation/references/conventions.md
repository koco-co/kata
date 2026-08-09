# 通用实现规范

## Canonical identity

- 使用 `project_id/feature_id/case_id` 作为唯一身份；标题变化不改变 identity。
- 一条 active implementation 必须精确对应一个可收集 item；不允许缺失、重复或额外 item。
- 只有实现和 collection 都成立时才标 active；其他情况保持 planned。

## 结构与复用

- 正式源码只放 `automation/<executor>/`；workspace feature 只保留 canonical YAML。
- 项目能力先放对应 suite；至少存在真实跨 suite 复用需求时才提升共享层。
- 文件布局、命名和公开 fixture 由 executor guide 定义；通用 Skill 不复制 engine-specific 规则。

## 业务覆盖

- 通过真实 UI、App 或 API 动作执行被测行为；后端准备或诊断不能替代目标 surface。
- 断言业务结果、状态、数量或持久化读回；仅页面可见、请求成功或命令 exit 0 不是充分覆盖。
- 书面用例与真实系统冲突时保留证据并转 `test-case`，不静默改弱断言。

## 独立性与并发

- 每个 case 自带前置条件，不依赖执行顺序或其他 case 遗留状态。
- 使用 executor 提供的 runtime identity 生成唯一业务记录；不得自造全局时间戳约定或共享可变页面状态。
- 写入 case 必须受 allowWrite 硬闸保护，并记录可由目标 surface 读回的业务结果。

## 失败纪律

- 禁止 skip、预期失败、自动重试、吞错、mock 被测业务或删除失败证据。
- 产品失败保留强断言；实现失败修代码；数据、权限和环境失败交付阻塞。
- 不把离线测试、静态检查、collection 或单独 exit 0 表述为真实业务通过。

## 安全

- 不读取或记录 secret；不把凭据放入参数、代码、fixture、日志、截图、报告或 trace。
- 不直接创建绕过受控认证、证据路径或 artifact gate 的客户端与上下文。
- 所有正式运行只经稳定 automation lifecycle，产物只写当前 execution/attempt。
