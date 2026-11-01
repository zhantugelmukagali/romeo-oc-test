import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useId,
  type ReactNode,
} from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  CalendarDays,
  Store,
  Download,
  Inbox,
  RotateCcw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  compactMoney,
  money,
  shortDate,
  periodLabels,
  visibleStores,
  type Role,
  type Period,
  type Daily,
  summarize,
  trend,
} from "./data";

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  protectChanges = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  protectChanges?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const dirty = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  const protectedForm = useRef(protectChanges);
  protectedForm.current = protectChanges;
  const [discard, setDiscard] = useState(false);
  const discarding = useRef(discard);
  discarding.current = discard;
  const requestClose = useCallback(() => {
    if (protectedForm.current && dirty.current) setDiscard(true);
    else close.current();
  }, []);
  useEffect(() => {
    const oldFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex="0"]',
        ) ?? [],
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
    const input = ref.current?.querySelector<HTMLInputElement>(
      "input:not([disabled]):not([readonly]), textarea:not([disabled])",
    );
    (input ?? items()[0])?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (discarding.current) setDiscard(false);
        else requestClose();
      }
      if (e.key === "Tab") {
        const list = items();
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = oldOverflow;
      oldFocus?.focus();
    };
  }, [requestClose]);
  useEffect(() => {
    if (discard)
      ref.current
        ?.querySelector<HTMLButtonElement>(".discard-prompt button")
        ?.focus();
    else
      ref.current
        ?.querySelector<HTMLInputElement>(
          "input:not([disabled]):not([readonly]), textarea:not([disabled])",
        )
        ?.focus();
  }, [discard]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (protectedForm.current && dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
      >
        <div className="modal-heading">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Закрыть окно"
            onClick={requestClose}
          >
            <X size={20} />
          </button>
        </div>
        {discard && (
          <div className="discard-prompt">
            <h3>Закрыть без сохранения?</h3>
            <p>
              Заполненные поля будут потеряны. Вы можете продолжить работу с
              формой.
            </p>
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={() => setDiscard(false)}
              >
                Продолжить заполнение
              </button>
              <button
                className="secondary-button danger-text"
                onClick={() => close.current()}
              >
                Не сохранять
              </button>
            </div>
          </div>
        )}
        <div
          hidden={discard}
          onChangeCapture={() => {
            dirty.current = true;
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Filters({
  role,
  storeId,
  setStoreId,
  period,
  setPeriod,
  onExport,
  showPeriod = true,
  onReset,
}: {
  role: Role;
  storeId: string;
  setStoreId: (v: string) => void;
  period: Period;
  setPeriod: (v: Period) => void;
  onExport?: () => void;
  showPeriod?: boolean;
  onReset?: () => void;
}) {
  const available = visibleStores(role);
  return (
    <div className="filters">
      <label className="select-button">
        <Store size={15} />
        <select
          aria-label="Магазин"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
        >
          {available.length > 1 && <option value="all">Все магазины</option>}
          {available.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name} · {s.city}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </label>
      {showPeriod && (
        <label className="select-button">
          <CalendarDays size={15} />
          <select
            aria-label="Период"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      )}
      {onExport && (
        <button
          className="icon-button export-button"
          aria-label="Скачать отчёт CSV"
          title="Скачать отчёт CSV"
          onClick={onExport}
        >
          <Download size={17} />
        </button>
      )}
      {onReset &&
        ((available.length > 1 && storeId !== "all") ||
          (showPeriod && period !== "month")) && (
          <button className="filter-reset" onClick={onReset}>
            <RotateCcw size={14} />
            Сбросить фильтры
          </button>
        )}
    </div>
  );
}

export function Metric({
  title,
  value,
  change,
  subtitle,
  icon,
  onClick,
  spark = false,
}: {
  title: string;
  value: string;
  change?: number | null;
  subtitle?: string;
  icon: ReactNode;
  onClick?: () => void;
  spark?: boolean;
}) {
  const content = (
    <>
      <div className="metric-label">
        {title}
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-footer">
        {change != null && (
          <span className={`delta ${change >= 0 ? "positive" : "negative"}`}>
            {change >= 0 ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownLeft size={13} />
            )}
            {Math.abs(change).toFixed(1).replace(".", ",")}%
          </span>
        )}
        <span>{subtitle ?? "к прошлому периоду"}</span>
      </div>
      {spark && (
        <svg className="sparkline" viewBox="0 0 100 32" aria-hidden="true">
          <path
            d="M1 28 12 25 20 27 30 17 39 19 48 12 60 15 68 7 79 10 88 4 99 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
    </>
  );
  return onClick ? (
    <button className="metric card" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="metric card">{content}</div>
  );
}

export function RevenueChart({ rows }: { rows: Daily[] }) {
  const points = trend(rows);
  return (
    <div className="revenue-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 16, right: 6, left: -16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8c78f5" stopOpacity={0.23} />
              <stop offset="100%" stopColor="#8c78f5" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#eef0f5"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            minTickGap={45}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9295a5", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1000000
                ? (v / 1000000).toFixed(1) + "м"
                : (v / 1000).toFixed(0) + "к"
            }
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9295a5", fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => [
              money(Number(value)),
              name === "revenue" ? "Выручка" : "Прибыль",
            ]}
            labelFormatter={(label) => shortDate(String(label))}
            contentStyle={{
              border: "1px solid #ececf4",
              borderRadius: 12,
              boxShadow: "0 8px 24px #22234410",
              fontSize: 12,
            }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="revenue"
            stroke="#8064ef"
            strokeWidth={2.5}
            fill="url(#revenue-fill)"
            activeDot={{ r: 5, stroke: "white", strokeWidth: 3 }}
            dot={points.length === 1}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="profit"
            stroke="#78c2b4"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="transparent"
            dot={points.length === 1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExpenseChart({ rows }: { rows: Daily[] }) {
  const s = summarize(rows);
  const data = [
    { name: "Фонд оплаты труда", value: s.payroll, color: "#8064ef" },
    { name: "Аренда", value: s.rent, color: "#aa95f5" },
    { name: "Списания", value: s.writeoffs, color: "#c3b5f9" },
    { name: "Эквайринг", value: s.fees, color: "#76beb0" },
    { name: "Прочее", value: s.other, color: "#e3e1f2" },
  ];
  return (
    <>
      <div className="donut-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={83}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
              cornerRadius={3}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                border: "1px solid #ececf4",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <span>Всего расходов</span>
          <strong>{compactMoney(s.expenses)}</strong>
          <small>без себестоимости</small>
        </div>
      </div>
      <div className="expense-legend">
        {data.map((d) => (
          <div key={d.name}>
            <span className="legend-name">
              <i style={{ background: d.color }} />
              {d.name}
            </span>
            <span>
              {s.expenses ? Math.round((d.value / s.expenses) * 100) : 0}%
            </span>
            <strong>{compactMoney(d.value)}</strong>
          </div>
        ))}
      </div>
    </>
  );
}

export function Empty({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <Inbox size={28} />
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="secondary-button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
export function Badge({
  children,
  color = "neutral",
}: {
  children: ReactNode;
  color?: "green" | "purple" | "orange" | "red" | "neutral";
}) {
  return <span className={`badge ${color}`}>{children}</span>;
}
export function exportCsv(name: string, rows: (string | number)[][]) {
  const content =
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value);
            if (typeof value === "string" && /^[=+@\-\t\r]/.test(cell))
              cell = "'" + cell;
            return '"' + cell.replace(/"/g, '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
