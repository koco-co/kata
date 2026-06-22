# 蓝湖 PRD 导入插件

从蓝湖 URL 自动爬取需求页面内容、截图和设计稿，转化为 PRD Markdown。

## 功能

- 解析蓝湖分享链接并提取页面元数据
- 自动截取 Axure 设计稿和设计说明
- 将需求描述转化为 Markdown 格式
- 支持多页面需求聚合

## 环境配置

在项目根目录 `.env` 文件中配置：

```env
# 蓝湖登录 Cookie（必填）
KATA_LANHU_COOKIE="lanhu_session_id=xxx; path=/; secure"
```

## 获取 KATA_LANHU_COOKIE

1. 使用浏览器访问 https://lanhuapp.com
2. 登录账号
3. 打开浏览器开发者工具 → 应用 → Cookie
4. 复制 `lanhu_session_id` 的完整值
5. 粘贴到 `.env` 文件

## 用法

```bash
# 暂存模式：落到 {base-dir}/{yyyymm}/{需求名}/（不指定 --base-dir 时默认 workspace/{project}/prds）
bun run .claude/plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." --project dataAssets

# Feature 模式：直接写进某个 feature 目录的 inputs/（推荐，由 case-draft 在 features resolve 后调用）
bun run .claude/plugins/lanhu/fetch.ts --url "https://lanhuapp.com/web/#/item/..." \
  --feature-dir "workspace/dataAssets/features/v7.0.0/【v700】…需求名"

# 或通过 kata 命令
生成测试用例 https://lanhuapp.com/web/#/item/...
```

推荐的 case-draft 编排顺序：先取 `derived_version`（fetch 输出 JSON 里按蓝湖标题派生，如 `资产V7.0.0` → `v7.0.0`），用它给 `kata features resolve --feature-version` 定版本目录，再用 `--feature-dir` 把 PRD 抓到该 feature 的 `inputs/` 下。

## 输出格式

Feature 模式（`--feature-dir`）下，产物按 kata feature 约定落盘：

- `prd.md`：组装后的需求文档（YAML front-matter + Markdown 描述 + 截图引用），写在 feature 根目录。
- `inputs/lanhu-snapshots/`：页面元素与整页截图。
- `inputs/reference-docs/`：lanhu-mcp 抽取的 `.txt` 控件/正文参考文件。
- markdown 内的图片引用前缀为 `inputs/lanhu-snapshots/`。

暂存模式（仅 `--base-dir`）下保持旧布局：`{需求名}.md` + `images/` + `tmp/`，便于与 feature 解耦的批量抓取。

输出到 stdout 的 JSON 含 `derived_version` 与每个需求的 `prd_dir`/`prd_path`。
