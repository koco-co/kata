/**
 * cli/integrations/zentao/html-md.ts — 禅道富文本编辑器片段 → 可读 markdown
 *
 * 只覆盖禅道 steps / action.comment 用到的标签集（p/br/img/span/a/li/strong），
 * 不追求通用 readability。剥样式/脚本属性，保留文本与图片引用。
 *
 * 解析是基于 token 的状态机而非逐条正则替换：属性值里允许出现 `>`，
 * 未闭合/嵌套的 <a> 不会吞掉后续文本；正文里的字面 < > 统一转义为
 * HTML 实体，避免 markdown 渲染时把文本当作内联 HTML 吞掉。
 */

// 标签 token：属性段支持引号包裹的值（值内可含 >）；注释直接跳过。
const TOKEN_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;

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

// 字面 < > 转义回实体：markdown 会把 <...> 当内联 HTML 丢弃，正文里的比较符号必须转义
function escapeAngles(s: string): string {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attrValue(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? "";
}

const BLOCK_CLOSE_RE = /^(p|div|h[1-6]|tr)$/;

/** Convert a ZenTao rich-text HTML fragment into readable markdown. */
export function htmlFragmentToMarkdown(html: string): string {
  if (!html) return "";

  let out = "";
  // 未闭合的 <a>：文本先暂存，遇到 </a> 再包成链接；到末尾仍未闭合则只保留文本
  let openLink: { href: string; text: string } | null = null;
  let last = 0;

  const emit = (piece: string): void => {
    if (openLink) openLink.text += piece;
    else out += piece;
  };
  const emitText = (raw: string): void => {
    emit(escapeAngles(decodeEntities(raw)));
  };

  for (const m of html.matchAll(TOKEN_RE)) {
    emitText(html.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] === undefined) continue; // HTML 注释
    const name = m[2].toLowerCase();
    const closing = m[1] === "/";
    const attrs = m[3] ?? "";

    if (name === "img" && !closing) {
      const src = attrValue(attrs, "src");
      if (src) emit(`![](${src})`);
      continue;
    }
    if (name === "a") {
      if (!closing) {
        // 嵌套的 <a> 不合法：上一个按未闭合处理，先吐回已收集文本
        if (openLink) out += openLink.text;
        openLink = { href: attrValue(attrs, "href") ?? "", text: "" };
      } else if (openLink) {
        const { href, text } = openLink;
        openLink = null;
        out += href ? `[${text}](${href})` : text;
      }
      continue;
    }
    if (name === "li") {
      emit(closing ? "\n" : "- ");
      continue;
    }
    if (name === "br") {
      emit("\n");
      continue;
    }
    if (closing && BLOCK_CLOSE_RE.test(name)) {
      emit("\n");
    }
    // 其余标签（span/strong/p 起始等）直接剥掉，保留内部文本
  }
  emitText(html.slice(last));
  if (openLink) out += openLink.text;

  // 规整空白：每行内多余空格折叠，去掉空行，整体 trim
  return out
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}
