import { describe, expect, test } from "bun:test";
import { isAlreadyExistsError, isMissingObjectError, splitSqlStatements } from "../../src/core/sql";

describe("splitSqlStatements", () => {
  test("splits plain statements and drops empties", () => {
    expect(splitSqlStatements("SELECT 1; SELECT 2;;\n")).toEqual(["SELECT 1", "SELECT 2"]);
  });

  test("ignores semicolons inside single and double quotes", () => {
    expect(splitSqlStatements("INSERT INTO t VALUES ('a;b', \"c;d\"); SELECT 1")).toEqual([
      "INSERT INTO t VALUES ('a;b', \"c;d\")",
      "SELECT 1",
    ]);
  });

  test("ignores semicolons inside backtick identifiers", () => {
    expect(splitSqlStatements("CREATE TABLE `a;b` (id int); SELECT 1")).toEqual([
      "CREATE TABLE `a;b` (id int)",
      "SELECT 1",
    ]);
  });

  test("honors backslash escapes inside quotes", () => {
    expect(splitSqlStatements("INSERT INTO t VALUES ('it\\'s;ok'); SELECT 1")).toEqual([
      "INSERT INTO t VALUES ('it\\'s;ok')",
      "SELECT 1",
    ]);
  });

  test("ignores semicolons inside line comments", () => {
    expect(splitSqlStatements("-- comment; with semicolon\nSELECT 1; SELECT 2")).toEqual([
      "SELECT 1",
      "SELECT 2",
    ]);
  });

  test("ignores semicolons inside block comments", () => {
    expect(splitSqlStatements("/* comment; */ SELECT 1; /* unterminated;")).toEqual([
      "SELECT 1",
      "/* unterminated;",
    ]);
  });

  test("returns empty array for empty input", () => {
    expect(splitSqlStatements("  ; ; ")).toEqual([]);
  });
});

describe("SQL error classifiers", () => {
  test("isAlreadyExistsError matches english and chinese messages", () => {
    expect(isAlreadyExistsError("Table t already exists")).toBe(true);
    expect(isAlreadyExistsError("表已存在")).toBe(true);
    expect(isAlreadyExistsError("syntax error")).toBe(false);
  });

  test("isMissingObjectError matches english and chinese messages", () => {
    expect(isMissingObjectError("Table t does not exist")).toBe(true);
    expect(isMissingObjectError("Unknown table t")).toBe(true);
    expect(isMissingObjectError("表不存在")).toBe(true);
    expect(isMissingObjectError("syntax error")).toBe(false);
  });
});
