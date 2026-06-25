// 把一段含多条语句的 SQL 脚本（建表 fixture 常见）拆成单条语句列表。
// 用于 hive2 方言（HiveServer2 executeStatement 一次只跑一条）；mysql 方言走
// multipleStatements 不需要拆。拆分时跳过单/双引号字符串与 `--` 行注释里的 ';'。

/** Split a multi-statement SQL script into individual statements. */
export function splitSqlStatements(script: string): string[] {
  const stmts: string[] = [];
  let cur = "";
  let quote: '"' | "'" | "`" | null = null;
  let lineComment = false;
  for (let i = 0; i < script.length; i++) {
    const ch = script[i];
    const next = script[i + 1];
    if (lineComment) {
      cur += ch;
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    // 进入 `-- ` 行注释（直到行尾）
    if (ch === "-" && next === "-") {
      lineComment = true;
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ";") {
      const trimmed = cur.trim();
      if (trimmed) stmts.push(trimmed);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const tail = cur.trim();
  if (tail) stmts.push(tail);
  // 剥掉每条语句的前导注释/空行（注释夹在语句间时会并进下一条），再去掉空语句
  return stmts.map(stripLeadingComments).filter((s) => s.length > 0);
}

// 去掉一段语句开头的空行与 `--` 注释行，保留语句体内的注释。
function stripLeadingComments(stmt: string): string {
  const lines = stmt.split("\n");
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (t === "" || t.startsWith("--")) i++;
    else break;
  }
  return lines.slice(i).join("\n").trim();
}
