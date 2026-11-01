import { useCallback, useEffect, useRef, useState } from "react";
import {
  roles,
  visibleStores,
  type Page,
  type Period,
  type Role,
} from "./data.ts";

export type FinanceTab = "pnl" | "cash" | "requests";
export interface WorkspaceRoute {
  page: Page;
  storeId: string;
  period: Period;
  financeTab: FinanceTab;
}
export function normalizeRoute(
  value: Partial<WorkspaceRoute>,
  role: Role,
): WorkspaceRoute {
  const stores = visibleStores(role);
  const defaultStore = stores.length === 1 ? stores[0].id : "all";
  return {
    page:
      value.page && roles[role].pages.includes(value.page)
        ? value.page
        : roles[role].pages[0],
    storeId:
      value.storeId === "all"
        ? defaultStore
        : stores.some((s) => s.id === value.storeId)
          ? value.storeId!
          : defaultStore,
    period:
      value.period &&
      ["month", "week", "yesterday", "quarter"].includes(value.period)
        ? value.period
        : "month",
    financeTab:
      value.financeTab && ["pnl", "cash", "requests"].includes(value.financeTab)
        ? value.financeTab
        : "pnl",
  };
}
export function parseRoute(hash: string, role: Role): WorkspaceRoute {
  const [path, query] = hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  return normalizeRoute(
    {
      page: path as Page,
      storeId: params.get("store") ?? "all",
      period: params.get("period") as Period,
      financeTab: params.get("tab") as FinanceTab,
    },
    role,
  );
}
export function routeHash(route: WorkspaceRoute) {
  const params = new URLSearchParams();
  if (route.storeId !== "all") params.set("store", route.storeId);
  if (route.period !== "month") params.set("period", route.period);
  if (route.financeTab !== "pnl") params.set("tab", route.financeTab);
  return `#/${route.page}${params.size ? "?" + params.toString() : ""}`;
}
export function initialRole(): Role {
  try {
    const saved = sessionStorage.getItem("romeo-demo-role");
    return saved && Object.hasOwn(roles, saved) ? (saved as Role) : "owner";
  } catch {
    return "owner";
  }
}
export function useWorkspaceRoute(role: Role) {
  const [route, setRoute] = useState(() =>
    parseRoute(window.location.hash, role),
  );
  const current = useRef(route);
  const update = useCallback(
    (
      patch: Partial<WorkspaceRoute>,
      options: { replace?: boolean; asRole?: Role } = {},
    ) => {
      const next = normalizeRoute(
        { ...current.current, ...patch },
        options.asRole ?? role,
      );
      const hash = routeHash(next);
      if (window.location.hash !== hash) {
        window.history[options.replace ? "replaceState" : "pushState"](
          {},
          "",
          hash,
        );
      }
      current.current = next;
      setRoute(next);
    },
    [role],
  );
  useEffect(() => {
    const read = () => {
      const next = parseRoute(window.location.hash, role);
      current.current = next;
      setRoute(next);
      if (window.location.hash !== routeHash(next))
        window.history.replaceState({}, "", routeHash(next));
    };
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hashchange", read);
    };
  }, [role]);
  return [route, update] as const;
}
