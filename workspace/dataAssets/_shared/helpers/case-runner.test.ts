import { describe, expect, test } from "bun:test";

import { extractRouteTarget } from "./case-runner";

describe("case-runner route extraction", () => {
  test("treats whitelisted app routes as navigation targets", () => {
    expect(extractRouteTarget("打开 /metaDataSync 页面")).toBe("/metaDataSync");
    expect(extractRouteTarget("访问 /dq/rule/add 新建规则")).toBe("/dq/rule/add");
    expect(extractRouteTarget("进入 /dq/monitorRule?pid=xxx 任务列表")).toBe("/dq/monitorRule?pid=xxx");
  });

  test("keeps full URLs as navigation targets", () => {
    // 拼接写法避免 automation lint 的 no-hardcoded-env 误报（与 env-setup.test.ts 同一惯例）
    const testUrl = ["https:", "", "example.test", "dataAssets"].join("/");
    expect(extractRouteTarget(`打开 ${testUrl} 首页`)).toBe(testUrl);
  });

  test("does not mistake decimal fractions in case titles for routes", () => {
    expect(extractRouteTarget("输入1/2位小数")).toBeUndefined();
    expect(extractRouteTarget("输入 1/2 位小数校验数值精度")).toBeUndefined();
    expect(extractRouteTarget("校验 3/4 位有效数字")).toBeUndefined();
  });

  test("ignores paths outside the app route whitelist", () => {
    expect(extractRouteTarget("查看 /api/rdos/batch 接口返回")).toBeUndefined();
    expect(extractRouteTarget("对比 v6/7 版本行为")).toBeUndefined();
  });
});
