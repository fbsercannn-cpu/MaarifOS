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
  const focusedHeadingRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;
    const previousRouteHeading = focusedHeadingRef.current;
    const focusHeading = () => {
      const heading = boundary.querySelector<HTMLElement>("[data-route-heading]");
      if (!heading || heading === previousRouteHeading) return false;
      heading.focus({ preventScroll: true });
      if (document.activeElement !== heading) return false;
      focusedHeadingRef.current = heading;
      return true;
    };
    let retryFrame = 0;
    const retryDeadline = window.performance.now() + 5_000;
    const observer = new MutationObserver(() => {
      if (!focusHeading()) return;
      observer.disconnect();
      window.cancelAnimationFrame(retryFrame);
    });
    observer.observe(boundary, { childList: true, subtree: true });
    const retryFocus = () => {
      if (focusHeading()) {
        observer.disconnect();
        return;
      }
      if (window.performance.now() < retryDeadline) {
        retryFrame = window.requestAnimationFrame(retryFocus);
      }
    };
    retryFrame = window.requestAnimationFrame(retryFocus);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(retryFrame);
    };
  }, [routeId]);

  return (
    <div className="route-focus-boundary" data-route={routeId} ref={boundaryRef}>
      {children}
    </div>
  );
}
