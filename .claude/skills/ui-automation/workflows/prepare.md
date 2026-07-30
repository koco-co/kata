# Phase 1：准备

## Steps

1. 定位并读取 feature
   - 接受用户给出的绝对 feature 路径，或相对 `features/` 的完整路径；项目级命令不接受名称片段、metadata ID 或 requirement ID。
   - 读取 `cases/需求名.yaml`、`prd/prd.md` 和 `cases/test-points.md`，列出待自动化用例。
   - 完成条件：feature 唯一、YAML 可解析、正式 PRD 和测试点存在；缺失时停止并转 `test-case`。

2. 校验环境
   - 运行 `kata env doctor <env>`；Cookie 失效时让用户通过 `kata env cookie set <env> --stdin` 更新。
   - 完成条件：环境配置、权限、凭据和在线精确解析均通过，任何秘密都未进入输出。

3. 执行真实预检
   - 使用：

     ```bash
     kata runs exec <版本目录/需求目录名> --project <project> --type preflight -- \
       kata env run <env> -- <playwright command>
     ```

   - 在真实浏览器中确认登录态、目标项目和目标数据源可见。
   - 完成条件：预检 run 已分配，浏览器证据证明目标页面可达；环境、权限或数据阻塞已解决或明确交付。

4. 校验目录与静态闸门
   - 使用 `kata automation scaffold <featureDir>` 补齐骨架。已有 automation 时先运行 `kata automation normalize <featureDir>` 预览，确认范围后才加 `--apply`。
   - 运行 `kata automation lint <featureDir> --exit-code` 和 `kata automation lint --shared --project <project> --exit-code`。
   - 完成条件：结构违规为零，预览之外没有文件迁移，现有用户实现未被覆盖。

完成全部条件后进入 [implement.md](implement.md)。
