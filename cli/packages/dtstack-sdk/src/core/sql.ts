/**
 * SQL text helpers shared by the direct executor, the platform Batch API and the SDK layer.
 */

/**
 * Split a SQL script into statements on top-level semicolons.
 * Semicolons inside 'single' / "double" / `backtick` quoted text and inside
 * `--` line comments or block comments do not split. Backslash escapes are
 * honored inside quotes (MySQL-style). Empty statements are dropped.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;

  const pushCurrent = (): void => {
    const statement = stripLeadingComments(current);
    if (statement.length > 0) statements.push(statement);
    current = "";
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : "";

    // line comment: keep copying until end of line
    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") {
        current += sql[i];
        i += 1;
      }
      continue;
    }

    // block comment: keep copying until closing marker
    if (ch === "/" && next === "*") {
      current += ch;
      current += next;
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && i + 1 < sql.length && sql[i + 1] === "/")) {
        current += sql[i];
        i += 1;
      }
      if (i < sql.length) {
        current += sql[i];
        current += sql[i + 1];
        i += 2;
      }
      continue;
    }

    // quoted text: copy verbatim, honoring backslash escapes
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < sql.length) {
        const qc = sql[i];
        current += qc;
        i += 1;
        if (qc === "\\" && quote !== "`" && i < sql.length) {
          current += sql[i];
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

/** Drop empty lines and leading `--`/`/* ... *&#47;` comments from a statement. */
function stripLeadingComments(statement: string): string {
  let rest = statement;
  for (;;) {
    const leading = rest.match(/^\s*(?:(--[^\n]*)|(\/\*[\s\S]*?\*\/))/);
    if (!leading) break;
    rest = rest.slice(leading[0].length);
  }
  return rest.trim();
}

export function isAlreadyExistsError(message: string): boolean {
  return /already exists|已存在/i.test(message);
}

export function isMissingObjectError(message: string): boolean {
  return /not exist|does not exist|unknown table|不存在/i.test(message);
}
