# 写入与维护项目知识

## Steps

1. 判断是否应写入
   - 只记录可跨需求复用且有来源的术语、模块规则、踩坑或页面事实。
   - 选择状态：`verified` 表示已确认或复测；`observed` 表示单次观察；`conflicting` 表示证据冲突；`deprecated` 表示已失效但保留历史。
   - 完成条件：项目、类型、标题、正文、状态和来源均已确定，内容不含秘密或需求特有事实。

2. 写入独立条目

   ```bash
   kata knowledge write --project <项目> --type <term|module|pitfall|site> \
     --status <verified|observed|conflicting|deprecated> \
     --title <标题> --body <md> --source <来源> [--tags a,b]
   ```

   `observed` 可以按原状态直接记录。若同名内容语义冲突，CLI 返回 pending；若从 `observed` 提升到 `verified`，也必须在确认后加 `--confirmed`。不要绕过 pending 覆盖原文。

   完成条件：CLI 返回实际 `write`、`merge` 或 `replace-confirmed` 动作；返回 pending 时保持文件未变并交付待确认差异。

3. 写入项目概览
   - 仅 `overview` 使用 `--content <json>`，并提供 `--status` 与 `--source`；其确认、dry-run 和冲突选项以 `kata knowledge write --help` 为准。
   - 完成条件：CLI 成功写入概览，状态和来源与本次证据一致，且没有把独立条目参数与 overview 参数混用。

4. 重建并复读

   ```bash
   kata knowledge index --project <项目>
   kata knowledge lint --project <项目> --exit-code
   kata knowledge read --project <项目> --status all --keyword <标题关键词>
   ```

   - 完成条件：复读结果中的正文、状态和来源与本次决策一致。

## Delivery

返回 CLI 动作、文件路径、最终状态和索引结果。语义冲突或状态提升尚未确认时返回 pending，不声称写入完成。
