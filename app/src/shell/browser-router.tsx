import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  routeById,
  routeFromPathname,
  type AppRouteDefinition,
  type AppRouteId,
} from "./route-contract.ts";

const ROUTE_HISTORY_KEY = "__maarifOSRoute";

export interface BrowserRouterState {
  readonly route: AppRouteDefinition;
  navigate(routeId: AppRouteId, options?: { replace?: boolean }): void;
}

function routeHistoryState(routeId: AppRouteId): Record<string, unknown> {
  const current =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  return { ...current, [ROUTE_HISTORY_KEY]: routeId };
}

export function useBrowserRouter(): BrowserRouterState {
  const [route, setRoute] = useState(() => routeFromPathname(window.location.pathname));

  useEffect(() => {
    const canonical = routeFromPathname(window.location.pathname);
    window.history.replaceState(
      routeHistoryState(canonical.id),
      "",
      window.location.href,
    );
    setRoute(canonical);

    const handlePopState = () => setRoute(routeFromPathname(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback(
    (routeId: AppRouteId, options?: { replace?: boolean }) => {
      const next = routeById(routeId);
      const current = routeFromPathname(window.location.pathname);
      if (current.id === next.id && window.location.pathname === next.path) {
        setRoute(next);
        return;
      }
      const method = options?.replace ? "replaceState" : "pushState";
      const nextUrl = `${next.path}${window.location.search}${window.location.hash}`;
      window.history[method](routeHistoryState(next.id), "", nextUrl);
      setRoute(next);
    },
    [],
  );

  return { route, navigate };
}

export function RouteFocusBoundary({
  routeId,
  children,
}: {
  routeId: AppRouteId;
  children: ReactNode;
}) {
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;
    const focusHeading = () => {
      const heading = boundary.querySelector<HTMLElement>("[data-route-heading]");
      if (!heading) return false;
      heading.focus({ preventScroll: true });
      return true;
    };
    if (focusHeading()) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(boundary, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [routeId]);

  return (
    <div className="route-focus-boundary" data-route={routeId} ref={boundaryRef}>
      {children}
    </div>
  );
}
