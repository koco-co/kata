export type TestCaseSource =
  | { kind: "lanhu_url"; value: string; requiresLocalPrd: false }
  | { kind: "prd_file"; value: string; requiresLocalPrd: true }
  | { kind: "fixture"; value: string; requiresLocalPrd: false };

export function resolveTestCaseSource(input: string): TestCaseSource {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error("test-case-flow.source.empty");
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("lanhuapp.com")) {
      return { kind: "lanhu_url", value: trimmed, requiresLocalPrd: false };
    }
  } catch {
    // not a URL, fall through
  }

  if (trimmed.includes("fixtures") && trimmed.endsWith(".json")) {
    return { kind: "fixture", value: trimmed, requiresLocalPrd: false };
  }

  return { kind: "prd_file", value: trimmed, requiresLocalPrd: true };
}
