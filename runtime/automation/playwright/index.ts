/**
 * Playwright 共享工具库
 *
 * 跨项目通用的 Ant Design 交互、导航、工具函数。
 * 所有项目的 spec 文件均可 import 此库。
 *
 * @example 从 feature automation 目录（workspace/<project>/features/<version>/<feature>/automation/）起算
 * ```typescript
 * import { selectAntOption, expectAntMessage, navigateViaMenu, uniqueName } from "../../../../../../runtime/automation/playwright";
 * ```
 */

// Ant Design 组件交互 + 导航
export * from "./ant-design";

// Cookie parsing stays generic so the root Playwright config does not depend on a customer project.
export { cookieHeaderToPlaywrightState, type PlaywrightCookieState } from "./cookies";

// 通用工具函数
export { todayStr, uniqueName, waitForUiSettled } from "./utils";
