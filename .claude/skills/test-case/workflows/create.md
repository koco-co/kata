# 创建：需求源到 YAML 用例

## Steps

1. 定位 feature
   - 从需求源核实项目、版本、顶层需求 ID、客户、模块和需求名；只询问无法查证且会改变目录身份的决策。

     ```bash
     kata features resolve --project <项目> --module <模块> --description <需求名> \
       --feature-version <vX.Y.Z> [--customer <客户>] \
       [--requirement-id <顶层需求ID>] --json
     ```

   - 无迭代版本时使用 `--standing`。身份由 `<项目>:<版本目录>/<需求目录名>` 推导，不写 metadata。
   - 完成条件：CLI 返回唯一规范 feature 路径，项目、版本、模块和需求名均有来源。

2. 提取需求证据
   - Lanhu 使用：

     ```bash
     kata prd extract --url <含 docId/versionId/pageId 的完整链接> --feature <featureDir>
     ```

   - 只生成 `prd/evidence/lanhu.json` 与 `prd/assets/`。相同 docId/versionId/pageId 且摘要和图片完整时使用缓存；版本变化或显式 `--force` 才重取。
   - 非 Lanhu 材料也先整理为可追踪证据。提取失败时停止，不从 URL 或截图缺失区域猜需求。
   - 完成条件：原始来源、选中页面、文本摘要和引用图片均可追踪；失败项有精确原因。

3. 注入知识并准备源码
   - 读取已验证知识：

     ```bash
     kata knowledge read --project <项目> --module <模块>
     ```

   - 按真实需求身份准备相关仓库：

     ```bash
     kata repos prepare --project <项目> --module <模块> --customer <客户或标品>
     ```

   - 分支只取 `config/repos/sources.yaml` 的 `branch`；必须显式匹配 modules/customers。准备后用 `kata repos grep/show` 查当前实现、枚举和约束。
   - 完成条件：知识查询结果、每个命中仓库的 branch/commit 及源码证据已记录；无匹配仓库时明确阻断。

4. 扫描遗漏与冲突
   - 第一轮梳理需求明确写出的目标、范围、角色、字段、状态、异常、兼容和验收。
   - 第二轮检查遗漏、来源冲突、权限、边界值、枚举全集、历史数据、失败恢复、并发和依赖影响。
   - Lanhu 表示预期变更，verified 知识表示既有规则，release 源码表示当前实现和技术约束；目标行为冲突时由用户决策。
   - 完成条件：两轮扫描均已记录，所有会改变范围或预期的冲突已转成待决策问题。

5. 逐问确认并记录会话
   - 一次只问一个问题，并给出当前证据、业务影响、风险、推荐答案和用户最终答案。
   - 将知识查询、仓库 branch/commit、遗漏扫描、问题、答案、证据和决策写入 `prd/.process/session.json`；结构见 [../examples/prd-session.json](../examples/prd-session.json)。
   - 完成全部问题后展示决策摘要，单独取得发布确认，再把状态设为 `publish_confirmed`。运行时 Q 编号只留在 `.process`，正式 PRD 使用 `PD-001` 等稳定 ID。
   - 「待确认」等运行时状态只保留在 session，不能进入 PRD、测试点或 YAML。
   - 完成条件：没有未回答的关键问题，第二轮遗漏扫描完成，用户已明确确认发布最终 PRD。

6. 定稿并检查 PRD

   ```bash
   kata prd finalize --feature <featureDir>
   kata prd lint --feature <featureDir> --exit-code
   ```

   - PRD frontmatter 只允许 `source/source_url/requirement_id/evidence_digest`；正文使用稳定 `FR/BR/ER/AC/PD-001` ID，空章节跳过，图片只引用实际存在的 assets。
   - 刷新既有 PRD 时先比较 evidence digest；完成差异分析、补问和发布确认后才原子替换，随后测试点与用例摘要链视为过期。
   - 完成条件：session 为 `publish_confirmed`，PRD lint 退出码为 0，正文无未决词、模型提示或失效图片。

7. 设计并确认测试点
   - 只从最终 PRD 派生测试点，逐项引用 `FR/BR/ER/AC/PD`；与用户确认覆盖范围、优先级和明确不覆盖项。
   - 按 [../templates/test-points.md](../templates/test-points.md) 写 `cases/test-points.md`，frontmatter 的 `prd_digest` 是完整 PRD 的 SHA-256。
   - 完成条件：每个需求 ID 已覆盖或有明确不覆盖理由，用户确认覆盖设计，摘要与当前 PRD 一致。

8. 写 YAML 并构建
   - 格式见 [../examples/cases.yaml](../examples/cases.yaml)。`meta.test_points_digest` 是完整测试点文件的 SHA-256；`source_ref` 引用测试点 ID；`meta.case_module_id` 必填，未知写 `""`；省略 `meta.exports` 时默认生成 YAML 同名 XMind，显式导出须写具体文件名。

     ```bash
     kata cases build --feature <featureDir>
     kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
     ```

   - 修复源 YAML 后重建。纯接口用例写 `automation.executor: api` 且不声明 `spec_file`；Playwright 用例只有存在真实脚本时才声明 `spec_file`，否则由 coverage 报告为 `unmapped`。
   - 完成条件：build 与 lint 均成功，YAML 标题、步骤和预期可执行，exports 与当前 YAML 同步。

9. 完成知识闭环
   - 只将跨需求复用、已确认且有来源的规则写回知识库；需求特有内容留在 PRD。冲突写 `conflicting`，不覆盖旧结论。
   - 写入后运行 `kata knowledge index --project <项目>`。
   - 完成条件：有新知识时索引重建且复读一致；没有新知识时未产生知识文件改动。
