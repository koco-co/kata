/**
 * plugins/zentao/html-md.ts — 禅道富文本编辑器片段 → 可读 markdown
 *
 * 只覆盖禅道 steps / action.comment 用到的标签集（p/br/img/span/a/li/strong），
 * 不追求通用 readability。剥样式/脚本属性，保留文本与图片引用。
 */

// 反转义最常见的 HTML 实体
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Convert a ZenTao rich-text HTML fragment into readable markdown. */
export function htmlFragmentToMarkdown(html: string): string {
  if (!html) return "";

  let out = html;

  // img → markdown 图片引用（先于剥标签处理，保留 src）
  out = out.replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi, "![]($1)");

  // a → [text](href)
  out = out.replace(/<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // li → "- " 行
  out = out.replace(/<li\b[^>]*>/gi, "- ").replace(/<\/li>/gi, "\n");

  // 块级标签与 <br> → 换行
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|h[1-6]|tr)>/gi, "\n");

  // 剥掉其余所有标签（span/strong/p 起始标签等），保留内部文本
  out = out.replace(/<[^>]+>/g, "");

  // 反转义实体
  out = decodeEntities(out);

  // 规整空白：每行内多余空格折叠，去掉空行，整体 trim
  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return out.trim();
}
