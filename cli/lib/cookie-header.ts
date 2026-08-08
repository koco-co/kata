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

/** Parse one Cookie request-header value using the platform's strict RFC 6265 subset. */
export function parseCookieHeader(header: string): readonly CookiePair[] {
  if (
    !header ||
    header.length > COOKIE_HEADER_LIMIT ||
    hasCharacterOutsidePrintableAscii(header) ||
    header !== header.trim()
  ) {
    return invalidCookie();
  }

  const pairs: CookiePair[] = [];
  const names = new Set<string>();
  for (const [index, rawSegment] of header.split(";").entries()) {
    const segment = index > 0 && rawSegment.startsWith(" ") ? rawSegment.slice(1) : rawSegment;
    if (!segment || segment !== segment.trim()) return invalidCookie();

    const separator = segment.indexOf("=");
    if (separator <= 0) return invalidCookie();
    const name = segment.slice(0, separator);
    if (!COOKIE_NAME_RE.test(name) || names.has(name)) return invalidCookie();

    pairs.push({ name, value: cookieValue(segment.slice(separator + 1)) });
    names.add(name);
  }
  return pairs;
}
