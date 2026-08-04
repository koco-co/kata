# Bug 根因分析

## Steps

1. 固定输入与实际行为
   - 保留异常堆栈、console 报错或 HTTP 失败原文，记录触发条件和可重复范围。
   - 需要源码时使用 `kata repos grep/show` 定位调用链和错误分支。
   - 完成条件：实际行为、触发输入和至少一条可定位证据明确。

2. 确定预期与根因
   - 从需求、既有用例、源码合同或用户明示中确定预期行为。
   - 将症状与根因分开，沿数据和控制流证明最早出现错误的位置。
   - 完成条件：实际与预期差异明确，根因由日志、堆栈、源码位置或复现结果支撑；证据不足时标记未验证。

3. 写入正式报告
   - 使用 [../templates/bug-report.md](../templates/bug-report.md)，参考 [../examples/bug-report.md](../examples/bug-report.md) 的详细程度。
   - 分开陈述证据、实际行为、预期行为、复现步骤、影响范围、根因和建议。
   - 完成条件：每个结论可追溯，严重程度有事实依据，报告不存在空章节。

4. 校验与可选登记
   - 运行 `kata defects lint --report <report.md> --exit-code`。
   - 只有用户明确要求登记 ZenTao 时，先运行 `kata zentao create --report <report.md> --dry-run` 预览；再次确认后才去掉 `--dry-run`。
   - 完成条件：未获外部写入确认时只交付报告和 dry-run 结果。
