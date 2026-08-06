# 更新：导入、同步与标准化既有用例

## Steps

1. 确认权威源
   - 只编辑 `cases/需求名.yaml`。CSV、XLSX、Markdown、XMind 原件归档到 `cases/imports/` 并先转为 YAML。
   - 读取 `prd/prd.md`、`cases/test-points.md` 和当前 YAML；纯格式修复也需确认不改变业务语义。
   - 完成条件：输入原件已保留，目标 YAML 唯一。

2. 解析客户身份并注入知识与规范（修改 YAML 前必执行）
   - 从需求标题/feature 目录名识别客户编号：
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
     - `kata repos prepare --project <项目> --module <模块> --customer <客户>` 拉取源码；对测试环境做 DOM 探测
     - 按 [../templates/standard-template.md](../templates/standard-template.md) 结构初始化或更新 `standards/<customer>/` 文档
     - 向用户报备（写哪个文件、依据、影响），同意后 `kata knowledge write --type standard --customer <客户>` 落盘
     - 重新加载后再写用例
   - 完成条件：客户身份确定，规范与知识已加载

3. 判定改动层级
   - 纯格式或派生物修复：不改变 PRD、测试点和摘要。
   - 覆盖设计变化：先更新并确认测试点，再更新 YAML 摘要。
   - 需求语义变化：返回 create workflow 的证据刷新、遗漏扫描、逐问确认和 PRD 发布步骤；遗漏扫描须按 [../checklists/clarify.md](../checklists/clarify.md) 重跑 6 条清单判定。
   - 缺少证据的字段、步骤和预期保持原样并在交付时说明。
   - 完成条件：每个待改项归入唯一层级。

4. 修改 YAML 并重建
   - 字段、按钮、Tab、枚举逐字匹配 PRD、知识或源码证据。
   - 格式见 [../examples/cases.yaml](../examples/cases.yaml)，按顶部索引读取 [../examples/best-practices.md](../examples/best-practices.md)；具体表单配置项以加载的 `standards/<customer>/` 文件为准。
   - **逐条结合 PRD、测试点、产品页面和项目知识完成语义级修改，禁止使用脚本、正则或批量文本替换机械改写。**
   ```bash
   kata prd lint --feature <feature-dir> --exit-code
   kata cases build --feature <feature-dir>
   kata cases lint --project <项目> --feature <版本目录/需求目录名> --exit-code
   ```
   - 完成条件：三个命令均成功；每个保持原样的条目有证据缺口说明。
