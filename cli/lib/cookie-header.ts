const COOKIE_HEADER_LIMIT = 64 * 1024;
const COOKIE_NAME_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const COOKIE_OCTET_RE = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/;
const INVALID_COOKIE_MESSAGE = "AUTH_COOKIE_INVALID: Cookie header syntax is invalid";

/** One validated Cookie request-header pair with its semantic value. */
export interface CookiePair {
  readonly name: string;
  readonly value: string;
}

function invalidCookie(): never {
  throw new Error(INVALID_COOKIE_MESSAGE);
}

function hasCharacterOutsidePrintableAscii(header: string): boolean {
  for (let index = 0; index < header.length; index += 1) {
    const code = header.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) return true;
  }
  return false;
}

function cookieValue(raw: string): string {
  if (COOKIE_OCTET_RE.test(raw)) return raw;
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    const inner = raw.slice(1, -1);
    if (COOKIE_OCTET_RE.test(inner)) return inner;
  }
  return invalidCookie();
}

function parseCookiePairs(header: string, allowLegacyDuplicates: boolean): readonly CookiePair[] {
  if (
    !header ||
    header.length > COOKIE_HEADER_LIMIT ||
    hasCharacterOutsidePrintableAscii(header) ||
    header !== header.trim()
  ) {
    return invalidCookie();
  }

  const pairs: CookiePair[] = [];
  const indexes = new Map<string, number>();
  for (const [index, rawSegment] of header.split(";").entries()) {
    const segment = index > 0 && rawSegment.startsWith(" ") ? rawSegment.slice(1) : rawSegment;
    if (!segment || segment !== segment.trim()) return invalidCookie();

    const separator = segment.indexOf("=");
    if (separator <= 0) return invalidCookie();
    const name = segment.slice(0, separator);
    if (!COOKIE_NAME_RE.test(name)) return invalidCookie();

    const pair = { name, value: cookieValue(segment.slice(separator + 1)) };
    const previousIndex = indexes.get(name);
    if (previousIndex === undefined) {
      indexes.set(name, pairs.length);
      pairs.push(pair);
      continue;
    }
    if (!allowLegacyDuplicates) return invalidCookie();
    pairs[previousIndex] = pair;
  }
  return pairs;
}

/** Parse one canonical Cookie request-header value using the platform's strict RFC 6265 subset. */
export function parseCookieHeader(header: string): readonly CookiePair[] {
  return parseCookiePairs(header, false);
}

/**
 * Canonicalize an existing platform Cookie header before crossing the strict executor boundary.
 *
 * Existing private environments historically resolved duplicate names with Map last-value
 * semantics. This compatibility step is intentionally confined to the control plane; its output
 * always satisfies the strict unique-name parser consumed by Python.
 */
export function canonicalizeLegacyCookieHeader(header: string): string {
  return parseCookiePairs(header, true)
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

/** Report whether an otherwise valid existing header needs duplicate-name compatibility. */
export function hasLegacyCookieDuplicates(header: string): boolean {
  return header.split(";").length !== parseCookiePairs(header, true).length;
}
