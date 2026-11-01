import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoute, parseRoute, routeHash } from "../src/navigation.ts";

test("a shared URL restores finance, store and period", () => {
  const route = parseRoute("#/finance?store=s4&period=week&tab=cash", "owner");
  assert.deepEqual(route, {
    page: "finance",
    storeId: "s4",
    period: "week",
    financeTab: "cash",
  });
  assert.equal(routeHash(route), "#/finance?store=s4&period=week&tab=cash");
});
test("a deep link cannot expand manager access", () => {
  assert.equal(
    parseRoute("#/finance?store=s4&period=week&tab=requests", "manager")
      .storeId,
    "s1",
  );
});
test("employees cannot reopen a financial screen via URL", () => {
  const route = parseRoute("#/finance?store=s5&tab=cash", "employee");
  assert.equal(route.page, "tasks");
  assert.equal(route.storeId, "s1");
});
test("invalid URL fields fall back to valid defaults", () => {
  assert.deepEqual(
    parseRoute("#/unknown?store=bad&period=forever&tab=bad", "owner"),
    {
      page: "overview",
      storeId: "all",
      period: "month",
      financeTab: "pnl",
    },
  );
  assert.equal(parseRoute("#finance", "owner").page, "finance");
});
test("encoding preserves a valid workspace context on every screen", () => {
  for (const page of [
    "overview",
    "finance",
    "stores",
    "tasks",
    "assistant",
    "settings",
  ] as const) {
    const route = normalizeRoute(
      { page, storeId: "s2", period: "quarter", financeTab: "requests" },
      "owner",
    );
    assert.deepEqual(parseRoute(routeHash(route), "owner"), route);
  }
});
