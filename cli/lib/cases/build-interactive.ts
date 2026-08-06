import { cancel, isCancel, multiselect, select, text } from "@clack/prompts";
import type { CaseExportFormat } from "./formats.ts";

export interface FeatureSummary {
  project: string;
  version: string;
  title: string;
  caseCount: number;
  exportsLabel: string;
  exportDir: string;
}

export interface ModuleIdChoice {
  id: string;
  persist: boolean;
  changedFrom?: string;
}

const EXPORT_LABELS: Record<CaseExportFormat, string> = {
  xmind: "XMind",
  csv: "CSV",
  xlsx: "XLSX",
  md: "Markdown",
};

export function exportLabels(exports: readonly string[]): string {
  if (exports.length === 0) return "无";
  return exports
    .map((name) => {
      const extension = name.split(".").at(-1)?.toLowerCase();
      return extension ? (EXPORT_LABELS[extension as CaseExportFormat] ?? name) : name;
    })
    .join(", ");
}

export function printFeatureSummary(info: FeatureSummary): void {
  console.log(`项目: ${info.project}`);
  console.log(`版本: ${info.version}`);
  console.log(`需求: ${info.title}`);
  console.log(`数量: ${info.caseCount} 条用例`);
  console.log(`导出: ${info.exportsLabel}`);
  console.log(`路径: ${info.exportDir}`);
}

export async function selectBuildFormats(): Promise<CaseExportFormat[] | null> {
  const selection = await multiselect({
    message: "选择要生成的导出文件",
    options: [
      { value: "xmind", label: "XMind", hint: "cases/exports/*.xmind" },
      { value: "csv", label: "CSV", hint: "ZenTao 导入格式" },
    ],
    required: false,
  });
  if (isCancel(selection)) {
    cancel("已取消");
    return null;
  }
  return selection as CaseExportFormat[];
}

export async function resolveModuleIdInteractively(
  existing: string,
): Promise<ModuleIdChoice | null> {
  const normalized = existing.trim();
  if (normalized) {
    const mode = await select({
      message: "禅道模块 ID",
      options: [
        { value: "existing", label: `使用已存在: ${normalized}` },
        { value: "new", label: "输入新值" },
      ],
    });
    if (isCancel(mode)) {
      cancel("已取消");
      return null;
    }
    if (mode === "existing") {
      return { id: normalized, persist: false };
    }
  }

  const input = await text({
    message: normalized ? "请输入新的禅道模块 ID" : "请输入禅道模块 ID",
    placeholder: "仅数字",
    validate: (value) => {
      const candidate = (value ?? "").trim();
      if (!/^\d+$/.test(candidate)) return "模块 ID 必须为非空数字";
      return undefined;
    },
  });
  if (isCancel(input)) {
    cancel("已取消");
    return null;
  }
  const id = input.trim();
  return {
    id,
    persist: id !== normalized,
    ...(normalized && id !== normalized ? { changedFrom: normalized } : {}),
  };
}
