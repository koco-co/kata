import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { runCasesSplitImport } from "../../cli/commands/cases-import.ts";
import { importCases, splitXmindCases } from "../../cli/lib/cases/importers.ts";
import { renderMarkdown } from "../../cli/lib/cases/render-md.ts";
import { renderXlsx } from "../../cli/lib/cases/render-xlsx.ts";
import { renderXmindBuffer } from "../../cli/lib/cases/render-xmind.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

const FEATURE = join(
  process.cwd(),
  "workspace/dataAssets/features/v7.0.0/【v700】【岚图汽车】数据资产集成用例",
);

function tempFile(name: string, content: string | Buffer): string {
  const dir = mkdtempSync(join(tmpdir(), "kata-import-test-"));
  const path = join(dir, name);
  writeFileSync(path, content);
  return path;
}

describe("case format imports", () => {
  it("keeps the exact title after 验证 and derives unlimited tags from the prefix", async () => {
    const source = tempFile(
      "history.csv",
      [
        "相关需求,所属模块,用例标题,优先级,步骤,预期",
        "#15862,数据质量(#42),模块A 页面B 第三级 验证「单规则包」校验功能,1,1. 操作一,1. 预期一",
      ].join("\n"),
    );
    const result = await importCases({
      featureDir: FEATURE,
      sourcePath: source,
      name: "history",
      importName: "history.csv",
      requirementId: "15862",
    });
    expect(result.file.cases).toHaveLength(1);
    expect(result.file.cases[0].title).toBe("验证「单规则包」校验功能");
    expect(result.file.cases[0].tags).toEqual(["数据质量", "模块A", "页面B", "第三级"]);
    expect(result.file.cases[0].priority).toBe("P0");
  });

  it("round-trips markdown and xmind through YAML-shaped cases", async () => {
    const sourceFile: CasesFile = {
      meta: {
        title: "需求测试",
        version: "v6.4.9",
        feature_id: "v6.4.9/f",
        case_module_id: "",
      },
      cases: [
        {
          id: "C0001",
          title: "验证「功能」校验功能",
          priority: "P1",
          tags: ["模块", "页面", "分组", "第四级"],
          steps: [{ action: "操作", expected: "预期" }],
        },
      ],
    };
    const md = await importCases({
      featureDir: FEATURE,
      sourcePath: tempFile("history.md", renderMarkdown(sourceFile)),
      name: "history",
      importName: "history.md",
    });
    expect(md.file.cases[0].title).toBe(sourceFile.cases[0].title);
    expect(md.file.cases[0].tags).toEqual(sourceFile.cases[0].tags);

    const xlsx = await importCases({
      featureDir: FEATURE,
      sourcePath: tempFile("history.xlsx", await renderXlsx(sourceFile)),
      name: "history",
      importName: "history.xlsx",
    });
    expect(xlsx.file.cases[0].title).toBe(sourceFile.cases[0].title);
    expect(xlsx.file.cases[0].tags).toEqual(sourceFile.cases[0].tags);

    const xmind = await importCases({
      featureDir: FEATURE,
      sourcePath: tempFile(
        "history.xmind",
        await renderXmindBuffer(
          {
            ...sourceFile,
            meta: { ...sourceFile.meta, case_module_id: "" },
          },
          "dataAssets",
        ),
      ),
      name: "需求测试",
      importName: "history.xmind",
    });
    expect(xmind.file.cases[0].title).toBe(sourceFile.cases[0].title);
    expect(xmind.file.cases[0].tags).toEqual(sourceFile.cases[0].tags);
  });

  it("splits each XMind L1 into an exact feature mapping and skips zero-case requirements", async () => {
    const zip = new JSZip();
    zip.file(
      "content.json",
      JSON.stringify([
        {
          rootTopic: {
            title: "离线开发v6.4.5迭代用例(#24)",
            children: {
              attached: [
                {
                  title: "【江南布衣】任务发布支持更新表结构(#10147)",
                  labels: ["(#15375)"],
                  children: {
                    attached: [
                      {
                        title: "任务发布",
                        children: {
                          attached: [
                            {
                              title: "验证更新表结构",
                              markers: [{ markerId: "priority-1" }],
                              children: {
                                attached: [
                                  {
                                    title:
                                      "配置如下: - 数据源: ${DataSourceA} - 数据表: user_profile",
                                    children: { attached: [{ title: "1) 发布成功 2) 表结构更新" }] },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  title: "【建投】创建任务接口优化负载测试",
                  children: {
                    attached: [{ title: "性能测试范围，无测试用例" }],
                  },
                },
              ],
            },
          },
        },
      ]),
    );
    const sourcePath = tempFile("iteration.xmind", Buffer.from(await zip.generateAsync({
      type: "nodebuffer",
    })));
    const result = await splitXmindCases({
      sourcePath,
      project: "batchWorks",
      version: "v6.4.5",
    });
    expect(result.feature_count).toBe(1);
    expect(result.skipped_count).toBe(1);
    expect(result.case_count).toBe(1);
    expect(result.entries[0].target_feature).toBe(
      "v6.4.5/【v645】【江南布衣】【离线开发】任务发布支持更新表结构",
    );
    expect(result.entries[0].requirement_id).toBe("15375");
    expect(result.entries[0].case_module_id).toBe("10147");
    expect(result.entries[0].file?.meta.title).toBe("【江南布衣】任务发布支持更新表结构");
    expect(result.entries[0].file?.cases[0].tags).toEqual(["任务发布"]);
    expect(result.entries[0].file?.cases[0].steps[0]).toEqual({
      action: "配置如下:\n- 数据源: ${DataSourceA}\n- 数据表: user_profile",
      expected: "1) 发布成功\n2) 表结构更新",
    });
    expect(result.entries[1].skipped).toBe("no cases");
    expect(result.entries[1].warnings.join("\n")).toContain("缺少 requirement_id");
  });

  it("preflights the whole split batch and writes nothing when one target conflicts", async () => {
    const zip = new JSZip();
    const caseTopic = (title: string) => ({
      title,
      markers: [{ markerId: "priority-2" }],
      children: {
        attached: [
          {
            title: "执行操作",
            children: { attached: [{ title: "操作成功" }] },
          },
        ],
      },
    });
    zip.file(
      "content.json",
      JSON.stringify([
        {
          rootTopic: {
            title: "离线开发v6.4.5迭代用例(#24)",
            children: {
              attached: [
                {
                  title: "【甲客户】需求甲(#10001)",
                  labels: ["(#20001)"],
                  children: { attached: [caseTopic("验证需求甲")] },
                },
                {
                  title: "【乙客户】需求乙(#10002)",
                  labels: ["(#20002)"],
                  children: { attached: [caseTopic("验证需求乙")] },
                },
              ],
            },
          },
        },
      ]),
    );
    const sourcePath = tempFile(
      "batch.xmind",
      Buffer.from(await zip.generateAsync({ type: "nodebuffer" })),
    );
    const root = mkdtempSync(join(tmpdir(), "kata-split-root-"));
    const featuresDir = join(root, "workspace", "batchWorks", "features");
    const conflict = join(
      featuresDir,
      "v6.4.5",
      "【v645】【甲客户】【离线开发】需求甲",
    );
    mkdirSync(conflict, { recursive: true });
    writeFileSync(join(conflict, "sentinel.txt"), "keep");

    await expect(
      runCasesSplitImport({
        project: "batchWorks",
        version: "v6.4.5",
        from: sourcePath,
        apply: true,
        root,
      }),
    ).rejects.toThrow(/冲突，未写入任何文件/);

    expect(readFileSync(join(conflict, "sentinel.txt"), "utf8")).toBe("keep");
    expect(
      existsSync(
        join(featuresDir, "v6.4.5", "【v645】【乙客户】【离线开发】需求乙"),
      ),
    ).toBe(false);
    expect(readdirSync(featuresDir).filter((name) => name.startsWith(".kata-import-"))).toEqual([]);
  });
});
