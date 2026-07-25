---
name: ui-automation
description: 把 feature 目录里的用例转成在真实环境跑通的 Playwright UI 自动化，或修复已有自动化。触发方式——只发需求功能目录路径或目录名（features/【v...】...，不带文件扩展名），或要求生成、修复、验证 UI 自动化。只写非 UI 用例转 case；只做静态代码扫描转 defect-analyze。
---

# ui-automation

把用例变成在真实环境、真实浏览器里跑通的 Playwright 脚本，并真实运行到通过。

## 环境确认（先于一切探测）

- 用户没给环境名：先 `kata env list`，再一次性问清用哪个环境，默认推荐 `ltqc-local` 并附理由。
- 用户回复「确认」「使用默认」即等于选定 `ltqc-local`，直接进入预检，不再重复询问。
- 无法交互提问时：只输出环境确认文案（各环境的 base_url / 租户 / 项目 / cookie 是否已配置），等用户回复；cookie 内容永不出现在对话里。

## 三阶段

| 阶段 | 文件 | 做什么 |
|---|---|---|
| 1 准备 | [workflows/prepare.md](workflows/prepare.md) | 定位 feature、读用例源、环境预检、建骨架 |
| 2 实现 | [workflows/implement.md](workflows/implement.md) | 核对真实 UI、生成脚本、运行与修复 |
| 3 交付 | [workflows/deliver.md](workflows/deliver.md) | 全量运行、lint、handoff、验收说明 |

## 完成标准（不可协商）

同时满足才算完成：

1. `automation/tests/runners/full.spec.ts` 在目标环境全量通过；
2. 本次 `runs/<run-id>/` 下有 Allure 结果；
3. 被测平台产生了该用例核心流程的业务记录数据（规则、任务等有真实创建）。

只读脚本（纯导航 + 可见性断言）只有在用户明确要求只读覆盖时才算覆盖；否则把用例排除并在 handoff 写清原因，不得声称完成。只跑通 smoke 不算完成。

## 真实性底线

- 业务动作（创建 / 编辑 / 保存 / 删除 / 运行 / 导入）必须走页面操作；未经用户针对具体动作明确授权，不用后端接口替代 UI。
- 不得弱化断言、`try-catch` 吞错、`test.skip` 或 mock 被测业务接口来换取通过。
- 页面事实（菜单、字段、按钮）以真实浏览器探测为准，不拿需求文档描述当 UI 事实；知识库 `sites/<host>/dom-*.md` 可作候选，与探测冲突时以探测为准。
- Cookie 只经 `kata env run <env> -- <command>` 注入；真实值只存 `config/env/<env>.yaml`（权限 0600），不进对话、日志、代码、测试夹具。

## 产物布局

```
<featureDir>/automation/tests/{cases,runners,pages,fixtures,sql}/
<featureDir>/runs/<run-id>/{allure-results,screenshots,logs,handoff.md}
```

骨架用 `kata automation scaffold <featureDir>` 创建，目录违规用 `kata automation normalize` 修复，run 目录用 `kata runs new <feature-id>` 分配。跨 feature 复用的页面对象与 helper 放 `workspace/<project>/_shared/`。
