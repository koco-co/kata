export interface RepoFrontMatter {
  path: string;
  branch: string;
  commit?: string;
}

export interface FrontMatter {
  [key: string]: string | number | boolean | string[] | RepoFrontMatter[] | undefined;
}

export interface ParsedMarkdown {
  frontMatter: FrontMatter;
  body: string;
}

// 只剥对称引号("..." 或 '...');单边引号原样保留
function unquote(v: string): string {
  if (v.length >= 2) {
    const q = v[0];
    if ((q === '"' || q === "'") && v[v.length - 1] === q) {
      return v.slice(1, -1);
    }
  }
  return v;
}

// 标量解析:被引号包裹的一律保持字符串,不做数字/布尔提升(roundtrip 安全)
function parseScalar(raw: string): string | number | boolean {
  if (unquote(raw) !== raw) return unquote(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return raw;
}

/** Split on top-level commas, ignoring commas inside quotes. */
export function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

// 内联对象:{ path: "x,y", branch: "z" } —— 逗号切分需感知引号
function parseInlineObject(inner: string): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const pair of splitTopLevel(inner)) {
    const ci = pair.indexOf(":");
    if (ci === -1) continue;
    obj[pair.slice(0, ci).trim()] = unquote(pair.slice(ci + 1).trim());
  }
  return obj;
}

// key: 空值先记为空串;后续出现 - 数组项时升级为数组
function ensureArray(fm: FrontMatter, key: string): unknown[] {
  const cur = fm[key];
  if (Array.isArray(cur)) return cur as unknown[];
  const arr: unknown[] = [];
  fm[key] = arr as string[];
  return arr;
}

/** Parse the leading YAML-ish frontmatter block of a Markdown document (archive 专用轻量语法). */
export function parseFrontMatter(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const fm: FrontMatter = {};
  let currentKey: string | null = null;

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // 数组项:- 标量 或 - { 内联对象 }
    if (trimmed.startsWith("- ") && currentKey) {
      const arr = ensureArray(fm, currentKey);
      if (trimmed.startsWith("- {") && trimmed.endsWith("}")) {
        arr.push(parseInlineObject(trimmed.slice(3, -1).trim()));
      } else {
        arr.push(unquote(trimmed.slice(2).trim()));
      }
      continue;
    }

    currentKey = null;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const raw = trimmed.slice(colonIdx + 1).trim();

    if (raw === "") {
      fm[key] = "";
      currentKey = key;
      continue;
    }
    if (raw === "[]") {
      fm[key] = [];
      currentKey = key;
      continue;
    }

    fm[key] = parseScalar(raw);
  }

  return { frontMatter: fm, body };
}
