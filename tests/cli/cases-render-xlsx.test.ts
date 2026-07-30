import { describe, expect, it } from "bun:test";
import ExcelJS from "exceljs";
import { renderXlsx } from "../../cli/lib/cases/render-xlsx.ts";
import type { CasesFile } from "../../cli/lib/cases/types.ts";

function file(title: string, cases: CasesFile["cases"]): CasesFile {
  return { meta: { title, version: "v1", feature_id: "g/f", case_module_id: "" }, cases };
}

const CASE = { id: "C0001", title: "用例一", priority: "P0" as const, steps: [] };

async function firstSheetName(buf: Uint8Array): Promise<string> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  return wb.worksheets[0].name;
}

describe("renderXlsx", () => {
  it("strips illegal Excel sheet-name characters", async () => {
    const name = await firstSheetName(await renderXlsx(file("a*b?:c/d\\e[f]g", [CASE])));
    expect(name).toBe("abcdefg");
  });

  it("truncates sheet names to 31 characters", async () => {
    const name = await firstSheetName(await renderXlsx(file("长".repeat(40), [CASE])));
    expect(name).toBe("长".repeat(31));
  });

  it("falls back to a default name when nothing legal remains", async () => {
    const name = await firstSheetName(await renderXlsx(file("***", [CASE])));
    expect(name).toBe("cases");
  });

  it("coerces non-string cell values instead of crashing", async () => {
    const buf = await renderXlsx(file("t", [{ ...CASE, id: 123 as unknown as string }]));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
    expect(wb.worksheets[0].getRow(2).getCell(1).value).toBe(123);
  });
});
