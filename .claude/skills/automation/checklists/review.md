# Automation 交付自审

## 范围

- [ ] project、feature、executor 和 canonical case identity 唯一。
- [ ] active/planned 与真实实现及 collection 一致。
- [ ] effects 和 business record policy 来自业务语义。

## 实现

- [ ] 已完整读取选中 descriptor 与 guide。
- [ ] 每个 case 独立、可并行、无顺序依赖。
- [ ] 真实业务动作和强断言覆盖 YAML 步骤与预期。
- [ ] 无 skip、自动重试、mock 被测业务、弱断言或 secret。

## 执行

- [ ] 正式 collection 与 manifest 精确一致。
- [ ] 正式 run 只经稳定 CLI lifecycle，并使用新 attempt。
- [ ] 环境、权限、数据、产品和实现失败分类准确。

## 证据与交付

- [ ] collection、preparation、status、Allure、evidence 和 business record 属于同一 execution/attempt。
- [ ] `kata runs verify` 已运行，结论与 `handoff.md` 一致。
- [ ] 回复给出身份、统计、结论、handoff 和稳定重跑入口。
- [ ] 未把离线检查、collect 或单独 exit 0 写成真实业务通过。
