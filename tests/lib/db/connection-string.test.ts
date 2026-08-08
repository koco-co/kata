import { describe, expect, it } from "bun:test";
import { splitSqlStatements as sdkSplitSqlStatements } from "../../../cli/packages/dtstack-sdk/src/core/sql.ts";
import {
  DEFAULT_PORT,
  DIALECT_BY_TYPE,
  isSupportedType,
  parseConnectionString,
} from "../../../runtime/automation/db/connection-string.ts";
import { splitSqlStatements } from "../../../runtime/automation/db/sql-split.ts";

describe("parseConnectionString", () => {
  it("parses a password containing '@' and '#' by splitting on the last '@'", () => {
    const p = parseConnectionString("mysql://drpeco:DT@Stack#123@192.0.2.225:19030/pw_test");
    expect(p).toEqual({
      user: "drpeco",
      password: "DT@Stack#123",
      host: "192.0.2.225",
      port: 19030,
      database: "pw_test",
    });
  });

  it("works without a scheme prefix", () => {
    const p = parseConnectionString("u:p@h:3306/db");
    expect(p).toEqual({ user: "u", password: "p", host: "h", port: 3306, database: "db" });
  });

  it("keeps extra ':' in the password (split on first colon only)", () => {
    const p = parseConnectionString("hive://user:pa:ss:word@host:10000/d", "hive");
    expect(p.user).toBe("user");
    expect(p.password).toBe("pa:ss:word");
    expect(p.port).toBe(10000);
  });

  it("falls back to the type default port when the url omits one", () => {
    const sr = parseConnectionString("mysql://u:p@host/db", "starrocks");
    expect(sr.port).toBe(DEFAULT_PORT.starrocks);
    const hv = parseConnectionString("hive://u:p@host/db", "hive");
    expect(hv.port).toBe(DEFAULT_PORT.hive);
  });

  it("handles an empty database", () => {
    const p = parseConnectionString("mysql://u:p@host:9030");
    expect(p.database).toBe("");
    expect(p.host).toBe("host");
    expect(p.port).toBe(9030);
  });

  it("strips a trailing query string from the database", () => {
    const p = parseConnectionString("mysql://u:p@host:9030/db?useSSL=false");
    expect(p.database).toBe("db");
  });

  it("throws when there is no port and no type to default it", () => {
    expect(() => parseConnectionString("mysql://u:p@host/db")).toThrow(/no port/);
  });

  it("throws on an explicit non-numeric port instead of falling back silently", () => {
    expect(() => parseConnectionString("mysql://u:p@host:abc/db", "starrocks")).toThrow(
      /invalid port/,
    );
  });

  it("does not echo the raw url (which may carry the password) in error messages", () => {
    for (const bad of ["mysql://u:s3cret@host/db", "mysql://u:s3cret@:9030/db"]) {
      try {
        parseConnectionString(bad);
        throw new Error("expected parseConnectionString to throw");
      } catch (err) {
        expect((err as Error).message).not.toContain("s3cret");
      }
    }
  });
});

describe("type → dialect mapping", () => {
  it("maps the four supported types to two dialects", () => {
    expect(DIALECT_BY_TYPE.starrocks).toBe("mysql");
    expect(DIALECT_BY_TYPE.doris).toBe("mysql");
    expect(DIALECT_BY_TYPE.hive).toBe("hive2");
    expect(DIALECT_BY_TYPE.sparkthrift).toBe("hive2");
  });

  it("isSupportedType only accepts the four", () => {
    expect(isSupportedType("starrocks")).toBe(true);
    expect(isSupportedType("doris")).toBe(true);
    expect(isSupportedType("hive")).toBe(true);
    expect(isSupportedType("sparkthrift")).toBe(true);
    expect(isSupportedType("postgres")).toBe(false);
    expect(isSupportedType("mysql")).toBe(false);
  });
});

describe("splitSqlStatements", () => {
  it("splits a multi-statement setup script", () => {
    const out = splitSqlStatements(
      "DROP TABLE IF EXISTS t; CREATE TABLE t(a INT); INSERT INTO t VALUES (1);",
    );
    expect(out).toHaveLength(3);
    expect(out[0]).toBe("DROP TABLE IF EXISTS t");
    expect(out[2]).toBe("INSERT INTO t VALUES (1)");
  });

  it("ignores ';' inside string literals", () => {
    const out = splitSqlStatements("INSERT INTO t VALUES ('a;b'); SELECT 1;");
    expect(out).toHaveLength(2);
    expect(out[0]).toBe("INSERT INTO t VALUES ('a;b')");
  });

  it("ignores ';' inside line comments and drops comment-only statements", () => {
    const out = splitSqlStatements("SELECT 1; -- a; b\nSELECT 2;");
    expect(out).toHaveLength(2);
    expect(out[1].startsWith("SELECT 2")).toBe(true);
  });
});

describe("SQL split implementation parity", () => {
  it("keeps runtime and dtstack SDK splitters behaviorally aligned", () => {
    const samples = [
      "SELECT 1; SELECT 2;;\n",
      "INSERT INTO t VALUES ('a;b', \"c;d\"); SELECT 1",
      "CREATE TABLE `a;b` (id int); SELECT 1",
      "INSERT INTO t VALUES ('it\\'s;ok'); SELECT 1",
      "-- comment; with semicolon\nSELECT 1; SELECT 2",
      "/* comment; */ SELECT 1; /* unterminated;",
      "SELECT 1; -- a; b\nSELECT 2;",
      "  ; ; ",
    ];

    for (const sample of samples) {
      expect(sdkSplitSqlStatements(sample)).toEqual(splitSqlStatements(sample));
    }
  });
});
