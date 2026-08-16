import {
  visiblePrimaryNavigation,
  type AlphaPrimaryNavigationItem,
} from "../core/capabilities/alpha-capabilities.ts";

export type AppRouteId = "today" | "classroom" | "plans" | "documents";
export type AppRoutePath = "/" | "/classroom" | "/plans" | "/documents";

export interface AppRouteDefinition {
  readonly id: AppRouteId;
  readonly path: AppRoutePath;
  readonly label: AlphaPrimaryNavigationItem["label"];
}

const ROUTE_PATHS: Readonly<Record<AppRouteId, AppRoutePath>> = Object.freeze({
  today: "/",
  classroom: "/classroom",
  plans: "/plans",
  documents: "/documents",
});

/** Hediye Alpha ana navigasyonu, kullanıcıya açık route'ların tek kaynağıdır. */
export const APP_ROUTES: readonly AppRouteDefinition[] = Object.freeze(
  visiblePrimaryNavigation()
    .filter(
      (item): item is AlphaPrimaryNavigationItem & { id: AppRouteId } =>
        item.id === "today" ||
        item.id === "classroom" ||
        item.id === "plans" ||
        item.id === "documents",
    )
    .map((item) =>
      Object.freeze({
        id: item.id,
        path: ROUTE_PATHS[item.id],
        label: item.label,
      }),
    ),
);

export function routeById(routeId: AppRouteId): AppRouteDefinition {
  const route = APP_ROUTES.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error(`Tanımsız uygulama route'u: ${routeId}`);
  return route;
}

export function routeFromPathname(pathname: string): AppRouteDefinition {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return APP_ROUTES.find((route) => route.path === normalized) ?? routeById("today");
}
