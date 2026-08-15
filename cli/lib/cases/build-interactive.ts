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

/** 子需求轮询结果：每个需求的禅道模块 ID（空表示保持现状）。 */
export interface RequirementModuleChoice {
  requirementId: string;
  moduleId: string;
  changedFrom?: string;
}

/** 多个子需求共用一个模块 ID 时的统一回填入口。 */
export async function resolveRequirementModuleIds(
  requirements: { requirement_id: string; title: string; module_id?: string }[],
  fallbackModuleId: string,
): Promise<RequirementModuleChoice[] | null> {
  console.log("子需求禅道模块 ID 轮询：");
  requirements.forEach((requirement, index) => {
    const current = requirement.module_id?.trim() ?? fallbackModuleId;
    console.log(
      `  ${index + 1}. ${requirement.title} (#${requirement.requirement_id})${current ? `，当前 ${current}` : ""}`,
    );
  });
  const choices: RequirementModuleChoice[] = [];
  for (const requirement of requirements) {
    const current = requirement.module_id?.trim() ?? fallbackModuleId;
    const input = await text({
      message: `${requirement.title} (#${requirement.requirement_id}) 禅道模块 ID`,
      initialValue: current || undefined,
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
    choices.push({
      requirementId: requirement.requirement_id,
      moduleId: id,
      ...(current && id !== current ? { changedFrom: current } : {}),
    });
  }
  return choices;
}
