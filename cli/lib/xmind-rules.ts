import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { locateProjectRoot } from "./workspace-locator.ts";

export interface XmindProjectConfig {
  root_name: string;
  zentao_module_id: string;
}

interface XmindProjectsFile {
  projects?: Record<string, unknown>;
}

function projectsPath(root: string): string {
  return join(root, "config", "xmind", "projects.yaml");
}

function validateProjectConfig(project: string, value: unknown): XmindProjectConfig {
  if (!value || typeof value !== "object") {
    throw new Error(`XMind 项目 ${project} 配置必须是对象`);
  }
  const config = value as Record<string, unknown>;
  if (typeof config.root_name !== "string" || !config.root_name.trim()) {
    throw new Error(`XMind 项目 ${project} 缺少 root_name`);
  }
  const moduleId =
    typeof config.zentao_module_id === "number"
      ? String(config.zentao_module_id)
      : config.zentao_module_id;
  if (typeof moduleId !== "string" || !/^\d+$/.test(moduleId)) {
    throw new Error(`XMind 项目 ${project} 的 zentao_module_id 必须是数字字符串`);
  }
  return { root_name: config.root_name.trim(), zentao_module_id: moduleId };
}

/** Load one project's canonical XMind-root mapping. Unknown projects are hard errors. */
export function loadXmindProjectConfig(
  project: string,
  root: string = locateProjectRoot(),
): XmindProjectConfig {
  const path = projectsPath(root);
  if (!existsSync(path)) throw new Error(`XMind 项目映射不存在: ${path}`);
  const parsed = (parse(readFileSync(path, "utf8")) ?? {}) as XmindProjectsFile;
  const value = parsed.projects?.[project];
  if (!value) {
    throw new Error(`未配置 XMind 项目映射: ${project}(${path})`);
  }
  return validateProjectConfig(project, value);
}

/** Build `{root_name}v{version}迭代用例(#{zentao_module_id})`. */
export function buildRootName(version: string | undefined, project: string, root?: string): string {
  if (!version?.trim()) throw new Error(`XMind 根节点缺少版本号: ${project}`);
  const config = loadXmindProjectConfig(project, root);
  const normalized = version.trim().replace(/^v/i, "");
  return `${config.root_name}v${normalized}迭代用例(#${config.zentao_module_id})`;
}
