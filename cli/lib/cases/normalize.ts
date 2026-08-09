import type { CasesFile } from "./types.ts";

/**
 * Normalize structured case text at the YAML boundary.
 *
 * This deliberately handles only unambiguous structures: existing line breaks,
 * HTML breaks, sequential numbered items, and repeated "- field: value" form
 * bullets. Ordinary prose, versions, SQL, and function syntax are preserved.
 */

const NUMBERED_ITEM_RE = /(?<![\p{L}\p{N}_])(\d{1,3})([.)）、])\s*/gu;
const CONCATENATED_NUMBERED_ITEM_RE = /(\d)([.)）、])\s*/gu;
const FORM_ITEM_RE = /(-\s+(?:(?!-\s+)[^:\n：]){1,40}[:：]\s*)/gu;
const BULLET_ITEM_RE = /-\s+/gu;

interface TextMarker {
  index: number;
  end: number;
  prefix: string;
  number?: number;
}

function splitByMarkers(line: string, markers: TextMarker[]): string[] {
  const output: string[] = [];
  const prefix = line.slice(0, markers[0].index).trim();
  if (prefix) output.push(prefix);
  for (const [index, marker] of markers.entries()) {
    const next = markers[index + 1];
    const content = line.slice(marker.end, next?.index ?? line.length).trim();
    output.push(`${marker.prefix}${content ? ` ${content}` : ""}`.trimEnd());
  }
  return output;
}

function splitNumberedItems(line: string): string[] | undefined {
  const collect = (pattern: RegExp): TextMarker[] =>
    [...line.matchAll(pattern)].map((match) => ({
      index: match.index,
      end: match.index + match[0].length,
      prefix: `${match[1]}${match[2]}`,
      number: Number(match[1]),
    }));
  const hasBoundary = (marker: TextMarker): boolean => {
    const previous = line[marker.index - 1];
    return previous === undefined || /[\s:：]/u.test(previous);
  };
  const beginsItemText = (marker: TextMarker): boolean => {
    const next = line.slice(marker.end).match(/^\s*(.)/u)?.[1];
    return next !== undefined && !/[\d.,，。;；+*/=)\]】]/u.test(next);
  };
  const findSequentialRun = (
    markers: TextMarker[],
    requireOne = false,
  ): TextMarker[] | undefined => {
    const byDelimiter = new Map<string, TextMarker[]>();
    for (const marker of markers.filter(beginsItemText)) {
      const delimiter = marker.prefix.at(-1) ?? "";
      byDelimiter.set(delimiter, [...(byDelimiter.get(delimiter) ?? []), marker]);
    }
    for (const sameDelimiter of byDelimiter.values()) {
      for (let start = 0; start < sameDelimiter.length - 1; start += 1) {
        if (requireOne && sameDelimiter[start].number !== 1) continue;
        const run = [sameDelimiter[start]];
        for (let next = start + 1; next < sameDelimiter.length; next += 1) {
          const candidate = sameDelimiter[next];
          if (candidate.number !== (run.at(-1)?.number ?? 0) + 1) break;
          run.push(candidate);
        }
        if (run.length >= 2) return run;
      }
    }
    return undefined;
  };

  const strict = collect(NUMBERED_ITEM_RE).filter(hasBoundary);
  const strictRun = findSequentialRun(strict);
  if (strictRun) return splitByMarkers(line, strictRun);

  // Historical exports often concatenate the next marker directly after a
  // numeric field value, e.g. "...20260202" + "2) 监控规则". In that shape
  // only the final digit before ")" is the marker. Require a full 1,2,...
  // sequence to keep this fallback away from ordinary SQL/function syntax.
  const concatenated = collect(CONCATENATED_NUMBERED_ITEM_RE);
  const concatenatedRun = findSequentialRun(concatenated, true);
  if (concatenatedRun && hasBoundary(concatenatedRun[0]))
    return splitByMarkers(line, concatenatedRun);
  return undefined;
}

function splitFormItems(line: string): string[] | undefined {
  const markers: TextMarker[] = [];
  for (const match of line.matchAll(FORM_ITEM_RE)) {
    const raw = match[1];
    markers.push({
      index: match.index,
      end: match.index + raw.length,
      prefix: raw.trimEnd(),
    });
  }
  if (markers.length === 1) {
    const prefix = line.slice(0, markers[0].index).trim();
    if (/^\d+[.)）、]/u.test(prefix) || /^-\s+/u.test(prefix) || /[:：]$/u.test(prefix)) {
      return splitByMarkers(line, markers);
    }
  }
  if (markers.length < 2) return undefined;
  return splitByMarkers(line, markers);
}

function splitBulletItems(line: string): string[] | undefined {
  const markers: TextMarker[] = [...line.matchAll(BULLET_ITEM_RE)].map((match) => ({
    index: match.index,
    end: match.index + match[0].length,
    prefix: "-",
  }));
  if (markers.length < 2) return undefined;
  const prefix = line.slice(0, markers[0].index).trim();
  const structuredPrefix =
    prefix.length === 0 || /^\d+[.)）、]/u.test(prefix) || /[:：]$/u.test(prefix);
  if (!structuredPrefix) return undefined;
  const hasFormItem = markers.some((marker, index) => {
    const next = markers[index + 1];
    const item = line.slice(marker.end, next?.index ?? line.length);
    return /^[^:\n：]{1,40}[:：]/u.test(item);
  });
  return hasFormItem ? splitByMarkers(line, markers) : undefined;
}

function normalizeLine(line: string): string[] {
  const numbered = splitNumberedItems(line);
  if (numbered) return numbered;
  const bullets = splitBulletItems(line);
  if (bullets) return bullets;
  const form = splitFormItems(line);
  if (form) return form;
  return [line.replace(/^(\s*\d+[.)）、])\s*/u, "$1 ").trimEnd()];
}

export function normalizeStructuredText(value: string): string {
  let normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\t/g, "  ");
  // A numbered-item split can expose form bullets on the new lines. Iterate to
  // a fixed point so parse -> serialize -> parse is stable.
  for (let pass = 0; pass < 8; pass += 1) {
    const next = normalized.split("\n").flatMap(normalizeLine).join("\n");
    if (next === normalized) return normalized;
    normalized = next;
  }
  return normalized;
}

/** Return a normalized copy so renderers and YAML serialization share one text contract. */
export function normalizeCasesFile(file: CasesFile): CasesFile {
  return {
    meta: { ...file.meta },
    ...(file.requirements
      ? { requirements: file.requirements.map((requirement) => ({ ...requirement })) }
      : {}),
    cases: file.cases.map((item) => ({
      ...item,
      ...(item.precondition ? { precondition: normalizeStructuredText(item.precondition) } : {}),
      steps: item.steps.map((step) => ({
        action: normalizeStructuredText(step.action),
        expected: normalizeStructuredText(step.expected),
      })),
      ...(item.tags ? { tags: [...item.tags] } : {}),
      ...(item.automation
        ? {
            automation: {
              effects: { ...item.automation.effects },
              business_record: { ...item.automation.business_record },
              implementations: item.automation.implementations.map((implementation) => ({
                ...implementation,
              })),
            },
          }
        : {}),
    })),
  };
}
