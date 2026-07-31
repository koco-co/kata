// lib/knowledge.ts

export interface Frontmatter {
  title: string;
  type: "overview" | "term" | "module" | "pitfall" | "site";
  tags: string[];
  /** 四态:verified | observed | conflicting | deprecated */
  status: "verified" | "observed" | "conflicting" | "deprecated";
  source: string;
  updated: string;
}

export interface ParsedFile {
  frontmatter: Frontmatter | null;
  body: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  if (!raw.startsWith("---\n") && !raw.startsWith("---\r\n")) {
    return { frontmatter: null, body: raw };
  }
  const lines = raw.split("\n");
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { frontmatter: null, body: raw };
  }

  const fmLines = lines.slice(1, endIdx);
  const body = lines.slice(endIdx + 1).join("\n");

  const fm: Partial<Frontmatter> = {};
  for (const line of fmLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "tags") {
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1).trim();
        if (inner === "") {
          fm.tags = [];
        } else {
          fm.tags = inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
        }
      } else {
        fm.tags = [];
      }
    } else if (key === "title") {
      fm.title = value;
    } else if (key === "type") {
      fm.type = value as Frontmatter["type"];
    } else if (key === "status") {
      fm.status = value as Frontmatter["status"];
    } else if (key === "source") {
      fm.source = value;
    } else if (key === "updated") {
      fm.updated = value;
    }
  }

  // Canonical knowledge entries always use the four-state status field.
  if (
    typeof fm.title !== "string" ||
    typeof fm.type !== "string" ||
    !Array.isArray(fm.tags) ||
    !["overview", "term", "module", "pitfall", "site"].includes(fm.type) ||
    !["verified", "observed", "conflicting", "deprecated"].includes(fm.status ?? "") ||
    typeof fm.source !== "string" ||
    typeof fm.updated !== "string"
  ) {
    return { frontmatter: null, body: raw };
  }

  return { frontmatter: fm as Frontmatter, body };
}

export function serializeFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${fm.title}`,
    `type: ${fm.type}`,
    `tags: [${fm.tags.join(", ")}]`,
    `status: ${fm.status}`,
    `source: ${fm.source === "" ? '""' : fm.source}`,
    `updated: ${fm.updated}`,
    "---",
    "",
  ];
  return lines.join("\n");
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ContentTerm {
  term: string;
  zh: string;
  desc: string;
  alias: string;
}

export interface ContentOverview {
  section: string;
  body: string;
  mode: "append" | "replace";
}

export interface ContentModule {
  name: string;
  title: string;
  tags: string[];
  body: string;
  source: string;
}

export interface ContentPitfall extends ContentModule {}

const TERM_FIELDS: (keyof ContentTerm)[] = ["term", "zh", "desc", "alias"];
const OVERVIEW_FIELDS: (keyof ContentOverview)[] = ["section", "body", "mode"];
const MODULE_FIELDS: (keyof ContentModule)[] = ["name", "title", "tags", "body", "source"];

export function parseContentJson<T>(type: string, raw: string): T {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON for type=${type}`);
  }

  let required: string[];
  if (type === "term") required = TERM_FIELDS as string[];
  else if (type === "overview") required = OVERVIEW_FIELDS as string[];
  else if (type === "module" || type === "pitfall") required = MODULE_FIELDS as string[];
  else throw new Error(`Unknown type: ${type}`);

  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Missing required field "${field}" for type=${type}`);
    }
  }

  if (type === "overview") {
    const mode = obj.mode as string;
    if (mode !== "append" && mode !== "replace") {
      throw new Error(`Invalid mode "${mode}" for overview; must be append|replace`);
    }
  }
  if ((type === "module" || type === "pitfall") && !Array.isArray(obj.tags)) {
    throw new Error(`Field "tags" must be an array for type=${type}`);
  }

  return obj as T;
}

export interface IndexEntry {
  name: string;
  title: string;
  tags: string[];
  updated: string;
  status: string;
}

export interface IndexData {
  terms: IndexEntry[];
  modules: IndexEntry[];
  pitfalls: IndexEntry[];
  sites: IndexEntry[];
  overview_updated: string;
  terms_count: number;
}

function renderIndexEntry(subdir: "terms" | "modules" | "pitfalls", entry: IndexEntry): string {
  const tagsStr = entry.tags.length ? ` [tags: ${entry.tags.join(", ")}]` : "";
  return `- [${entry.name}.md](${subdir}/${entry.name}.md) — ${entry.title}${tagsStr} (updated: ${entry.updated}, status: ${entry.status})`;
}

export function renderIndex(project: string, data: IndexData): string {
  const sortedModules = [...data.modules].sort((a, b) => a.name.localeCompare(b.name));
  const sortedPitfalls = [...data.pitfalls].sort((a, b) => a.name.localeCompare(b.name));
  const sortedTerms = [...data.terms].sort((a, b) => a.name.localeCompare(b.name));
  const sortedSites = [...data.sites].sort((a, b) => a.name.localeCompare(b.name));

  const modulesBody = sortedModules.length
    ? sortedModules.map((e) => renderIndexEntry("modules", e)).join("\n")
    : "_（暂无）_";
  const pitfallsBody = sortedPitfalls.length
    ? sortedPitfalls.map((e) => renderIndexEntry("pitfalls", e)).join("\n")
    : "_（暂无）_";
  const sitesBody = sortedSites.length
    ? sortedSites
        .map((e) => {
          const tagsStr = e.tags.length ? ` [tags: ${e.tags.join(", ")}]` : "";
          return `- [${e.name}.md](${e.name}.md) — ${e.title}${tagsStr} (updated: ${e.updated}, status: ${e.status})`;
        })
        .join("\n")
    : "_（暂无）_";
  const termsBody = sortedTerms.length
    ? sortedTerms.map((e) => renderIndexEntry("terms", e)).join("\n")
    : "_（暂无）_";

  const nowIso = new Date().toISOString();

  return `# ${project} Knowledge Index

> 由 kata knowledge index 自动维护，请勿手动编辑。

## Core

- [overview.md](overview.md) — 产品定位 + 主流程（updated: ${data.overview_updated}）

## Terms

${termsBody}

（共 ${data.terms_count} 条）

## Modules

${modulesBody}

## Pitfalls

${pitfallsBody}

## Sites

${sitesBody}

<!-- last-indexed: ${nowIso} -->
`;
}

export function searchPitfalls(
  query: string,
  files: { name: string; tags: string[] }[],
): { name: string; match_by: string[] }[] {
  if (query === "") return [];
  const q = query.toLowerCase();
  const hits = new Map<string, Set<string>>();

  for (const f of files) {
    if (f.name.toLowerCase().includes(q)) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)?.add("filename");
    }
    if (f.tags.some((t) => t.toLowerCase().includes(q))) {
      if (!hits.has(f.name)) hits.set(f.name, new Set());
      hits.get(f.name)?.add("tags");
    }
  }

  return Array.from(hits.entries()).map(([name, by]) => ({
    name,
    match_by: Array.from(by).sort(),
  }));
}

export function autoFixFrontmatter(
  rawContent: string,
  filePath: string,
  today: string,
): { fixed: boolean; content: string } {
  const parsed = parseFrontmatter(rawContent);
  if (parsed.frontmatter !== null) {
    return { fixed: false, content: rawContent };
  }
  // If the file already has a frontmatter block (starts with ---), leave it
  // alone — lint will report the missing fields. Only inject frontmatter when
  // the file has no block at all (phase-0 templates).
  if (rawContent.startsWith("---\n") || rawContent.startsWith("---\r\n")) {
    return { fixed: false, content: rawContent };
  }

  let type: Frontmatter["type"];
  if (filePath.includes("/modules/")) type = "module";
  else if (filePath.includes("/pitfalls/")) type = "pitfall";
  else if (filePath.includes("/sites/")) type = "site";
  else if (filePath.endsWith("overview.md")) type = "overview";
  else if (filePath.endsWith("terms.md")) type = "term";
  else type = "module";

  let title = "";
  const h1Match = rawContent.match(/^#\s+(.+)$/m);
  if (h1Match) {
    title = h1Match[1].trim();
  } else {
    const segments = filePath.split("/");
    title = segments[segments.length - 1].replace(/\.md$/, "");
  }

  // 自动注入的是未经人工确认的占位,标 observed(单次观察)而非 verified;
  // 已有 status: verified 的 frontmatter 可正常解析,不会走到这里被改写。
  const fm: Frontmatter = {
    title,
    type,
    tags: [],
    status: "observed",
    source: "",
    updated: today,
  };

  const content = `${serializeFrontmatter(fm)}\n${rawContent}`;
  return { fixed: true, content };
}
