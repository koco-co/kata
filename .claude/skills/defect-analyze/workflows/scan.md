# 静态缺陷扫描

## Steps

1. 固定扫描范围
   - 分支或仓库输入使用：

     ```bash
     kata scans create --project <项目> --repo <仓库> \
       --base-branch <base> --head-branch <head>
     ```

   - 已有 patch 使用 `--patch <patch>`；不需要 fetch 时加 `--skip-fetch`。
   - 用户只要求审查当前改动时使用当前 Git diff；没有任何范围时再确认分支对，不擅自扩大到全仓库。
   - 完成条件：报告记录精确 diff 来源、base/head 或 patch 路径，扫描文件集合固定。

2. 阅读周边代码
   - 逐文件检查变化及其直接调用方、错误处理、测试和配置契约。
   - 完成条件：每个候选问题都已阅读足够上下文，可区分真实缺陷与刻意行为。

3. 写入发现
   - 使用 [../templates/scan-report.md](../templates/scan-report.md)。
   - 只报告能由 diff 与周边代码证实、且提交者通常愿意修复的问题；每条附紧凑行号和触发条件。
   - 完成条件：发现按严重性排列，无纯风格偏好、无重复项、无缺乏触发路径的猜测。

4. 校验
   - 运行 `kata defects lint --report <report.md> --exit-code`。
   - 完成条件：lint 退出码为 0；回复注明静态扫描未覆盖的运行时或业务验证。
