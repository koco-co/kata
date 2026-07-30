# Phase 1：准备

## 定位与读取

1. 按用户给的 feature 绝对路径，或相对 `features/` 的完整路径定位 feature；项目级命令不接受名称片段、metadata ID 或 requirement ID。
2. 读 `cases/需求名.yaml`、`requirement-notes.md` 与 `test-points.md`，列出待自动化的用例清单（feature 根下若存在 `prd.md`，是 `kata lanhu fetch --feature-dir` 抓取的原始 PRD，可作补充取证）。如果既没有用例源又没有 requirement-notes，就阻塞流程，告诉用户先用 test-case skill 编写用例。

## 环境预检

3. 运行 `kata env doctor <env>` 校验配置、权限与凭据；cookie 失效时请用户用 `kata env cookie set <env> --stdin` 更换。
4. 用 `kata runs exec <版本目录/需求目录名> --project <project> --type preflight -- kata env run <env> -- <playwright command>` 创建预检 run 并执行；不要手动设置结果目录，也不要创建 `.runs/`。
5. 用真实浏览器（桌面端为真实应用窗口）打开目标环境，确认登录态有效、目标项目与目标数据源可见。预检发现的环境、权限或数据问题要先修复（或报给用户），不带病进入实现阶段。

## 目录规范

6. 用 `kata automation scaffold <featureDir>` 补齐骨架；已有 `automation/` 目录时，先执行 `kata automation normalize <featureDir>` 预览，确认迁移范围后再加 `--apply`。
7. 准备阶段的静态闸门：运行 `kata automation lint <featureDir> --exit-code` 与 `kata automation lint --shared --exit-code`；所有违规必须先修复再继续。

预检通过后进入 [implement.md](implement.md)。
