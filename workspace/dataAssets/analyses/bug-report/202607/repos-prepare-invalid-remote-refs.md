# Bug 分析报告：非法远端跟踪引用阻断源码仓库更新

- 日期：2026-07-30
- 输入：`kata repos prepare` 执行 `git fetch` 时报告 `fatal: bad object refs/remotes/origin/release_6.2 2.x`
- 严重程度：major

## 结论

本地源码缓存的 `refs/remotes/origin` 下存在名称包含空格的非法 loose refs，而 `repos prepare` 在 fetch 前没有检查和隔离损坏引用，导致整个 release 源码准备流程被 Git 阻断。

## 证据

- 失败日志：`fatal: bad object refs/remotes/origin/release_6.2 2.x`，随后报告远端未发送全部必要对象。
- 本地检查发现 4 个非法引用：`test_5.3 2.x_dev`、`test_6.2 2.x_dev`、`release_6.2 2.x`、`test_7.0 2.x_dev`。
- 原实现直接执行 fetch，未检查 loose refs；修复后在 fetch 前调用隔离函数（`cli/lib/git-source.ts:298`）。
- 隔离函数用 `git check-ref-format` 校验引用，只移动语法非法的 `origin` 引用到 Git 目录的备份区（`cli/lib/git-source.ts:101`）。
- 修复后真实执行 `kata repos prepare --project dataAssets --module 数据标准 --customer 标品` 成功，两个仓库分别更新到配置的 release 分支和确定 commit。

## 实际行为

release 源码准备在第二个匹配仓库执行 fetch 时失败，PRD 工作流无法进入源码查证和需求问答阶段。仓库工作区中的未跟踪 `package.json` 与 `package-lock.json` 不属于错误引用，但如果直接重建仓库会有丢失风险。

## 预期行为

`repos prepare` 应在不修改源码工作区、合法引用和未跟踪文件的前提下，自动隔离语法非法的 `origin` loose refs，保留可恢复备份，然后继续 fetch、checkout 和 fast-forward，并在结果中披露修复记录。

## 复现步骤

1. 在受管源码仓库的 `.git/refs/remotes/origin/` 下放置名称为 `release_6.2 2.x` 的 loose ref。
2. 运行 `kata repos prepare --project dataAssets --module 数据标准 --customer 标品`。
3. 修复前观察到 Git 报告 `bad object` 并退出；修复后该引用被隔离到 `.git/kata-repair/invalid-refs/`，源码准备继续完成。

## 影响范围

任何由 `kata repos prepare` 管理、且 `origin` loose refs 中存在非法名称的源码缓存都会被阻断。合法引用、packed refs、源码文件和工作区未跟踪文件不在本次自动修复范围内。

## 根因

`prepareSourceRepos` 原先只验证配置分支名，随后立即执行 fetch。Git 会扫描本地远端跟踪引用参与协商；非法名称引用即使与目标 release 分支无关，也会使 fetch 失败。原流程缺少 fetch 前的引用完整性检查与可恢复隔离机制。

## 建议

- 保留本次 fetch 前隔离机制及自动化回归测试。
- 返回 `repaired_refs`，让调用方记录被隔离的引用与备份位置。
- 仅自动处理语法非法的 `refs/remotes/origin` loose refs；对象损坏、packed refs 损坏或工作区文件冲突继续显式阻断，避免扩大自动修复范围。
