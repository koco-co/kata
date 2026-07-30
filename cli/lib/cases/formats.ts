export const CASE_EXPORT_FORMATS = ["csv", "xlsx", "md", "xmind"] as const;

export type CaseExportFormat = (typeof CASE_EXPORT_FORMATS)[number];

export const DEFAULT_CASE_EXPORTS: readonly CaseExportFormat[] = ["xmind"];

export function isCaseExportFormat(value: string): value is CaseExportFormat {
  return (CASE_EXPORT_FORMATS as readonly string[]).includes(value);
}

/**
 * XMind is the sole default derivative. CSV/XLSX/Markdown are generated only
 * when explicitly declared by YAML metadata.
 */
export function caseExports(metaExports: readonly string[] | undefined): CaseExportFormat[] {
  const values = metaExports ?? DEFAULT_CASE_EXPORTS;
  return values
    .filter(isCaseExportFormat)
    .filter((value, index, all) => all.indexOf(value) === index);
}
