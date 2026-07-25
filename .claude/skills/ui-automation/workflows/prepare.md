# 阶段 1：准备

## 定位与读取

1. 按用户给的目录路径或名称片段定位 feature 目录：用 `metadata.yaml` / `cases/*.yaml` 标题精确匹配唯一目标，不枚举 `features/` 全量。
2. 读 `cases/需求名.yaml`、`prd.md` 与 `test-points.md`，列出待自动化用例清单。既没有用例源又没有 prd 时：阻塞，告诉用户先用 test-case skill 起草用例。

## 环境预检

3. `kata env doctor <env>` 校验配置、权限、凭据；cookie 失效请用户用 `kata env cookie set <env> --stdin` 轮换。
4. `kata runs new <feature-id> --type preflight` 建预检 run 目录。
5. 用真实浏览器（桌面端为真实应用窗口）打开目标环境，验证登录态、目标项目与目标数据源可见。预检发现的环境 / 权限 / 数据问题先修（或报给用户），不带病进入实现阶段。

## 目录规范

6. `kata automation scaffold <featureDir>` 补齐骨架；已有 `automation/` 时先 `kata automation normalize --apply <featureDir>` 清理违规文件。

预检通过后进入 [implement.md](implement.md)。
