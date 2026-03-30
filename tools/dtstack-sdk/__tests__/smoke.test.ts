import { describe, expect, test } from "bun:test";
import { VERSION } from "../src/index";

describe("dtstack-sdk smoke", () => {
  test("version constant is exported", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
