import { basename, extname } from "node:path";

export const CASE_EXPORT_FORMATS = ["csv", "xlsx", "md", "xmind"] as const;

export type CaseExportFormat = (typeof CASE_EXPORT_FORMATS)[number];

export interface CaseExport {
  /** File name relative to cases/exports/. */
  name: string;
  format: CaseExportFormat;
}

export function isCaseExportFormat(value: string): value is CaseExportFormat {
  return (CASE_EXPORT_FORMATS as readonly string[]).includes(value);
}

/** Parse a safe, explicit artifact file name such as `需求用例.xmind`. */
export function parseCaseExportName(value: string): CaseExport | undefined {
  if (!value || value !== value.trim() || value !== basename(value)) return undefined;
  if (value.includes("\\") || value.startsWith(".")) return undefined;
  if (/[\0\r\n]/.test(value)) return undefined;
  const extension = extname(value);
  const format = extension.slice(1);
  if (!value.slice(0, -extension.length) || !isCaseExportFormat(format)) return undefined;
  return { name: value, format };
}

/**
 * XMind is the sole default derivative. Explicit metadata records exact file
 * names so YAML, not an inferred base name, remains the output authority.
 */
export function caseExports(
  metaExports: readonly string[] | undefined,
  defaultName: string,
): CaseExport[] {
  const values = metaExports ?? [`${defaultName}.xmind`];
  return values.map((value) => {
    const parsed = parseCaseExportName(value);
    if (!parsed) throw new Error(`非法用例派生文件名: ${value}`);
    return parsed;
  });
}
