export type AppSurface = "landing" | "app";

export interface RuntimeLocation {
  readonly hostname: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

const OFFICIAL_PROMOTION_HOSTS = new Set([
  "maarifos.com",
  "www.maarifos.com",
  "maarifos.net",
  "www.maarifos.net",
]);

/**
 * The store binary always opens the teacher workspace bundled inside the app.
 * Official web domains remain promotion-only even when a query parameter tries
 * to select the application surface.
 */
export function resolveAppSurface(
  location: RuntimeLocation,
  nativePlatform: boolean,
  forceRuntimeTestApp = false,
): AppSurface {
  if (nativePlatform) return "app";

  const hostname = location.hostname.toLocaleLowerCase("tr-TR");
  if (OFFICIAL_PROMOTION_HOSTS.has(hostname)) return "landing";

  const search = new URLSearchParams(location.search);
  if (
    location.hash === "#landing" ||
    location.hash === "#web" ||
    location.hash === "#site" ||
    search.get("view") === "landing" ||
    search.get("site") === "1"
  ) {
    return "landing";
  }

  if (
    forceRuntimeTestApp ||
    location.hash === "#app" ||
    search.get("view") === "app" ||
    search.get("native") === "1" ||
    location.pathname.startsWith("/gunum/")
  ) {
    return "app";
  }

  return "landing";
}
