// 把一段含多条语句的 SQL 脚本（建表 fixture 常见）拆成单条语句列表。
// 用于 hive2 方言（HiveServer2 executeStatement 一次只跑一条）；mysql 方言走
// multipleStatements 不需要拆。拆分时跳过单/双/反引号字符串、`--` 行注释
// 与 `/* ... */` 块注释里的 ';'，并支持引号内反斜杠转义。
//
// 本实现与 cli/packages/dtstack-sdk/src/core/sql.ts 保持同构；tests 中有
// 跨实现一致性测试，任何语义变化都必须同时通过两套测试。

/** Split a multi-statement SQL script into individual statements. */
export function splitSqlStatements(script: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;

  const pushCurrent = (): void => {
    const statement = stripLeadingComments(current);
    if (statement.length > 0) statements.push(statement);
    current = "";
  };

  while (i < script.length) {
    const ch = script[i];
    const next = i + 1 < script.length ? script[i + 1] : "";

    if (ch === "-" && next === "-") {
      while (i < script.length && script[i] !== "\n") {
        current += script[i];
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      current += ch;
      current += next;
      i += 2;
      while (
        i < script.length &&
        !(script[i] === "*" && i + 1 < script.length && script[i + 1] === "/")
      ) {
        current += script[i];
        i += 1;
      }
      if (i < script.length) {
        current += script[i];
        current += script[i + 1];
        i += 2;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < script.length) {
        const qc = script[i];
        current += qc;
        i += 1;
        if (qc === "\\" && quote !== "`" && i < script.length) {
          current += script[i];
          i += 1;
          continue;
        }
        if (qc === quote) break;
      }
      continue;
    }

    if (ch === ";") {
      pushCurrent();
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  pushCurrent();
  return statements;
}

/** Drop empty lines and leading `--`/block comments from a statement. */
function stripLeadingComments(statement: string): string {
  let rest = statement;
  for (;;) {
    const leading = rest.match(/^\s*(?:(--[^\n]*)|(\/\*[\s\S]*?\*\/))/);
    if (!leading) break;
    rest = rest.slice(leading[0].length);
  }
  return rest.trim();
}
