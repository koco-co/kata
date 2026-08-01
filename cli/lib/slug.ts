import { createHash } from "node:crypto";
import { pinyin } from "pinyin-pro";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function sanitizeSlug(input: string): string {
  // 去掉全角/半角括号块，再按中英文分段，中文段转拼音
  const stripped = input
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[【】[\]()（）]/g, "")
    .trim();
  const segments: string[] = [];
  let buf = "";
  for (const ch of stripped) {
    if (/[一-鿿]/.test(ch)) {
      if (buf) {
        segments.push(buf);
        buf = "";
      }
      segments.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) segments.push(buf);

  const converted = segments.map((s) => {
    if (/[一-鿿]/.test(s)) {
      return pinyin(s, { toneType: "none", type: "array" }).join(" ");
    }
    return s.toLowerCase();
  });

  const projection = converted
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  // 扩展区汉字/符号在 ASCII 投影后可能整段丢失或过短，失去区分度时回退确定性哈希
  if (projection.length < 2) {
    const hex = createHash("sha256").update(input).digest("hex").slice(0, 8);
    return `slug-${hex}`;
  }
  return projection;
}
