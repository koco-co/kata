---
title: step fixture 不返回 callback 值
type: pitfall
tags: [pytest, 证据]
status: verified
source: automation/playwright-web-ui/src/playwright_web_ui/pytest_plugin.py 与 evidence.py，kata-pytest-playwright 迁移复核
updated: 2026-08-09
---

# step fixture 不返回 callback 值

## 当前契约

Python executor 的 `step` fixture 返回同步 context manager。进入和退出该上下文只负责记录业务 checkpoint、截图及失败诊断；`StepContext.__enter__` 不返回页面对象或业务对象。

```python
with step(
    action="打开规则表单",
    expected="表单展示",
    target="规则表单",
):
    rule_form = open_rule_form(page)

expect(rule_form).to_be_visible()
```

不得写成 `with step(...) as rule_form`，也不得期待 callback 返回值由证据 fixture 透传。业务对象必须在上下文体内显式赋值，随后继续断言。

## 原因

证据 fixture 与页面 capability 各自单一职责：`step` 只持久化 checkpoint；页面对象由 capability 返回。这样不会把测试控制流绑进 reporter，也能保证 sync Playwright 调用和证据捕获发生在同一线程。
