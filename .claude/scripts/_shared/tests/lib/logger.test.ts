import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  delete process.env.KATA_LOG_LEVEL;
  delete process.env.LOG_LEVEL;
});

describe("logger", () => {
  it("createLogger returns object with 4 methods", async () => {
    const { createLogger } = await import("@shared/lib/logger.ts");
    const log = createLogger("test");
    expect(typeof log.debug).toBe("function");
    expect(typeof log.info).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.error).toBe("function");
  });

  it("setLogLevel / getLogLevel roundtrip", async () => {
    const { setLogLevel, getLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("error");
    expect(getLogLevel()).toBe("error");
    setLogLevel("debug");
    expect(getLogLevel()).toBe("debug");
    setLogLevel("info"); // reset to default
  });

  it("initLogLevel applies LOG_LEVEL env var", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("info");
    process.env.LOG_LEVEL = "error";
    initLogLevel();
    expect(getLogLevel()).toBe("error");
    setLogLevel("info");
  });

  it("initLogLevel applies KATA_LOG_LEVEL env var", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("info");
    process.env.KATA_LOG_LEVEL = "error";
    initLogLevel();
    expect(getLogLevel()).toBe("error");
    setLogLevel("info");
  });

  it("initLogLevel prefers KATA_LOG_LEVEL over bare LOG_LEVEL", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("info");
    process.env.KATA_LOG_LEVEL = "error";
    process.env.LOG_LEVEL = "debug";
    initLogLevel();
    expect(getLogLevel()).toBe("error");
    setLogLevel("info");
  });

  it("initLogLevel with invalid value keeps current level", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("info");
    process.env.LOG_LEVEL = "garbage";
    initLogLevel();
    expect(getLogLevel()).toBe("info");
  });

  it("initLogLevel with LOG_LEVEL unset is a no-op", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("warn");
    delete process.env.LOG_LEVEL;
    initLogLevel();
    expect(getLogLevel()).toBe("warn");
    setLogLevel("info");
  });

  it("initLogLevel is case-insensitive", async () => {
    const { initLogLevel, getLogLevel, setLogLevel } = await import("@shared/lib/logger.ts");
    setLogLevel("info");
    process.env.LOG_LEVEL = "DEBUG";
    initLogLevel();
    expect(getLogLevel()).toBe("debug");
    setLogLevel("info");
  });

  it("writes messages at or above the active level to stderr", async () => {
    const originalWrite = process.stderr.write;
    const { createLogger, setLogLevel } = await import("@shared/lib/logger.ts");
    let stderr = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    try {
      setLogLevel("warn");
      const log = createLogger("unit");
      log.debug("hidden debug");
      log.info("hidden info");
      log.warn("visible warn");
      log.error("visible error");
    } finally {
      setLogLevel("info");
      process.stderr.write = originalWrite;
    }

    expect(stderr).not.toContain("hidden debug");
    expect(stderr).not.toContain("hidden info");
    expect(stderr).toContain("[unit] WARN : visible warn\n");
    expect(stderr).toContain("[unit] ERROR: visible error\n");
  });
});
