---
name: domain-knowledge
description: 查询、记录或维护 Kata 项目的业务知识、规则、术语、页面事实与踩坑记录。用户询问项目特定概念，或要求“记一下规则”“更新模块知识”时使用；纯源码实现问题直接回答，用例、UI 自动化和缺陷任务转对应 Skill。
---

# Outcome

从 `workspace/<project>/knowledge/` 返回有状态、有来源的项目知识，或通过 `kata knowledge` 安全写入可复用的新知识并重建索引。

## Routing

- 查询术语、模块规则、页面事实或踩坑：执行 [workflows/read.md](workflows/read.md)。
- 记录、更新、弃用或标记冲突知识：执行 [workflows/write.md](workflows/write.md)。
- 只问源码实现细节且不涉及项目业务知识：直接查源码回答，不写知识库。
- 要生成用例、UI 自动化或缺陷报告：转对应 Skill，并由其按需调用本 Skill 查询或回写。

## Steps

1. 查明事实
   - 读取用户指定路径、workspace 项目、所选 workflow 和 `kata knowledge` 当前输出。
   - 不向用户询问可以从路径、CLI 或现有知识条目自行查明的事实。
   - 完成条件：项目唯一，且 read 或 write 分支、条目状态和来源均已确定。

2. 确认关键决策
   - 只询问会改变写入项目、知识状态或冲突裁决且无法从环境确定的决策；源码实现细节保持只读回答。
   - 需要用例、UI 自动化或缺陷报告时明确转交对应 Skill。
   - 完成条件：查询或写入范围、状态晋级和冲突处理方式明确。

3. 执行
   - 完整读取所选 workflow，通过 `kata knowledge` 操作，不直接编辑知识文件。
   - 完成条件：查询已返回 CLI 结果，或写入计划已按确认范围执行且没有跨项目扩散。

4. 验证
   - 复读写入文件和索引，检查来源、状态、敏感信息和冲突标记。
   - 完成条件：交付中明确 `observed`、`conflicting`、`deprecated` 与已验证状态，未把待确认内容升级为事实。

## Delivery

- 查询：返回命中的最小相关条目、状态和来源；无命中时明确说明知识库无匹配。
- 写入：返回动作、文件路径、最终状态和索引结果；pending 结果不表述为已写入。
- 其他 Skill 调用时只注入任务相关条目，不加载整个知识库。

## Guardrails

- 每条写入必须有源码、真实界面探测、复测记录或用户明示作为来源。
- 密码、Cookie、Token、session 路径、私密 YAML 正文和未脱敏日志不进入知识库。
- 业务知识与编写规范分开；需求特有事实留在 PRD，不写成跨需求知识。
- 未明确项目时不跨项目写入；没有新知识时不创建或改写文件。

## References

- 查询时完整读取 [workflows/read.md](workflows/read.md)。
- 写入、更新、冲突或弃用时完整读取 [workflows/write.md](workflows/write.md)。
