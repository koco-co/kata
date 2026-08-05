# 创建：需求源到 YAML 用例

## Steps

1. 定位 feature
   - 从需求源核实项目、版本、顶层需求 ID、客户、模块和需求名。
   ```bash
   kata features resolve --project <项目> --module <模块> --description <需求名> \
     --feature-version <vX.Y.Z> [--customer <客户>] [--requirement-id <顶层需求ID>] --json
   ```
   - 无迭代版本时使用 `--standing`。身份由 `<项目>:<版本目录>/<需求目录名>` 推导。
   - 完成条件：CLI 返回唯一规范 feature 路径，各标识均有来源。

2. 提取需求证据
   - Lanhu 使用：
   ```bash
   kata prd extract --url <含 docId/versionId/pageId 的完整链接> --feature <feature-dir>
   ```
   - 产出 `prd/evidence/lanhu.json` 与 `prd/assets/`。
   - 非 Lanhu 材料也先整理为可追踪证据。提取失败时停止，不从 URL 或截图缺失区域猜需求。
   - 完成条件：原始来源、选中页面、文本摘要和引用图片均可追踪。

3. 解析客户身份并注入知识与规范（写用例前必执行）
   - 从需求标题/VCS 分支/feature 目录名识别客户编号：
     - **高置信度** → 自行确认，不过问用户
     - **低置信度** → 向用户确认，确认前先基于知识库/源码验证给推荐答案
   - 列出可用客户：`kata knowledge list --project <项目>`
   - 注入用例编写规范：
     ```bash
     kata knowledge read --project <项目> --type standard --customer <客户编号>
     ```
   - 注入项目业务知识：
     ```bash
     kata knowledge read --project <项目> --module <模块>
     ```
   - 无客户专属文件或文件落后时，**必须按此分支补齐再写用例**：
     - `customers/<code>.md` 缺环境地址或源码分支 → 向用户索要测试环境地址与源码仓库/分支
     - `kata repos prepare --project <项目> --module <模块> --customer <客户或标品>` 拉取源码；对测试环境做 DOM 探测
     - 按 [../templates/standard-template.md](../templates/standard-template.md) 结构初始化或更新 `standards/<customer>/` 文档
     - 向用户报备（写哪个文件、依据、影响），同意后 `kata knowledge write --type standard --customer <客户>` 落盘
     - 重新加载后再写用例
   - 准备源码（已在上面分支时执行过则跳过）：
     ```bash
     kata repos prepare --project <项目> --module <模块> --customer <客户或标品>
     ```
   - 完成条件：客户身份确定，规范与知识已加载，客户专属文件存在且时效满足需求

4. 扫描遗漏与冲突
   - 第一轮：需求明确写出的目标、范围、角色、字段、状态、异常、兼容和验收。
   - 第二轮：遗漏、来源冲突、权限、边界值、枚举全集、历史数据、失败恢复、并发和依赖影响。
   - Lanhu 表预期变更，verified 知识表既有规则，release 源码表当前实现；目标行为冲突由用户决策。
   - 完成条件：两轮扫描均已记录，所有会改变范围的冲突已转成待决策问题。

5. 逐问确认并记录
   - 一次一个问题，给出当前证据、业务影响、风险、推荐答案和用户最终答案。
   - 将知识、仓库、扫描、问答、证据和决策写入 `prd/.process/session.json`；结构见 [../examples/prd-session.json](../examples/prd-session.json)。
   - 全部问题后展示决策摘要，单独取得发布确认。正式 PRD 使用 `PD-001` 等稳定 ID，「待确认」等状态只保留在 session。
   - 完成条件：无未回答的关键问题，用户已确认发布。

6. 定稿 PRD
   ```bash
   kata prd finalize --feature <feature-dir>
   kata prd lint --feature <feature-dir> --exit-code
   ```
   - frontmatter 只允许 `source/source_url/requirement_id/evidence_digest`；正文使用稳定 `FR/BR/ER/AC/PD` ID，空章节跳过。
   - 刷新既有 PRD 时先比较 evidence digest，完成差异分析后才原子替换。
   - 完成条件：`publish_confirmed`，lint 退出码为 0。

7. 设计测试点
   - 只从最终 PRD 派生，逐项引用 `FR/BR/ER/AC/PD`；按 [../templates/test-points.md](../templates/test-points.md) 写 `cases/test-points.md`。
   - `prd_digest` 为完整 PRD 的 SHA-256；与用户确认覆盖范围、优先级和明确不覆盖项。
   - 完成条件：每个需求 ID 已覆盖或有明确不覆盖理由，摘要与当前 PRD 一致。

8. 写 YAML 并构建
   - 格式见 [../examples/cases.yaml](../examples/cases.yaml)，按顶部索引按需读取 [../examples/best-practices.md](../examples/best-practices.md)。
   - `meta.test_points_digest` 为测试点 SHA-256；`source_ref` 引用测试点 ID；`meta.case_module_id` 必填，未知写 `""`。
   - 模型不得读取 `config/`；机械硬规则由 CLI 执行。
   ```bash
   kata cases build --feature <feature-dir>
   kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
   ```
   - 修复源 YAML 后重建。纯接口用例不纳入功能用例集；Playwright 用例只有存在真实脚本时才声明 `spec_file`，否则由 coverage 报告为 `unmapped`。
   - 完成条件：build 与 lint 均成功。

9. 知识闭环
   - 只将跨需求复用、已确认且有来源的规则写回知识库；需求特有内容留在 PRD。冲突写 `conflicting`。
   - 写入后运行 `kata knowledge index --project <项目>`。
   - 完成条件：有新知识时索引重建且复读一致。
