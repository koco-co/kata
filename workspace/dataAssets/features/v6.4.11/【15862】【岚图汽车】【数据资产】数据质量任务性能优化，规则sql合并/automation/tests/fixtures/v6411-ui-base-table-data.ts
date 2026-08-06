export type V6411BaseTableRow = {
  id: number | null;
  age: number | null;
  stringNum: string;
  name: string | null;
  address: string | null;
  money: string;
  buyDateOffset: number;
  dateDetail: string;
};

export type V6411BaseTableCaseLike = {
  caseNo?: number;
  packageName: string;
  fullTitle?: string;
  title?: string;
};

export type V6411BaseTableProfile =
  | "source-default"
  | "validity-detail-unpass-gt100";

export function baseRowsForV6411Case(testCase: V6411BaseTableCaseLike): V6411BaseTableRow[] {
  const profile = baseTableProfileForV6411Case(testCase);
  if (profile === "validity-detail-unpass-gt100") return validityDetailUnpassRows();
  return sourceDefaultRows();
}

export function baseTableProfileForV6411Case(testCase: V6411BaseTableCaseLike): V6411BaseTableProfile {
  if (testCase.caseNo === 16 || testCase.caseNo === 52) return "validity-detail-unpass-gt100";
  return "source-default";
}

export function sourceDefaultRows(): V6411BaseTableRow[] {
  return [
    row(1, 25, "001", "张三", "北京市朝阳区", "5000.00", -30, "订单已完成"),
    row(2, 30, "002", "李四", "上海市浦东新区", "6800.50", -29, "待发货"),
    row(3, 28, "003", "王五", "广州市天河区", "4200.00", -28, "已取消"),
    row(4, 35, "004", "赵六", "深圳市南山区", "9500.00", -27, "配送中"),
    row(5, 22, "005", "小明", "杭州市西湖区", "3100.00", -26, "已完成"),
    row(6, 29, "006", "小红", "成都市武侯区", "5600.00", -25, "退款中"),
  ];
}

export function validityDetailUnpassRows(): V6411BaseTableRow[] {
  // §52/§60 use the one-time 10,000-row dirty-detail patch. Keep the
  // fixture aligned with that SQL instead of the earlier 120-row donor data:
  // id cycles through 1..99, while age remains 25 and string_num is unique.
  return Array.from({ length: 10_000 }, (_, index) => {
    const sequence = index;
    const seq = String(sequence + 1).padStart(6, "0");
    return row(
      1 + (sequence % 99),
      25,
      String(10_000 + sequence),
      `脏数据${seq}`,
      `明细校验地址${seq}`,
      "9",
      -30 - (sequence % 30),
      `有效性不通过明细${seq}`,
    );
  });
}

function row(
  id: number | null,
  age: number | null,
  stringNum: string,
  name: string | null,
  address: string | null,
  money: string,
  buyDateOffset: number,
  dateDetail: string,
): V6411BaseTableRow {
  return { id, age, stringNum, name, address, money, buyDateOffset, dateDetail };
}
