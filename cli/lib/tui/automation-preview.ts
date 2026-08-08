import { readFileSync } from "node:fs";
import { loadPlaywrightAutomationConfig } from "../../../runtime/automation/config/playwright.ts";
import { findCasesYaml } from "../cases/find.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { effectivePlatformEnvPath, readPlatformEnvConfig } from "../platform-env.ts";
import { locateProjectRoot } from "../workspace-locator.ts";
import { renderTerminalTable } from "./terminal-table.ts";
import type { FeatureRef } from "./types.ts";

export interface AutomationPreview {
  env: string;
  envPath: string;
  featurePath: string;
  caseCount: number;
  automationCount: number;
  summary: readonly (readonly string[])[];
  environmentDetail: string;
  configDetail: string;
  featureDetail: string;
}

function keyValueRows(entries: readonly (readonly string[])[]): string {
  return renderTerminalTable({
    columns: [
      { header: "Key", minWidth: 12, maxWidth: 24 },
      { header: "Value", minWidth: 20, maxWidth: 48 },
    ],
    rows: entries.map(([key, value]) => [key, value]),
  });
}

export function buildAutomationPreview(ref: FeatureRef, env: string): AutomationPreview {
  const envConfig = readPlatformEnvConfig(env);
  const envPath = effectivePlatformEnvPath(env, locateProjectRoot());
  const playwright = loadPlaywrightAutomationConfig();
  const { yamlPath } = findCasesYaml(ref.featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const automationCount = file.cases.filter((item) => item.automation).length;
  const featurePath = `${ref.project}/features/${ref.relativePath}`;
  const strategy = playwright.sortCases ? "同步执行" : "异步执行";
  const effectiveWorkers = playwright.sortCases ? 1 : playwright.workers;
  const datasourceLabels = Object.entries(envConfig.datasources)
    .map(([key, value]) => `${key}=${value.name}`)
    .join(", ");

  const summary: readonly (readonly string[])[] = [
    ["运行环境", env],
    ["自动化配置", "playwright.yaml"],
    ["相关需求", ref.title],
    ["环境路径", envPath],
    ["用例数量", String(file.cases.length)],
    ["自动化用例", String(automationCount)],
  ];

  const environmentDetail = keyValueRows([
    ["路径", envPath],
    ["环境", env],
    ["URL", envConfig.url],
    ["租户", envConfig.guard.expected_tenant],
    ["质量项目", envConfig.projects.quality],
    ...(envConfig.projects.offline ? [["离线项目", envConfig.projects.offline]] : []),
    ["默认数据源", envConfig.defaults.datasource],
    ["数据源", datasourceLabels],
    ["allow_write", envConfig.safety.allow_write ? "true" : "false"],
    ["Cookie", envConfig.auth.cookie ? "已配置" : "未配置"],
  ]);

  const configDetail = keyValueRows([
    ["路径", "config/automation/playwright.yaml"],
    ["浏览器", playwright.browser],
    ["无头模式", "true"],
    ["执行策略", strategy],
    ["并发数量", String(effectiveWorkers)],
    ["sort_cases", String(playwright.sortCases)],
    ["continue_on_failure", String(playwright.continueOnFailure)],
    ["步骤截图", playwright.stepCapture],
    ["结果报告", playwright.allure.enabled ? "allure" : "off"],
    ["用例超时", `${playwright.timeoutMs} ms`],
    ["重试次数", String(playwright.retries)],
  ]);

  const featureDetail = keyValueRows([
    ["路径", featurePath],
    ["需求", ref.title],
    ["版本", ref.version],
    ["模块", ref.module],
    ...(ref.requirementId ? [["需求 ID", ref.requirementId]] : []),
    ...(ref.customer ? [["客户", ref.customer]] : []),
    ["用例数量", String(file.cases.length)],
    ["自动化用例", String(automationCount)],
  ]);

  return {
    env,
    envPath,
    featurePath,
    caseCount: file.cases.length,
    automationCount,
    summary,
    environmentDetail,
    configDetail,
    featureDetail,
  };
}
