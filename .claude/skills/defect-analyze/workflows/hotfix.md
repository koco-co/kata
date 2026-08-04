# ZenTao hotfix 回归报告

## Steps

1. 取证
   - 读取 Bug 原文和开发备注，用 `kata knowledge read`、`kata repos grep/show` 及既有用例补查业务语义。
   - 完成条件：用例中的菜单、字段、对象、状态和异常数据均有来源；证据不全时停在取证并列出缺口。

2. 起草证据
   - 按 [../examples/hotfix-case.md](../examples/hotfix-case.md) 的正例填写 [../templates/hotfix-evidence.json](../templates/hotfix-evidence.json)。
   - 前置条件必须描述具体业务状态；每一步都有可观察预期，多个表单项或结果在同一单元格用 `<br>` 换行。
   - 完成条件：证据文件包含 ZenTao、知识和源码、既有用例或 UI 证据，所有步骤和预期可执行。

3. 生成报告

   ```bash
   kata defects hotfix --bug-id <id> --project <项目> \
     --yyyymm <yyyymm> --slug <slug> --evidence-file <evidence.json>
   ```

   `--bug-id` 与 `--url`（Bug 页面 URL，从中提取 ID）可二选一；同时省略时命令报错。

   生成器使用 [../templates/hotfix-case.md](../templates/hotfix-case.md) 固定 frontmatter 与表格格式。

   完成条件：只生成 Markdown hotfix 报告，不生成 YAML、XMind 或 exports。

4. 验收
   - 运行 `kata defects lint --report <report.md> --exit-code`。
   - 完成条件：报告标题、前置条件、步骤与预期均与证据一致。
