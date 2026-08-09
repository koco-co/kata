# Phase 3：运行与交付

## 1. 固定本次执行范围

- 再次运行 `kata automation doctor --executor <id>`，确认当前 executor 状态未漂移。
- 运行 `kata automation collect <feature> --project <project> --executor <id>`，核对 immutable manifest 的 case identity、effects 与 business record policy。
- 收集缺失、重复、额外或 manifest 不一致时停止；返回 [implement.md](implement.md) 修复实现或 canonical 状态。
- 完成条件：正式 collection 与目标 active case 精确一致，execution manifest 已落盘且未被修改。

## 2. 执行新的 attempt

- 运行 `kata automation run <feature> --project <project> --executor <id> --env <env>`；需要并发时只使用 lifecycle 暴露的受控参数。
- 每次重跑分配新 attempt，保留之前失败；不直接调用底层 runner，不在 run 中安装或升级依赖。
- attempt 前环境、权限或 preparation 失败时确认没有伪造 attempt，并保留 NOT VERIFIED handoff。
- 完成条件：命令结束，run 产物只写入本次 execution/attempt，退出状态和失败分类可追溯。

## 3. 验证原子证据链

- 按 [../references/evidence-contract.md](../references/evidence-contract.md) 运行 `kata runs verify --project <project-id> --run <logical-run-id> --executor <id> --execution <execution-id>`。
- 核对 collection、preparation、run status、Allure、逐 case evidence 和 required business record 都属于同一 execution 与 attempt。
- verify 未通过时不手工补造或移动文件；按缺失项返回实现、数据、权限或环境修复。
- 完成条件：verify 退出成功，所有 required check 为 PASS；否则整体为 NOT VERIFIED。

## 4. 交付结论

- 读取 logical run 根目录由 CLI 原子更新的 `handoff.md`，并用 [../checklists/review.md](../checklists/review.md) 自审。
- [../templates/handoff.md](../templates/handoff.md) 只说明字段，[../examples/handoff.md](../examples/handoff.md) 只说明详细程度；不得手工替换真实 handoff。
- 回复 executor、logical run、execution、attempt、case 统计、VERIFIED/NOT VERIFIED、handoff 路径和稳定重跑入口。
- 完成条件：回复与 handoff、manifest 和 verify 一致，已验证、未验证和阻塞范围分开陈述。
