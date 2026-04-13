import { pinyin } from "pinyin-pro";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FEATURE_ID_RE = /^\d{4}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function isValidFeatureId(s: string): boolean {
  return FEATURE_ID_RE.test(s);
}

export function buildFeatureId(yyyyMm: string, slug: string): string {
  return `${yyyyMm}-${slug}`;
}

export function sanitizeSlug(input: string): string {
  // Remove full CJK bracket blocks 【...】 and [...], then strip remaining bracket chars
  const stripped = input
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[【】[\]()（）]/g, "")
    .trim();
  // Split into Chinese and non-Chinese segments, preserving ASCII
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

  return converted
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
