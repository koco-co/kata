# 基础设施连通性报告：starrocks-sr3x-pw-test-recovery-verified

- 状态：diagnosed
- 项目：dataAssets
- 目标：172.16.113.225

## 基本信息

- 生成时间：2026-08-07T18:40:00+08:00
- 目标：172.16.113.225
- 检查类型：SSH connectivity + StarRocks BE 恢复验证

## 症状

- 平台 StarRocks 任务建临时表报错：default_replication_num=3 大于存活 BE 数量。
- 当时 `SHOW BACKENDS` 存活节点仅 10004、10006，10005 未上线。
- 用户要求登录 172.16.113.225 恢复 StarRocks BE 节点。

## 诊断路径

- 完成 `kata infra inspect` SSH connectivity 检查，SSH 认证成功。
- 登录 172.16.113.225 确认 FE 正常，BE Java/主进程缺失，`be.pid` 为失效 PID 10662。
- 检查 BE 目录、配置、磁盘、内存和日志，确认资源充足且存储路径正常。
- 执行 `/opt/dtstack/StarRocks/BackEnd/bin/start_be.sh --daemon` 启动 BE。
- 通过数据源账号执行 `SHOW BACKENDS` 和原始建表 SQL 复测。

## 证据

- `kata infra inspect sr3x-pw-test --check connectivity` 输出 status=diagnosed。
- 启动前无 `starrocks_be` 进程，启动后 PID 32208 运行正常。
- `SHOW BACKENDS` 显示 10004、10005、10006 三个 Backend 均为 Alive=true。
- 恢复节点 10005 的 IP 为 172.16.113.225，版本 3.2.7-44058fe。
- 与报错相同结构的 `CREATE TABLE` 执行成功，随后 `DROP TABLE` 清理临时验证表。

## 结论

- 事实：StarRocks BE 10005 已恢复并成功注册到 FE。
- 事实：当前 3 个 BE 节点均存活，已满足 default_replication_num=3 的建表条件。
- 事实：原始建表路径复测成功。
- 边界：本次只恢复了 BE 服务，未修改表、数据或副本策略。

## 变更计划与结果

- 已执行远程变更：启动 StarRocks BE 服务，变更范围仅限本节点服务恢复。
- 临时验证表已删除，未保留测试数据。

## 原始路径复测

- 已复测：使用与报错一致的 OLAP 建表 DDL 创建临时表成功。
- 已复测：`SHOW BACKENDS` 三个节点均 Alive=true。
- 平台原任务未由平台界面重新提交，业务端完整运行仍以平台实际执行记录为准。

## 知识回写

- 本次未自动写入知识库。
