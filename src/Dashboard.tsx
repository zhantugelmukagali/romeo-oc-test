import { useId, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Store as StoreIcon,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  canApprove,
  cashflow,
  compactMoney,
  money,
  number,
  percentChange,
  periodLabels,
  periodBounds,
  selectedDays,
  shortDate,
  stores,
  summarize,
  trend,
  type ExpenseRequest,
  type Period,
  type Role,
  type Task,
} from "./data";
import { Filters } from "./ui";
import type { FinanceTab } from "./navigation";

type Props = {
  role: Role;
  storeId: string;
  ids: string[];
  period: Period;
  pending: ExpenseRequest[];
  tasks: Task[];
  onStoreChange: (id: string) => void;
  onPeriodChange: (period: Period) => void;
  onReset: () => void;
  onExport: () => void;
  onFinance: (tab: FinanceTab) => void;
  onRequest: (id: string) => void;
  onTask: (task?: Task) => void;
  onStore: (id: string) => void;
  onRequests: () => void;
};

const comparisonLabels: Record<Period, string> = {
  month: "к сентябрю",
  week: "к 18–24 октября",
  yesterday: "к 30 октября",
  quarter: "нет предыдущего периода",
};

function Change({ value }: { value: number | null }) {
  if (value === null)
    return <span className="dashboard-no-change">Нет сравнения</span>;
  return (
    <span className={`dashboard-change ${value < 0 ? "down" : "up"}`}>
      {value < 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
      {value > 0 ? "+" : ""}
      {value.toFixed(1).replace(".", ",")}%
    </span>
  );
}

export default function Dashboard({
  role,
  storeId,
  ids,
  period,
  pending,
  tasks,
  onStoreChange,
  onPeriodChange,
  onReset,
  onExport,
  onFinance,
  onRequest,
  onTask,
  onStore,
  onRequests,
}: Props) {
  const [series, setSeries] = useState<"revenue" | "profit">("revenue");
  const [queue, setQueue] = useState<"requests" | "tasks">("requests");
  const [sort, setSort] = useState("revenue");
  const gradient = useId();
  const effectiveSort =
    period === "quarter" && sort === "change" ? "revenue" : sort;
  const rows = useMemo(() => selectedDays(ids, period), [ids, period]);
  const total = useMemo(() => summarize(rows), [rows]);
  const before = useMemo(
    () => summarize(selectedDays(ids, period, true)),
    [ids, period],
  );
  const cash = useMemo(() => cashflow(ids, period), [ids, period]);
  const points = useMemo(() => trend(rows), [rows]);
  const scopedStores = stores.filter((s) => ids.includes(s.id));
  const storeRows = useMemo(
    () =>
      stores
        .filter((s) => ids.includes(s.id))
        .map((store) => {
          const current = summarize(selectedDays([store.id], period));
          const previous = summarize(selectedDays([store.id], period, true));
          return {
            ...store,
            ...current,
            change:
              period === "quarter"
                ? null
                : percentChange(current.revenue, previous.revenue),
          };
        })
        .sort((a, b) =>
          effectiveSort === "change"
            ? (a.change ?? 0) - (b.change ?? 0) || b.revenue - a.revenue
            : effectiveSort === "profit"
              ? b.profit - a.profit
              : b.revenue - a.revenue,
        ),
    [ids, period, effectiveSort],
  );
  const openTasks = tasks
    .filter((t) => t.status !== "done")
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        Number(b.priority === "high") - Number(a.priority === "high"),
    );
  const orderedRequests = [...pending].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  const pendingAmount = pending.reduce((sum, r) => sum + r.amount, 0);
  const change = (key: "revenue" | "profit") =>
    period === "quarter" ? null : percentChange(total[key], before[key]);
  const largestRevenue = Math.max(...storeRows.map((s) => s.revenue), 1);

  return (
    <div className="dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>
            {role === "manager"
              ? "Ваш магазин в цифрах"
              : storeId !== "all"
                ? scopedStores[0]?.name
                : "Обзор сети"}
          </h1>
          <p>
            {scopedStores.length === 1
              ? scopedStores[0]?.city
              : `${scopedStores.length} магазинов · ${new Set(scopedStores.map((s) => s.city)).size} города`}
          </p>
        </div>
        <Filters
          role={role}
          storeId={storeId}
          setStoreId={onStoreChange}
          period={period}
          setPeriod={onPeriodChange}
          onReset={onReset}
        />
      </header>

      <section className="dashboard-metrics" aria-label="Ключевые показатели">
        <button
          className="dashboard-kpi featured"
          onClick={() => onFinance("pnl")}
          aria-label={`Выручка ${money(total.revenue)}. Открыть финансовый отчёт`}
        >
          <span className="dashboard-kpi-label">
            <span className="dashboard-kpi-icon">
              <ChartNoAxesCombined size={18} />
            </span>
            Выручка
            <ArrowUpRight size={17} />
          </span>
          <strong className="dashboard-kpi-value">
            {compactMoney(total.revenue)}
          </strong>
          <span className="dashboard-kpi-context">
            {period === "quarter" ? (
              <span>Нет данных за предыдущий период</span>
            ) : (
              <>
                <Change value={change("revenue")} />
                <span>{comparisonLabels[period]}</span>
              </>
            )}
          </span>
          <span className="dashboard-kpi-note">
            {number(total.orders)} заказов за период
          </span>
        </button>
        <button
          className="dashboard-kpi"
          onClick={() => onFinance("pnl")}
          aria-label={`Управленческая прибыль ${money(total.profit)}. Открыть финансовый отчёт`}
        >
          <span className="dashboard-kpi-label">
            <span className="dashboard-kpi-icon">
              <ChartNoAxesCombined size={18} />
            </span>
            Управленческая прибыль
            <ArrowUpRight size={17} />
          </span>
          <strong className="dashboard-kpi-value">
            {compactMoney(total.profit)}
          </strong>
          <span className="dashboard-kpi-context">
            {period === "quarter" ? (
              <span>Нет данных за предыдущий период</span>
            ) : (
              <>
                <Change value={change("profit")} />
                <span>{comparisonLabels[period]}</span>
              </>
            )}
          </span>
          <span className="dashboard-kpi-note">
            До налогов и общесетевых расходов
          </span>
        </button>
        <button
          className="dashboard-kpi"
          onClick={() => onFinance("cash")}
          aria-label={`Деньги на счетах и в кассах ${money(cash.closing)}. Открыть движение денег`}
        >
          <span className="dashboard-kpi-label">
            <span className="dashboard-kpi-icon">
              <Wallet size={18} />
            </span>
            Деньги на счетах и в кассах
            <ArrowUpRight size={17} />
          </span>
          <strong className="dashboard-kpi-value">
            {compactMoney(cash.closing)}
          </strong>
          <span className="dashboard-kpi-context">
            <span
              className={`dashboard-cash-change ${cash.net < 0 ? "down" : "up"}`}
            >
              {cash.net > 0 ? "+" : ""}
              {compactMoney(cash.net)}
            </span>
            <span>за период</span>
          </span>
          <span className="dashboard-kpi-note">
            Остаток на {shortDate(periodBounds(period)[1])} 2026
          </span>
        </button>
      </section>

      <div className="dashboard-middle">
        <section
          className="dashboard-panel dashboard-trend"
          aria-labelledby="dashboard-trend-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <h2 id="dashboard-trend-title">
                {series === "revenue" ? "Выручка по дням" : "Прибыль по дням"}
              </h2>
              <p>{periodLabels[period]} · по дням, ₸</p>
            </div>
            <div
              className="dashboard-segmented"
              role="group"
              aria-label="Показатель графика"
            >
              <button
                aria-pressed={series === "revenue"}
                onClick={() => setSeries("revenue")}
              >
                Выручка
              </button>
              <button
                aria-pressed={series === "profit"}
                onClick={() => setSeries("profit")}
              >
                Прибыль
              </button>
            </div>
          </div>
          <div className="dashboard-chart-summary">
            <strong>
              {compactMoney(points.length ? total[series] / points.length : 0)}
            </strong>
            <span>
              {series === "revenue"
                ? "в среднем за день"
                : "в среднем за день, до налогов"}
            </span>
          </div>
          <div
            className="dashboard-chart"
            aria-label={`${series === "revenue" ? "Выручка" : "Прибыль"} по дням за ${periodLabels[period]}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 12, right: 16, bottom: 0, left: -8 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6155c6" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#6155c6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#eeedf3"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  minTickGap={40}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#696575", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  tickFormatter={(v) =>
                    Math.abs(v) >= 1000000
                      ? `${number(v / 1000000)} млн`
                      : `${number(v / 1000)} тыс`
                  }
                  width={68}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#696575", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [
                    money(Number(value)),
                    series === "revenue" ? "Выручка" : "Прибыль до налогов",
                  ]}
                  labelFormatter={(label) => shortDate(String(label))}
                  contentStyle={{
                    border: "1px solid #e7e4ef",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area
                  dataKey={series}
                  type="linear"
                  stroke="#6155c6"
                  strokeWidth={2.5}
                  fill={`url(#${gradient})`}
                  dot={points.length === 1 ? { r: 5 } : false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-chart-footer">
            <div>
              <span>Средний чек</span>
              <strong>{money(total.average)}</strong>
            </div>
            <div>
              <span>Маржа до налогов</span>
              <strong>{total.margin.toFixed(1).replace(".", ",")}%</strong>
            </div>
            <button onClick={() => onFinance("pnl")}>
              Финансовый отчёт
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section
          className="dashboard-panel dashboard-inbox"
          aria-labelledby="dashboard-inbox-title"
        >
          <div className="dashboard-panel-heading">
            <div>
              <h2 id="dashboard-inbox-title">
                {canApprove(role) ? "Требует внимания" : "В работе"}
              </h2>
              <p>Открытые заявки и задачи за всё время</p>
            </div>
            <span className="dashboard-queue-icon">
              <ClipboardList size={19} />
            </span>
          </div>
          <div
            className="dashboard-queue-switch"
            role="group"
            aria-label="Очередь действий"
          >
            <button
              aria-pressed={queue === "requests"}
              onClick={() => setQueue("requests")}
            >
              Заявки<span>{pending.length}</span>
            </button>
            <button
              aria-pressed={queue === "tasks"}
              onClick={() => setQueue("tasks")}
            >
              Задачи<span>{openTasks.length}</span>
            </button>
          </div>
          <div className="dashboard-queue-summary" aria-live="polite">
            {queue === "requests" ? (
              pending.length ? (
                <>
                  <strong>{money(pendingAmount)}</strong>
                  <span>
                    {canApprove(role) ? "ждут согласования" : "на согласовании"}
                  </span>
                </>
              ) : (
                "Нет заявок на согласовании"
              )
            ) : (
              "Ближайшие сроки — в начале списка"
            )}
          </div>
          <div className="dashboard-queue-list">
            {queue === "requests"
              ? orderedRequests.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    className="dashboard-queue-row"
                    onClick={() => onRequest(r.id)}
                  >
                    <span className="dashboard-row-icon">
                      <FileText size={17} />
                    </span>
                    <span className="dashboard-row-body">
                      <strong>{r.title}</strong>
                      <small>
                        {stores.find((s) => s.id === r.storeId)?.name} ·{" "}
                        {shortDate(r.date)}
                      </small>
                      <b>{money(r.amount)}</b>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))
              : openTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    className="dashboard-queue-row"
                    onClick={() => onTask(t)}
                  >
                    <span
                      className={`dashboard-row-icon ${t.priority === "high" ? "priority" : ""}`}
                    >
                      <ClipboardList size={17} />
                    </span>
                    <span className="dashboard-row-body">
                      <strong>{t.title}</strong>
                      <small>
                        {stores.find((s) => s.id === t.storeId)?.name} ·{" "}
                        {t.assignee}
                      </small>
                      <span className="dashboard-task-meta">
                        До {shortDate(t.due)}
                        {t.priority === "high" && (
                          <span>Высокий приоритет</span>
                        )}
                      </span>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
            {(queue === "requests" ? !pending.length : !openTasks.length) && (
              <div className="dashboard-queue-empty">
                <span>
                  <Check size={22} />
                </span>
                <strong>
                  {queue === "requests"
                    ? "Все заявки рассмотрены"
                    : "Все задачи выполнены"}
                </strong>
                <p>
                  {queue === "requests"
                    ? "Новые заявки появятся здесь"
                    : "Новые задачи появятся здесь"}
                </p>
              </div>
            )}
          </div>
          <button
            className="dashboard-queue-footer"
            onClick={queue === "requests" ? onRequests : () => onTask()}
          >
            {queue === "requests" ? "Перейти к заявкам" : "Перейти к задачам"}
            <ArrowRight size={16} />
          </button>
        </section>
      </div>

      <section
        className="dashboard-panel dashboard-stores"
        aria-labelledby="dashboard-stores-title"
      >
        <div className="dashboard-panel-heading">
          <div>
            <h2 id="dashboard-stores-title">
              {scopedStores.length === 1
                ? "Результат магазина"
                : "Магазины в цифрах"}
            </h2>
            <p>
              {periodLabels[period]} ·{" "}
              {scopedStores.length === 1
                ? "выбранный магазин"
                : `${scopedStores.length} магазинов`}
            </p>
          </div>
          <div className="dashboard-table-tools">
            {scopedStores.length > 1 && (
              <label>
                <span className="sr-only">Сортировка магазинов</span>
                <select
                  value={effectiveSort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="revenue">По выручке</option>
                  <option value="profit">По прибыли</option>
                  {period !== "quarter" && (
                    <option value="change">Сначала низкая динамика</option>
                  )}
                </select>
              </label>
            )}
            <button className="secondary-button" onClick={onExport}>
              <Download size={16} />
              Скачать отчёт
            </button>
          </div>
        </div>
        <div className="dashboard-table-scroll">
          <table className="dashboard-store-table">
            <thead>
              <tr>
                <th scope="col">Магазин</th>
                <th scope="col">Выручка</th>
                <th scope="col">Прибыль до налогов</th>
                <th scope="col">Маржа</th>
                <th scope="col">Изменение выручки</th>
                <th scope="col">
                  <span className="sr-only">Открыть</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {storeRows.map((s, index) => (
                <tr key={s.id}>
                  <td>
                    <button
                      className="dashboard-store-link"
                      onClick={() => onStore(s.id)}
                    >
                      <span className="dashboard-store-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="dashboard-store-symbol">
                        <StoreIcon size={17} />
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.city}</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className="dashboard-table-money">
                      {compactMoney(s.revenue)}
                    </span>
                    <span
                      className="dashboard-revenue-track"
                      aria-hidden="true"
                    >
                      <i
                        style={{
                          width: `${(s.revenue / largestRevenue) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="dashboard-mobile-profit">
                      Прибыль {compactMoney(s.profit)}
                    </span>
                  </td>
                  <td>{compactMoney(s.profit)}</td>
                  <td>{s.margin.toFixed(1).replace(".", ",")}%</td>
                  <td>
                    <Change value={s.change} />
                  </td>
                  <td>
                    <button
                      className="dashboard-open-store"
                      aria-label={`Открыть магазин ${s.name}`}
                      onClick={() => onStore(s.id)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dashboard-table-note">
          <span>Прибыль и маржа — до налогов и общесетевых расходов.</span>
          <span>
            {period === "quarter"
              ? "Нет данных для сравнения периодов"
              : `Изменение выручки — ${comparisonLabels[period]}`}
          </span>
        </div>
      </section>
    </div>
  );
}
