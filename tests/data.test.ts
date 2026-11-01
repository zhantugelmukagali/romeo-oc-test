import test from 'node:test';
import assert from 'node:assert/strict';
import { accessibleTasks, assistantAnswer, canApprove, cashflow, initialRequests, initialTasks, money, periodBounds, scopeStores, selectedDays, selectedOperations, stores, summarize, trend, visibleStores } from '../src/data.ts';

test('network totals reconcile exactly with the sum of the eight stores', () => {
  const total = summarize(selectedDays(stores.map(s => s.id), 'month'));
  const branchTotals = stores.map(s => summarize(selectedDays([s.id], 'month')));
  for (const key of ['revenue', 'orders', 'profit', 'expenses', 'cogs', 'writeoffs'] as const) {
    assert.equal(total[key], branchTotals.reduce((sum, store) => sum + store[key], 0));
  }
  assert.equal(total.profit, total.revenue - total.cogs - total.expenses);
  assert.equal(total.average, Math.round(total.revenue / total.orders));
});

test('cash balance reconciles to actual operations and continues between periods', () => {
  for (const store of stores) {
    const cash = cashflow([store.id], 'month');
    const operations = selectedOperations([store.id], 'month');
    assert.equal(cash.incoming, operations.filter(o => o.direction === 'in').reduce((sum, o) => sum + o.amount, 0));
    assert.equal(cash.outgoing, operations.filter(o => o.direction === 'out').reduce((sum, o) => sum + o.amount, 0));
    assert.equal(cash.closing, cash.opening + cash.incoming - cash.outgoing);
    assert.equal(cash.closing, cashflow([store.id], 'quarter').closing);
    assert.notEqual(cash.net, summarize(selectedDays([store.id], 'month')).profit);
  }
});

test('filters and daily chart use the same accounting data', () => {
  const ids = ['s1', 's4'];
  const rows = selectedDays(ids, 'week');
  assert.equal(rows.length, 14);
  assert.ok(rows.every(r => r.date >= '2026-10-25' && ids.includes(r.storeId)));
  const points = trend(rows);
  assert.equal(points.length, 7);
  assert.equal(points.reduce((sum, p) => sum + p.revenue, 0), summarize(rows).revenue);
  assert.equal(points.reduce((sum, p) => sum + p.profit, 0), summarize(rows).profit);
  assert.deepEqual(periodBounds('yesterday'), ['2026-10-31', '2026-10-31']);
});

test('previous-month comparison uses September, not an overlapping rolling window', () => {
  const previous = selectedDays(['s1'], 'month', true);
  assert.equal(previous.length, 30);
  assert.equal(previous[0].date, '2026-09-01');
  assert.equal(previous.at(-1)?.date, '2026-09-30');
});

test('manager cannot select another store by passing its ID', () => {
  assert.deepEqual(visibleStores('manager').map(s => s.id), ['s1']);
  assert.deepEqual(scopeStores('manager', 's5'), []);
  assert.deepEqual(scopeStores('manager', 'all'), ['s1']);
  assert.equal(canApprove('manager'), false);
  assert.equal(canApprove('employee'), false);
  assert.equal(canApprove('finance'), true);
});

test('employee tasks are limited by both store and assignee', () => {
  const visible = accessibleTasks([...initialTasks, { ...initialTasks[1], id: 'outside-scope', storeId: 's4' }], 'employee', stores.map(s => s.id));
  assert.equal(visible.length, 3);
  assert.ok(visible.every(t => t.storeId === 's1' && t.assignee === 'Меруерт'));
});

test('the suggested employee question retrieves the instruction', () => {
  const answer = assistantAnswer('Как оформить списание?', 'employee', ['s1'], 'month', initialRequests);
  assert.ok(answer.text.includes('Проверьте фактическое количество'));
  assert.ok(answer.source.includes('Демо-регламент'));
});

test('assistant revenue is exactly the dashboard result for the scoped period', () => {
  const answer = assistantAnswer('Какая выручка?', 'owner', ['s1', 's2'], 'week', initialRequests);
  assert.ok(answer.text.includes(money(summarize(selectedDays(['s1', 's2'], 'week')).revenue)));
  assert.ok(answer.source.includes('25–31 октября'));
  assert.ok(answer.source.includes('Ботанический'));
  assert.ok(!answer.source.includes('Самал'));
});

test('assistant refuses unauthorized financial requests, including forged scope', () => {
  const employee = assistantAnswer('Какая прибыль всей сети?', 'employee', stores.map(s => s.id), 'month', initialRequests);
  assert.ok(employee.text.includes('В роли сотрудника'));
  assert.ok(!employee.text.includes('₸'));
  const manager = assistantAnswer('Сколько заработал магазин Самал?', 'manager', stores.map(s => s.id), 'month', initialRequests);
  assert.ok(manager.text.includes('только данные магазина'));
  assert.ok(!manager.text.includes('₸'));
  const safe = assistantAnswer('Какая выручка?', 'manager', stores.map(s => s.id), 'month', initialRequests);
  assert.ok(safe.text.includes(money(summarize(selectedDays(['s1'], 'month')).revenue)));
});

test('assistant uses explicitly requested period and does not invent causes', () => {
  const answer = assistantAnswer('Какая выручка вчера?', 'owner', ['s1'], 'month', initialRequests);
  assert.ok(answer.text.includes(money(summarize(selectedDays(['s1'], 'yesterday')).revenue)));
  const cause = assistantAnswer('Почему упала прибыль?', 'owner', ['s1'], 'month', initialRequests);
  assert.ok(cause.text.includes('Данных для подтверждения причин изменения недостаточно'));
});

test('approved requests leave cash flow unchanged and disappear from pending totals', () => {
  const ids = stores.map(s => s.id);
  const before = cashflow(ids, 'month');
  const approved = initialRequests.map(r => ({ ...r, status: 'approved' as const }));
  const answer = assistantAnswer('Какие заявки на согласовании?', 'owner', ids, 'month', approved);
  assert.ok(answer.text.includes('0 заявки'));
  assert.deepEqual(cashflow(ids, 'month'), before);
});
