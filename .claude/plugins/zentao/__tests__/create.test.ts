import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadZentaoConfig, mapPriority, mapSeverity } from "../create.ts";

const CONFIG = resolve(fileURLToPath(new URL(".", import.meta.url)), "../zentao.config.yaml");

describe("loadZentaoConfig", () => {
  it("loads defaults from yaml", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(c.product, 23);
    assert.equal(c.assignee.account, "xianglin");
    assert.equal(c.opened_build, "trunk");
    assert.equal(c.bug_type, "codeerror");
  });
  it("throws on missing file", () => {
    assert.throws(() => loadZentaoConfig("/no/such.yaml"));
  });
});

describe("mapSeverity / mapPriority", () => {
  it("maps severity via table, default 3", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(mapSeverity(c, "critical"), 1);
    assert.equal(mapSeverity(c, "major"), 2);
    assert.equal(mapSeverity(c, "unknown" as never), 3);
  });
  it("maps priority, default 3 when absent", () => {
    const c = loadZentaoConfig(CONFIG);
    assert.equal(mapPriority(c, 1), 1);
    assert.equal(mapPriority(c, undefined), 3);
  });
});
