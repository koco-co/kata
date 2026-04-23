import type { Page } from "@playwright/test";
import { enableCompatibleMonitorDatasourceRouting } from "../2026-04-you-xiao-xing-duo-gui-ze/rule-editor-helpers";
import type { JsonRuleScenario } from "../data/test-data";
import { ensureSavedScenarioRuleSet } from "./json-format-suite-helpers";

export async function prepareJsonTaskEnvironment(
  page: Page,
  scenario: JsonRuleScenario,
): Promise<void> {
  await enableCompatibleMonitorDatasourceRouting(page);
  await ensureSavedScenarioRuleSet(page, scenario);
}
