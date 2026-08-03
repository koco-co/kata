export interface PlaywrightCookieState {
  readonly cookies: ReadonlyArray<{
    readonly name: string;
    readonly value: string;
    readonly domain: string;
    readonly path: "/";
    readonly expires: -1;
    readonly httpOnly: false;
    readonly secure: boolean;
    readonly sameSite: "Lax";
  }>;
  readonly origins: readonly [];
}

/** Convert an HTTP Cookie header into an in-memory Playwright storage state. */
export function cookieHeaderToPlaywrightState(
  baseUrl: string,
  cookieHeader: string,
): PlaywrightCookieState {
  const url = new URL(baseUrl);
  return {
    cookies: cookieHeader.split(";").flatMap((item) => {
      const separator = item.indexOf("=");
      if (separator <= 0) return [];
      return [
        {
          name: item.slice(0, separator).trim(),
          value: item.slice(separator + 1).trim(),
          domain: url.hostname,
          path: "/" as const,
          expires: -1 as const,
          httpOnly: false as const,
          secure: url.protocol === "https:",
          sameSite: "Lax" as const,
        },
      ];
    }),
    origins: [],
  };
}
