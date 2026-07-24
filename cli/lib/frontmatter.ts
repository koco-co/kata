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

/** Parse the leading YAML-ish frontmatter block of a Markdown document (archive 专用轻量语法). */
export function parseFrontMatter(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontMatter: {}, body: content };

  const yamlBlock = match[1];
  const body = match[2];
  const fm: FrontMatter = {};
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // 内联对象：- { path: "...", branch: "..." }
    if (trimmed.startsWith("- {") && trimmed.endsWith("}") && currentKey && currentArray) {
      const inner = trimmed.slice(3, -1).trim();
      const obj: Record<string, string> = {};
      for (const pair of inner.split(",")) {
        const ci = pair.indexOf(":");
        if (ci === -1) continue;
        const k = pair.slice(0, ci).trim();
        const v = pair
          .slice(ci + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        obj[k] = v;
      }
      (currentArray as unknown[]).push(obj);
      fm[currentKey] = currentArray;
      continue;
    }

    if (trimmed.startsWith("- ") && currentKey && currentArray) {
      currentArray.push(
        trimmed
          .slice(2)
          .trim()
          .replace(/^["']|["']$/g, ""),
      );
      fm[currentKey] = currentArray;
      continue;
    }

    if (currentArray) currentArray = null;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    if (value === "" || value === "[]") {
      currentKey = key;
      currentArray = [];
      fm[key] = currentArray;
      continue;
    }

    value = value.replace(/^["']|["']$/g, "");
    if (value === "true") fm[key] = true;
    else if (value === "false") fm[key] = false;
    else if (/^\d+$/.test(value)) fm[key] = Number.parseInt(value, 10);
    else fm[key] = value;
    currentKey = key;
    currentArray = null;
  }

  return { frontMatter: fm, body };
}
