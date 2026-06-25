// 规则集导入用例的规则包 xlsx 运行时生成（自包含，避免提交二进制 fixture）。
// 表头与两行规则逐字对齐 archive 前置条件「证券基础校验包.xlsx」。
import ExcelJS from "exceljs";

/** Generate the 证券基础校验包 xlsx (2 rules over zszq_ruleset) at the given path. */
export async function generateRulesetXlsx(filePath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("规则包");
  ws.addRow([
    "* 规则名称",
    "规则描述",
    "* 表名",
    "表中文名",
    "字段名",
    "字段中文名",
    "* 校验SQL(请输入不符合规则要求的明细数据查询SQL)",
  ]);
  ws.addRow([
    "完整性校验",
    "证券名称不能为空",
    "zszq_ruleset",
    "证券规则集校验表",
    "security_name",
    "证券名称",
    "SELECT order_id, security_code, security_name FROM zszq_ruleset WHERE security_name IS NULL",
  ]);
  ws.addRow([
    "唯一性校验",
    "证券代码不可重复",
    "zszq_ruleset",
    "证券规则集校验表",
    "security_code",
    "证券代码",
    "SELECT order_id, security_code, security_name FROM zszq_ruleset WHERE security_code IN (SELECT security_code FROM zszq_ruleset GROUP BY security_code HAVING COUNT(1) > 1)",
  ]);
  await wb.xlsx.writeFile(filePath);
}
