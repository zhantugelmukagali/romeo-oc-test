import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  FileText,
  Flower2,
  LayoutDashboard,
  Link2,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  TrendingUp,
  Users,
  Wallet,
  X,
  CircleAlert,
  CreditCard,
  CircleCheck,
  Undo2,
} from "lucide-react";
import {
  accessibleTasks,
  assistantAnswer,
  canApprove,
  cashflow,
  compactMoney,
  initialRequests,
  initialTasks,
  money,
  number,
  percentChange,
  periodLabels,
  roles,
  scopeStores,
  selectedDays,
  selectedOperations,
  shortDate,
  stores,
  summarize,
  visibleStores,
  type ExpenseRequest,
  type ExpenseStatus,
  type Operation,
  type Page,
  type Period,
  type Role,
  type Task,
} from "./data";
import {
  Badge,
  Empty,
  ExpenseChart,
  exportCsv,
  Filters,
  Metric,
  Modal,
  RevenueChart,
} from "./ui";
import SettingsPage, {
  CompanyAvatar,
  defaultPreferences,
  type DemoConnection,
} from "./SettingsPage";

import {
  initialRole,
  routeHash,
  useWorkspaceRoute,
  type WorkspaceRoute,
  type FinanceTab,
} from "./navigation";

function useSaved<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(initial))
        return Array.isArray(stored) ? (stored as T) : initial;
      if (
        stored &&
        typeof stored === "object" &&
        initial &&
        typeof initial === "object" &&
        Object.entries(initial).every(
          ([name, value]) => typeof stored[name] === typeof value,
        )
      )
        return stored as T;
      return initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Browser storage can be unavailable. Session remains usable. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
type Message = { id: number; question: string; text: string; source: string };
const navigation = [
  { id: "overview" as Page, label: "Обзор сети", icon: LayoutDashboard },
  { id: "finance" as Page, label: "Финансы", icon: Wallet },
  { id: "stores" as Page, label: "Магазины", icon: StoreIcon },
  { id: "tasks" as Page, label: "Задачи", icon: ClipboardList },
  { id: "assistant" as Page, label: "ИИ-помощник", icon: Sparkles },
];
const statusLabels: Record<ExpenseStatus, string> = {
  pending: "На согласовании",
  approved: "Согласовано",
  rejected: "Отклонено",
};
const taskLabels = { todo: "К выполнению", doing: "В работе", done: "Готово" };

export default function App() {
  const [role, setRole] = useState<Role>(initialRole);
  const [route, updateRoute] = useWorkspaceRoute(role);
  const { page, storeId, period, financeTab } = route;
  const setFinanceTab = (tab: FinanceTab) => updateRoute({ financeTab: tab });
  const [requests, setRequests] = useSaved(
    "romeo-demo-v1-requests",
    initialRequests,
  );
  const [tasks, setTasks] = useSaved("romeo-demo-v1-tasks", initialTasks);
  const [preferences, setPreferences] = useSaved(
    "romeo-demo-v1-preferences",
    defaultPreferences,
  );
  const [connections, setConnections] = useSaved<DemoConnection[]>(
    "romeo-demo-v1-connections",
    [],
  );
  const [modal, setModal] = useState<string | null>(null);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [toast, setToastState] = useState<{
    message: string;
    undo?: () => void;
  } | null>(null);
  const setToast = useCallback(
    (message: string, undo?: () => void) =>
      setToastState(message ? { message, undo } : null),
    [],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [requestQuery, setRequestQuery] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [operationQuery, setOperationQuery] = useState("");
  const [operationDirection, setOperationDirection] = useState("all");
  const [operationPage, setOperationPage] = useState(0);
  const [requestFilter, setRequestFilter] = useState("all");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ids = useMemo(() => scopeStores(role, storeId), [role, storeId]);
  const rows = useMemo(() => selectedDays(ids, period), [ids, period]);
  const total = useMemo(() => summarize(rows), [rows]);
  const previous = useMemo(
    () => summarize(selectedDays(ids, period, true)),
    [ids, period],
  );
  const cash = useMemo(() => cashflow(ids, period), [ids, period]);
  const scopeRequests = requests.filter((r) => ids.includes(r.storeId));
  const filteredRequests = scopeRequests.filter(
    (r) =>
      (requestFilter === "all" || r.status === requestFilter) &&
      `${r.title} ${r.id} ${r.author}`
        .toLowerCase()
        .includes(requestQuery.toLowerCase().trim()),
  );
  const pending = scopeRequests.filter((r) => r.status === "pending");
  const scopeTasks = accessibleTasks(tasks, role, ids);
  const filteredTasks = scopeTasks.filter(
    (t) =>
      `${t.title} ${t.description} ${t.assignee}`
        .toLowerCase()
        .includes(taskQuery.toLowerCase().trim()) &&
      (taskFilter === "all" || (t.priority === "high" && t.status !== "done")),
  );
  const scopedOperations = useMemo(
    () => selectedOperations(ids, period),
    [ids, period],
  );
  const filteredOperations = scopedOperations.filter(
    (o) =>
      (operationDirection === "all" || o.direction === operationDirection) &&
      `${o.title} ${o.category} ${o.id} ${stores.find((s) => s.id === o.storeId)?.name}`
        .toLowerCase()
        .includes(operationQuery.toLowerCase()),
  );
  const activePage = roles[role].pages.includes(page) ? page : "tasks";
  const closeModal = useCallback(() => setModal(null), []);
  const navigate = (next: Page, patch: Partial<WorkspaceRoute> = {}) => {
    updateRoute({ ...patch, page: next });
    setSearch("");
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setCreateOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openFinance = (tab: FinanceTab) =>
    navigate("finance", { financeTab: tab });
  const clearChat = () => {
    if (answerTimer.current) clearTimeout(answerTimer.current);
    setThinking(false);
    setMessages([]);
    setQuestion("");
  };
  const changeStore = (id: string) => {
    updateRoute({ storeId: id });
    clearChat();
  };
  const changePeriod = (value: Period) => {
    updateRoute({ period: value });
    clearChat();
  };
  const chooseRole = (next: Role) => {
    setRole(next);
    updateRoute(
      { page: next === "employee" ? "tasks" : "overview", storeId: "all" },
      { asRole: next },
    );
    try {
      sessionStorage.setItem("romeo-demo-role", next);
    } catch {
      /* Session storage is optional. */
    }
    setCreateOpen(false);
    setModal(null);
    setSearch("");
    setNotificationsOpen(false);
    clearChat();
    setToast(`Роль: ${roles[next].name.toLowerCase()}`);
  };

  const resetFilters = () => {
    updateRoute({ storeId: "all", period: "month" });
    setOperationQuery("");
    setOperationDirection("all");
    setRequestFilter("all");
    setRequestQuery("");
    setTaskQuery("");
    setTaskFilter("all");
    clearChat();
  };
  useEffect(() => {
    const clearTransient = () => {
      setModal(null);
      setSearch("");
      setSidebarOpen(false);
      setNotificationsOpen(false);
      setCreateOpen(false);
    };
    window.addEventListener("popstate", clearTransient);
    return () => window.removeEventListener("popstate", clearTransient);
  }, []);
  useEffect(() => {
    if (answerTimer.current) clearTimeout(answerTimer.current);
    setThinking(false);
    setMessages([]);
    setQuestion("");
  }, [storeId, period, role]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), toast.undo ? 10000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    setOperationPage(0);
  }, [ids, period, operationQuery, operationDirection]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInput.current?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        setNotificationsOpen(false);
        setSidebarOpen(false);
        setCreateOpen(false);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  useEffect(() => {
    if (messages.length)
      messagesEnd.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [messages, thinking]);
  useEffect(
    () => () => {
      if (answerTimer.current) clearTimeout(answerTimer.current);
    },
    [],
  );

  const exportReport = () => {
    if (activePage === "finance" && financeTab === "cash") {
      exportCsv("ROMEO-ДДС-демо.csv", [
        ["ДЕМО-ДАННЫЕ", periodLabels[period]],
        [
          "Дата",
          "Магазин",
          "Описание",
          "Статья",
          "Поступление",
          "Выплата",
          "Источник",
        ],
        ...filteredOperations.map((o) => [
          o.date,
          stores.find((s) => s.id === o.storeId)!.name,
          o.title,
          o.category,
          o.direction === "in" ? o.amount : 0,
          o.direction === "out" ? o.amount : 0,
          o.source,
        ]),
      ]);
    } else if (activePage === "finance" && financeTab === "requests") {
      exportCsv("ROMEO-Заявки-демо.csv", [
        ["ДЕМО-ДАННЫЕ"],
        ["Номер", "Магазин", "Заявка", "Сумма", "Статус"],
        ...filteredRequests.map((r) => [
          r.id,
          stores.find((s) => s.id === r.storeId)!.name,
          r.title,
          r.amount,
          statusLabels[r.status],
        ]),
      ]);
    } else {
      exportCsv("ROMEO-Отчёт-демо.csv", [
        [
          "ДЕМО-ДАННЫЕ",
          periodLabels[period],
          "Предварительно: без налогов и общесетевых расходов",
        ],
        [
          "Магазин",
          "Город",
          "Выручка",
          "Себестоимость",
          "Расходы и списания",
          "Управленческая прибыль",
          "Заказы",
          "Средний чек",
        ],
        ...stores
          .filter((s) => ids.includes(s.id))
          .map((s) => {
            const t = summarize(selectedDays([s.id], period));
            return [
              s.name,
              s.city,
              t.revenue,
              t.cogs,
              t.expenses,
              t.profit,
              t.orders,
              t.average,
            ];
          }),
      ]);
    }
    setToast("Отчёт CSV скачан");
  };

  const approveRequest = (id: string, status: ExpenseStatus) => {
    if (!canApprove(role)) return;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id && ids.includes(r.storeId) && r.status === "pending"
          ? { ...r, status }
          : r,
      ),
    );
    setToast(
      status === "approved"
        ? "Заявка согласована. Оплата ещё не проведена."
        : "Заявка отклонена",
      () => {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id && r.status === status
              ? { ...r, status: "pending" }
              : r,
          ),
        );
        setToast("Решение отменено. Заявка снова на согласовании.");
      },
    );
    setModal(null);
  };
  const changeTaskStatus = (task: Task) => {
    if (!scopeTasks.some((t) => t.id === task.id)) return;
    const status =
      task.status === "todo"
        ? "doing"
        : task.status === "doing"
          ? "done"
          : "todo";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status } : t)),
    );
    setToast(`Задача: ${taskLabels[status].toLowerCase()}`, () => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id && t.status === status
            ? { ...t, status: task.status }
            : t,
        ),
      );
      setToast("Изменение статуса отменено");
    });
  };
  const ask = (value: string) => {
    if (!value.trim() || thinking) return;
    const asked = value.trim();
    setQuestion("");
    setThinking(true);
    answerTimer.current = setTimeout(() => {
      const answer = assistantAnswer(asked, role, ids, period, requests);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), question: asked, ...answer },
      ]);
      setThinking(false);
    }, 450);
  };

  const selectedRequest = modal?.startsWith("request:")
    ? scopeRequests.find((r) => r.id === modal.slice(8))
    : undefined;
  const selectedOperation = modal?.startsWith("operation:")
    ? scopedOperations.find((o) => o.id === modal.slice(10))
    : undefined;
  const selectedStore = modal?.startsWith("store:")
    ? visibleStores(role).find((s) => s.id === modal.slice(6))
    : undefined;
  const q = search.trim().toLowerCase();
  const searchResults = q
    ? [
        ...navigation
          .filter(
            (n) =>
              roles[role].pages.includes(n.id) &&
              n.label.toLowerCase().includes(q),
          )
          .map((n) => ({
            key: n.id,
            title: n.label,
            subtitle: "Раздел системы",
            action: () => navigate(n.id),
          })),
        ...(role !== "employee"
          ? visibleStores(role)
              .filter((s) => `${s.name} ${s.city}`.toLowerCase().includes(q))
              .map((s) => ({
                key: s.id,
                title: s.name,
                subtitle: s.city,
                action: () => {
                  setModal("store:" + s.id);
                  setSearch("");
                },
              }))
          : []),
        ...scopeTasks
          .filter((t) => t.title.toLowerCase().includes(q))
          .map((t) => ({
            key: t.id,
            title: t.title,
            subtitle: "Задача · " + taskLabels[t.status],
            action: () => {
              setTaskQuery(t.title);
              setTaskFilter("all");
              navigate("tasks");
            },
          })),
        ...(role !== "employee"
          ? scopeRequests
              .filter((r) => r.title.toLowerCase().includes(q))
              .map((r) => ({
                key: r.id,
                title: r.title,
                subtitle: "Заявка · " + money(r.amount),
                action: () => {
                  setModal("request:" + r.id);
                  setSearch("");
                },
              }))
          : []),
      ].slice(0, 7)
    : [];

  const storeTable = (short = false) => (
    <div className="table-scroll">
      <table className="store-table">
        <thead>
          <tr>
            <th>Магазин</th>
            <th>Выручка</th>
            <th>
              Прибыль <span className="muted">*</span>
            </th>
            <th>Маржа</th>
            <th>Динамика</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stores
            .filter((s) => ids.includes(s.id))
            .slice(0, short ? 5 : 8)
            .map((s, index) => {
              const t = summarize(selectedDays([s.id], period));
              const before = summarize(selectedDays([s.id], period, true));
              const delta =
                period === "quarter"
                  ? null
                  : percentChange(t.revenue, before.revenue);
              return (
                <tr key={s.id}>
                  <td>
                    <button
                      className="store-name-button"
                      onClick={() => setModal("store:" + s.id)}
                    >
                      <span className={`store-avatar tint-${index % 3}`}>
                        <StoreIcon size={16} />
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.city}</small>
                      </span>
                    </button>
                  </td>
                  <td className="numeric">{compactMoney(t.revenue)}</td>
                  <td className="numeric">{compactMoney(t.profit)}</td>
                  <td>
                    <span className="margin-pill">{t.margin.toFixed(1)}%</span>
                  </td>
                  <td>
                    {delta == null ? (
                      <span className="muted">Нет сравнения</span>
                    ) : (
                      <span
                        className={`delta ${delta >= 0 ? "positive" : "negative"}`}
                      >
                        <ArrowUpRight size={13} />
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="icon-button small"
                      aria-label={"Открыть магазин " + s.name}
                      onClick={() => setModal("store:" + s.id)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-scrim"
          aria-label="Закрыть меню"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate(roles[role].pages[0])}
          aria-label="ROMEO OS — главная"
        >
          <span className="brand-symbol">
            <Flower2 size={29} strokeWidth={2.3} />
          </span>
          <span>
            ROMEO<span className="brand-os">OS</span>
          </span>
        </button>
        <div className="workspace-switch">
          <span className="workspace-flower">
            <CompanyAvatar type={preferences.avatar} />
          </span>
          <span>
            <strong>{preferences.companyName}</strong>
            <small>
              {visibleStores(role).length === 1 ? "Ваш магазин" : "8 магазинов"}
            </small>
          </span>
        </div>
        <nav aria-label="Главное меню">
          {navigation
            .filter((n) => roles[role].pages.includes(n.id))
            .map((n) => (
              <button
                key={n.id}
                className={`nav-item ${activePage === n.id ? "active" : ""}`}
                aria-current={activePage === n.id ? "page" : undefined}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={18} />
                <span>{n.label}</span>
                {n.id === "tasks" && (
                  <span className="nav-count">
                    {scopeTasks.filter((t) => t.status !== "done").length}
                  </span>
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            aria-current={activePage === "settings" ? "page" : undefined}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} />
            <span>Настройки</span>
          </button>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={18} />
            <span>Помощь</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="header-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Открыть меню"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="header-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                ref={searchInput}
                aria-label="Поиск по системе"
                placeholder="Поиск по системе"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults[0]) {
                    e.preventDefault();
                    searchResults[0].action();
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    document
                      .querySelector<HTMLButtonElement>(
                        ".search-results button",
                      )
                      ?.focus();
                  }
                }}
              />
              <kbd>⌘ K</kbd>
              {search && (
                <div
                  className="search-results"
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const buttons = [
                        ...e.currentTarget.querySelectorAll("button"),
                      ];
                      const index = buttons.indexOf(
                        document.activeElement as HTMLButtonElement,
                      );
                      buttons[
                        (index +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                          buttons.length
                      ]?.focus();
                    }
                  }}
                >
                  <small>РЕЗУЛЬТАТЫ ПОИСКА</small>
                  {searchResults.length ? (
                    searchResults.map((r) => (
                      <button key={r.key} onClick={r.action}>
                        <Search size={15} />
                        <span>
                          <strong>{r.title}</strong>
                          <small>{r.subtitle}</small>
                        </span>
                        <ArrowRight size={14} />
                      </button>
                    ))
                  ) : (
                    <p>
                      Ничего не найдено. Попробуйте название магазина, задачи
                      или раздела.
                    </p>
                  )}
                </div>
              )}
            </div>
            {role !== "employee" && (
              <div className="create-wrapper">
                <button
                  className="primary-button quick-create"
                  aria-label="Создать"
                  aria-expanded={createOpen}
                  onClick={() => {
                    setCreateOpen(!createOpen);
                    setNotificationsOpen(false);
                  }}
                >
                  <Plus size={16} />
                  <span>Создать</span>
                  <ChevronDown size={13} />
                </button>
                {createOpen && (
                  <>
                    <button
                      className="popover-dismiss"
                      tabIndex={-1}
                      aria-label="Закрыть меню создания"
                      onClick={() => setCreateOpen(false)}
                    />
                    <div className="create-popover">
                      <button
                        onClick={() => {
                          setCreateOpen(false);
                          setModal("new-request");
                        }}
                      >
                        <Wallet size={18} />
                        <span>
                          <strong>Заявку на расход</strong>
                          <small>Передать расход на согласование</small>
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setCreateOpen(false);
                          setModal("new-task");
                        }}
                      >
                        <ClipboardList size={18} />
                        <span>
                          <strong>Задачу команде</strong>
                          <small>Назначить ответственного и срок</small>
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notificationsOpen ? "selected" : ""}`}
                aria-label="Уведомления"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={18} />
                {preferences.notifications &&
                  (role !== "employee"
                    ? pending.length
                    : scopeTasks.filter((t) => t.status === "todo").length) >
                    0 && <i />}
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  {!preferences.notifications ? (
                    <>
                      <Empty
                        title="Уведомления отключены"
                        description="Включите уведомления в общих настройках пространства."
                      />
                      <button onClick={() => navigate("settings")}>
                        <Settings2 size={16} />
                        <span>Открыть настройки</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="popover-title">
                        Требует внимания
                        <Badge>
                          {role === "employee"
                            ? scopeTasks.filter((t) => t.status === "todo")
                                .length
                            : pending.length}
                        </Badge>
                      </div>
                      {role !== "employee" ? (
                        pending.length ? (
                          pending.map((r) => (
                            <button
                              onClick={() => {
                                setModal("request:" + r.id);
                                setNotificationsOpen(false);
                              }}
                              key={r.id}
                            >
                              <span className="notification-icon">
                                <FileText size={17} />
                              </span>
                              <span>
                                <strong>{r.title}</strong>
                                <small>
                                  {money(r.amount)} · {statusLabels[r.status]}
                                </small>
                              </span>
                            </button>
                          ))
                        ) : (
                          <Empty
                            title="Всё разобрано"
                            description="Нет заявок, ожидающих решения."
                          />
                        )
                      ) : scopeTasks.filter((t) => t.status === "todo")
                          .length ? (
                        scopeTasks
                          .filter((t) => t.status === "todo")
                          .map((t) => (
                            <button
                              key={t.id}
                              onClick={() => navigate("tasks")}
                            >
                              <ClipboardList size={18} />
                              <span>
                                <strong>{t.title}</strong>
                                <small>До {shortDate(t.due)}</small>
                              </span>
                            </button>
                          ))
                      ) : (
                        <Empty
                          title="Новых задач нет"
                          description="Все задачи уже приняты в работу."
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              className="icon-button header-settings"
              aria-label="Настройки пространства"
              onClick={() => navigate("settings")}
            >
              <Settings2 size={17} />
            </button>
            <div className="header-divider" />
            <button
              className="profile-button"
              aria-label="Сменить роль"
              title="Сменить роль"
              onClick={() => setModal("roles")}
            >
              <span className="avatar">{roles[role].initials}</span>
              <span>
                <strong>{roles[role].person}</strong>
                <small>{roles[role].name}</small>
              </span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        {storeId !== "all" && activePage !== "settings" && (
          <div className="workspace-context">
            <StoreIcon size={15} />
            <span>
              Показаны данные магазина{" "}
              <strong>{stores.find((s) => s.id === storeId)?.name}</strong>
            </span>
            {visibleStores(role).length > 1 && (
              <button
                className="text-button"
                aria-label="Вернуться ко всей сети"
                onClick={() => changeStore("all")}
              >
                Вся сеть <X size={14} />
              </button>
            )}
          </div>
        )}
        <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
          {navigation
            .filter((n) => roles[role].pages.includes(n.id))
            .map((n) => (
              <a
                key={n.id}
                href={routeHash({ ...route, page: n.id })}
                aria-current={activePage === n.id ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(n.id);
                }}
              >
                <n.icon size={19} />
                <span>
                  {
                    {
                      overview: "Обзор",
                      finance: "Финансы",
                      stores: "Магазины",
                      tasks: "Задачи",
                      assistant: "Помощник",
                      settings: "Настройки",
                    }[n.id]
                  }
                </span>
              </a>
            ))}
        </nav>
        <main>
          {activePage === "overview" && (
            <div className="overview-workspace">
              <div className="page-heading">
                <div>
                  <h1>
                    {role === "manager" ? "Ваш магазин в цифрах" : "Обзор сети"}
                  </h1>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => openFinance("pnl")}
                >
                  Финансовый отчёт <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="overview-filterbar">
                <Filters
                  role={role}
                  storeId={storeId}
                  setStoreId={changeStore}
                  period={period}
                  setPeriod={changePeriod}
                  onReset={resetFilters}
                  onExport={exportReport}
                />
              </div>
              <div className="metrics-grid three overview-metrics">
                <Metric
                  title="Выручка"
                  value={compactMoney(total.revenue)}
                  change={
                    period === "quarter"
                      ? null
                      : percentChange(total.revenue, previous.revenue)
                  }
                  subtitle={
                    period === "quarter"
                      ? "за выбранный период"
                      : period === "month"
                        ? "к сентябрю"
                        : "к прошлому периоду"
                  }
                  icon={<ArrowUpRight size={18} />}
                  onClick={() => openFinance("pnl")}
                />
                <Metric
                  title="Управленческая прибыль"
                  value={compactMoney(total.profit)}
                  subtitle="до налогов и общесетевых расходов"
                  icon={<ArrowUpRight size={18} />}
                  onClick={() => openFinance("pnl")}
                />
                <Metric
                  title="Деньги на счетах и в кассах"
                  value={compactMoney(cash.closing)}
                  subtitle="на конец выбранного периода"
                  icon={<ArrowUpRight size={18} />}
                  onClick={() => openFinance("cash")}
                />
              </div>
              <div className="overview-main-grid">
                <section className="card chart-card">
                  <div className="card-heading">
                    <div>
                      <h2>Продажи и прибыль</h2>
                      <p>Динамика по дням, ₸</p>
                    </div>
                    <Badge>{periodLabels[period]}</Badge>
                  </div>
                  <div className="chart-keys">
                    <span>
                      <i className="purple-dot" />
                      Выручка
                    </span>
                    <span>
                      <i className="mint-dot" />
                      Прибыль до налогов
                    </span>
                  </div>
                  <RevenueChart rows={rows} />
                  <div className="sales-summary">
                    <span>
                      <strong>{number(total.orders)}</strong> заказов
                    </span>
                    <span>
                      <strong>{money(total.average)}</strong> средний чек
                    </span>
                  </div>
                </section>
                <section
                  className="card decision-inbox"
                  aria-label="Что требует внимания"
                >
                  <div className="card-heading">
                    <div>
                      <h2>
                        {canApprove(role)
                          ? "Ожидают вашего решения"
                          : "Заявки на согласовании"}
                      </h2>
                      <p>
                        {pending.length
                          ? money(
                              pending.reduce((sum, r) => sum + r.amount, 0),
                            ) + " в заявках"
                          : "Все заявки рассмотрены"}
                      </p>
                    </div>
                    <span className="inbox-count">{pending.length}</span>
                  </div>
                  <div className="decision-list">
                    {pending.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        className="decision-row"
                        onClick={() => setModal("request:" + r.id)}
                      >
                        <span className="decision-marker">
                          <Wallet size={17} />
                        </span>
                        <span>
                          <strong>{r.title}</strong>
                          <small>
                            {stores.find((s) => s.id === r.storeId)?.name} ·{" "}
                            {r.author}
                          </small>
                          <b>{money(r.amount)}</b>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                    {!pending.length && (
                      <div className="inbox-clear">
                        <CircleCheck size={25} />
                        <strong>Всё рассмотрено</strong>
                        <span>Новые заявки появятся здесь</span>
                      </div>
                    )}
                  </div>
                  <button
                    className="inbox-footer"
                    onClick={() => {
                      setRequestFilter("pending");
                      setRequestQuery("");
                      openFinance("requests");
                    }}
                  >
                    Все заявки <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="overview-bottom-grid">
                <section className="card stores-card">
                  <div className="card-heading">
                    <div>
                      <h2>Результаты магазинов</h2>
                      <p>
                        {ids.length} магазинов ·{" "}
                        {periodLabels[period].toLowerCase()}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("stores")}
                    >
                      Все магазины <ArrowRight size={16} />
                    </button>
                  </div>
                  {storeTable(true)}
                  <div className="table-footnote">
                    Прибыль до налогов и общесетевых расходов.
                  </div>
                </section>
              </div>
            </div>
          )}

          {activePage === "finance" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Финансы</h1>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setModal("new-request")}
                >
                  <Plus size={17} />
                  Заявка на расход
                </button>
              </div>
              <div className="toolbar">
                <div className="section-tabs">
                  {(
                    [
                      ["pnl", "Прибыль и убытки"],
                      ["cash", "Движение денег"],
                      ["requests", "Заявки на расходы"],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      className={financeTab === tab ? "active" : ""}
                      onClick={() => setFinanceTab(tab)}
                    >
                      {label}
                      {tab === "requests" && pending.length > 0 && (
                        <span className="tab-counter">{pending.length}</span>
                      )}
                    </button>
                  ))}
                </div>
                <Filters
                  role={role}
                  storeId={storeId}
                  setStoreId={changeStore}
                  period={period}
                  setPeriod={changePeriod}
                  onReset={resetFilters}
                  onExport={exportReport}
                  showPeriod={financeTab !== "requests"}
                />
              </div>
              {financeTab === "pnl" && (
                <>
                  <div className="notice">
                    <CircleAlert size={17} />
                    <span>
                      Без налогов и общесетевых расходов. Начисления могут
                      отличаться от выплат.
                    </span>
                  </div>
                  <div className="metrics-grid three">
                    <Metric
                      title="Выручка"
                      value={compactMoney(total.revenue)}
                      icon={<TrendingUp size={16} />}
                      subtitle={periodLabels[period]}
                    />
                    <Metric
                      title="Валовая прибыль"
                      value={compactMoney(total.gross)}
                      icon={<Wallet size={16} />}
                      subtitle="выручка минус себестоимость"
                    />
                    <Metric
                      title="Управленческая прибыль"
                      value={compactMoney(total.profit)}
                      icon={<CheckCheck size={16} />}
                      subtitle={`маржа ${total.margin.toFixed(1)}% · предварительно`}
                    />
                  </div>
                  <div className="finance-layout">
                    <section className="card pnl-card">
                      <div className="card-heading">
                        <div>
                          <h2>Отчёт о прибылях и убытках</h2>
                          <p>
                            {periodLabels[period]} ·{" "}
                            {ids.length === 8
                              ? "Вся сеть"
                              : ids.length + " магазин"}
                          </p>
                        </div>
                        <Badge color="orange">Не закрыт</Badge>
                      </div>
                      <div className="pnl-header">
                        <span>Статья</span>
                        <span>Сумма, ₸</span>
                        <span>% выручки</span>
                      </div>
                      {[
                        {
                          title: "Выручка",
                          value: total.revenue,
                          type: "strong",
                        },
                        {
                          title: "Себестоимость продаж",
                          value: -total.cogs,
                          type: "",
                        },
                        {
                          title: "Валовая прибыль",
                          value: total.gross,
                          type: "subtotal",
                        },
                        {
                          title: "Фонд оплаты труда",
                          value: -total.payroll,
                          type: "",
                        },
                        { title: "Аренда", value: -total.rent, type: "" },
                        {
                          title: "Списания",
                          value: -total.writeoffs,
                          type: "",
                        },
                        { title: "Эквайринг", value: -total.fees, type: "" },
                        {
                          title: "Прочие расходы",
                          value: -total.other,
                          type: "",
                        },
                        {
                          title: "Управленческая прибыль",
                          value: total.profit,
                          type: "total",
                        },
                      ].map((row) => (
                        <div className={`pnl-row ${row.type}`} key={row.title}>
                          <span>{row.title}</span>
                          <strong>{money(row.value)}</strong>
                          <span>
                            {total.revenue
                              ? (
                                  (Math.abs(row.value) / total.revenue) *
                                  100
                                ).toFixed(1)
                              : "0"}
                            %
                          </span>
                        </div>
                      ))}
                      <div className="table-footnote">
                        Продажи и начисления за выбранный период.
                      </div>
                    </section>
                    <div className="finance-side">
                      <section className="card expense-card">
                        <div className="card-heading">
                          <h2>Операционные расходы</h2>
                        </div>
                        <ExpenseChart rows={rows} />
                      </section>
                      <div className="explanation-card">
                        <BookOpen size={19} />
                        <div>
                          <strong>Прибыль ≠ деньги на счёте</strong>
                          <p>
                            В P&L расходы относятся к периоду. В ДДС — к дате
                            фактического платежа. Например, аренда начисляется
                            за месяц, а оплачивается одним переводом.
                          </p>
                          <button
                            className="text-button"
                            onClick={() => setFinanceTab("cash")}
                          >
                            Посмотреть движение денег <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {financeTab === "cash" && (
                <>
                  <div className="metrics-grid">
                    <Metric
                      title="На начало периода"
                      value={compactMoney(cash.opening)}
                      icon={<Wallet size={16} />}
                      subtitle="с учётом предыдущих операций"
                    />
                    <Metric
                      title="Поступления"
                      value={compactMoney(cash.incoming)}
                      icon={<ArrowDownLeft size={16} />}
                      subtitle="оплаты покупателей"
                    />
                    <Metric
                      title="Выплаты"
                      value={compactMoney(cash.outgoing)}
                      icon={<ArrowUpRight size={16} />}
                      subtitle="фактическое движение денег"
                    />
                    <Metric
                      title="На конец периода"
                      value={compactMoney(cash.closing)}
                      icon={<CreditCard size={16} />}
                      subtitle="начало + поступления − выплаты"
                    />
                  </div>
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h2>Операции</h2>
                        <p>
                          Сводные операции по дням ·{" "}
                          {number(filteredOperations.length)} записей
                        </p>
                      </div>
                      <div className="table-controls">
                        <label className="inline-search">
                          <Search size={15} />
                          <input
                            aria-label="Поиск операций"
                            placeholder="Найти операцию"
                            value={operationQuery}
                            onChange={(e) => setOperationQuery(e.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Тип операции"
                          value={operationDirection}
                          onChange={(e) =>
                            setOperationDirection(e.target.value)
                          }
                        >
                          <option value="all">Все операции</option>
                          <option value="in">Поступления</option>
                          <option value="out">Выплаты</option>
                        </select>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table className="operations-table">
                        <thead>
                          <tr>
                            <th>Операция</th>
                            <th>Магазин</th>
                            <th>Дата</th>
                            <th>Статья</th>
                            <th>Сумма</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOperations
                            .slice(operationPage * 10, (operationPage + 1) * 10)
                            .map((o) => (
                              <tr key={o.id}>
                                <td>
                                  <button
                                    className="operation-name"
                                    onClick={() =>
                                      setModal("operation:" + o.id)
                                    }
                                  >
                                    <span
                                      className={`operation-icon ${o.direction}`}
                                    >
                                      {o.direction === "in" ? (
                                        <ArrowDownLeft size={16} />
                                      ) : (
                                        <ArrowUpRight size={16} />
                                      )}
                                    </span>
                                    <span>
                                      <strong>{o.title}</strong>
                                      <small>
                                        {o.source}
                                        {o.needsReview && " · нужна проверка"}
                                      </small>
                                    </span>
                                  </button>
                                </td>
                                <td>
                                  {stores.find((s) => s.id === o.storeId)?.name}
                                </td>
                                <td className="nowrap">{shortDate(o.date)}</td>
                                <td>
                                  <Badge
                                    color={o.needsReview ? "orange" : "neutral"}
                                  >
                                    {o.category}
                                  </Badge>
                                </td>
                                <td
                                  className={`numeric ${o.direction === "in" ? "positive" : ""}`}
                                >
                                  {o.direction === "in" ? "+" : "−"}
                                  {money(o.amount)}
                                </td>
                                <td>
                                  <button
                                    className="icon-button small"
                                    aria-label={"Открыть операцию " + o.id}
                                    onClick={() =>
                                      setModal("operation:" + o.id)
                                    }
                                  >
                                    <ChevronRight size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!filteredOperations.length && (
                      <Empty
                        title="Операции не найдены"
                        description="Измените поисковый запрос или фильтры."
                        actionLabel="Сбросить поиск"
                        onAction={() => {
                          setOperationQuery("");
                          setOperationDirection("all");
                        }}
                      />
                    )}
                    <div className="pagination">
                      <span>
                        {filteredOperations.length
                          ? `${operationPage * 10 + 1}–${Math.min((operationPage + 1) * 10, filteredOperations.length)} из ${filteredOperations.length}`
                          : "0 операций"}
                      </span>
                      <div>
                        <button
                          className="secondary-button small-button"
                          disabled={operationPage === 0}
                          onClick={() => setOperationPage((p) => p - 1)}
                        >
                          Назад
                        </button>
                        <button
                          className="secondary-button small-button"
                          disabled={
                            (operationPage + 1) * 10 >=
                            filteredOperations.length
                          }
                          onClick={() => setOperationPage((p) => p + 1)}
                        >
                          Далее
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
              {financeTab === "requests" && (
                <>
                  <div className="notice">
                    <ShieldCheck size={17} />
                    <span>
                      Согласование не списывает деньги. Заявки за всё время.{" "}
                      {role === "manager" &&
                        "Решения принимают собственник или финансист."}
                    </span>
                  </div>
                  <dl className="request-totals">
                    <div>
                      <dt>Ожидают согласования · {pending.length}</dt>
                      <dd>
                        {money(pending.reduce((sum, r) => sum + r.amount, 0))}
                      </dd>
                    </div>
                    <div>
                      <dt>Согласовано, не оплачено</dt>
                      <dd>
                        {money(
                          scopeRequests
                            .filter((r) => r.status === "approved")
                            .reduce((sum, r) => sum + r.amount, 0),
                        )}
                      </dd>
                    </div>
                  </dl>
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h2>Заявки команды</h2>
                        <p>
                          {filteredRequests.length} из {scopeRequests.length} ·
                          {canApprove(role)
                            ? " откройте заявку, чтобы принять решение"
                            : " откройте заявку, чтобы посмотреть статус и детали"}
                        </p>
                      </div>
                      <div className="table-controls">
                        <label className="inline-search">
                          <Search size={15} />
                          <input
                            aria-label="Поиск заявок"
                            placeholder="Название, номер или автор"
                            value={requestQuery}
                            onChange={(e) => setRequestQuery(e.target.value)}
                          />
                        </label>
                        <select
                          value={requestFilter}
                          aria-label="Статус заявки"
                          onChange={(e) => setRequestFilter(e.target.value)}
                        >
                          <option value="all">Все статусы</option>
                          {Object.entries(statusLabels).map(
                            ([value, title]) => (
                              <option value={value} key={value}>
                                {title}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table className="requests-table">
                        <thead>
                          <tr>
                            <th>Заявка</th>
                            <th>Магазин</th>
                            <th>Автор</th>
                            <th>Сумма</th>
                            <th>Статус</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRequests.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <button
                                  className="table-text-button"
                                  onClick={() => setModal("request:" + r.id)}
                                >
                                  <strong>{r.title}</strong>
                                  <small>
                                    {r.id} · {shortDate(r.date)}
                                  </small>
                                </button>
                              </td>
                              <td>
                                {stores.find((s) => s.id === r.storeId)?.name}
                              </td>
                              <td>{r.author}</td>
                              <td className="numeric">{money(r.amount)}</td>
                              <td>
                                <Badge
                                  color={
                                    r.status === "pending"
                                      ? "orange"
                                      : r.status === "approved"
                                        ? "green"
                                        : "red"
                                  }
                                >
                                  {statusLabels[r.status]}
                                </Badge>
                              </td>
                              <td>
                                <button
                                  className="icon-button small"
                                  aria-label={"Открыть заявку " + r.id}
                                  onClick={() => setModal("request:" + r.id)}
                                >
                                  Открыть <ChevronRight size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!filteredRequests.length && (
                      <Empty
                        title={
                          scopeRequests.length
                            ? "Нет заявок по выбранным условиям"
                            : "Заявок пока нет"
                        }
                        description={
                          scopeRequests.length
                            ? "Очистите поиск и статус, чтобы увидеть все заявки магазина."
                            : "Создайте первую заявку и передайте её на согласование."
                        }
                        actionLabel={
                          scopeRequests.length
                            ? "Показать все заявки"
                            : "Создать заявку"
                        }
                        onAction={() => {
                          if (scopeRequests.length) {
                            setRequestQuery("");
                            setRequestFilter("all");
                          } else setModal("new-request");
                        }}
                      />
                    )}
                  </section>
                </>
              )}
            </>
          )}

          {activePage === "stores" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>Магазины</h1>
                </div>
                <Badge color="green">
                  {visibleStores(role).length}{" "}
                  {visibleStores(role).length === 1
                    ? "магазин доступен"
                    : "магазинов доступны"}
                </Badge>
              </div>
              <div className="toolbar">
                <Filters
                  role={role}
                  storeId={storeId}
                  setStoreId={changeStore}
                  period={period}
                  setPeriod={changePeriod}
                  onReset={resetFilters}
                  onExport={exportReport}
                />
              </div>
              <section className="card">
                <div className="card-heading">
                  <h2>Сравнение магазинов</h2>
                  <Badge>{periodLabels[period]}</Badge>
                </div>
                {storeTable()}
                <div className="table-footnote">
                  * Предварительный управленческий результат без налогов и
                  общесетевых расходов.
                </div>
              </section>
            </>
          )}

          {activePage === "tasks" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    {role === "employee" ? "Мои задачи" : "Задачи команды"}
                  </h1>
                </div>
                {role !== "employee" && (
                  <button
                    className="primary-button"
                    onClick={() => setModal("new-task")}
                  >
                    <Plus size={17} />
                    Новая задача
                  </button>
                )}
              </div>
              <div className="task-toolbar">
                <div className="task-summary">
                  <span>
                    <i className="purple-dot" />
                    {scopeTasks.filter((t) => t.status !== "done").length}{" "}
                    открытых
                  </span>
                  <span>
                    <i className="mint-dot" />
                    {scopeTasks.filter((t) => t.status === "done").length}{" "}
                    завершено
                  </span>
                </div>
                {visibleStores(role).length > 1 && (
                  <label className="select-button">
                    <StoreIcon size={15} />
                    <select
                      aria-label="Магазин задач"
                      value={storeId}
                      onChange={(e) => changeStore(e.target.value)}
                    >
                      <option value="all">Все магазины</option>
                      {visibleStores(role).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>
                )}
              </div>
              <div className="task-filters">
                <label className="inline-search">
                  <Search size={15} />
                  <input
                    aria-label="Поиск задач"
                    placeholder="Задача или ответственный"
                    value={taskQuery}
                    onChange={(e) => setTaskQuery(e.target.value)}
                  />
                </label>
                <div className="filter-chips">
                  <button
                    className={taskFilter === "all" ? "selected" : ""}
                    onClick={() => setTaskFilter("all")}
                  >
                    Все задачи
                  </button>
                  <button
                    className={taskFilter === "priority" ? "selected" : ""}
                    onClick={() => setTaskFilter("priority")}
                  >
                    Приоритетные
                  </button>
                </div>
                {(taskQuery || taskFilter !== "all") && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setTaskQuery("");
                      setTaskFilter("all");
                    }}
                  >
                    Сбросить
                  </button>
                )}
              </div>
              {!filteredTasks.length && (
                <Empty
                  title="Задачи не найдены"
                  description="Измените поиск или покажите все задачи."
                  actionLabel="Показать все задачи"
                  onAction={() => {
                    setTaskQuery("");
                    setTaskFilter("all");
                  }}
                />
              )}
              <div className="kanban task-list-view">
                {(["todo", "doing", "done"] as const).map((status) => (
                  <section key={status} className={"kanban-column " + status}>
                    <div className="kanban-heading">
                      <h2>
                        <i />
                        {taskLabels[status]}
                      </h2>
                      <span>
                        {
                          filteredTasks.filter((t) => t.status === status)
                            .length
                        }
                      </span>
                    </div>
                    {filteredTasks
                      .filter((t) => t.status === status)
                      .map((t) => (
                        <article className="card task-card" key={t.id}>
                          <div className="task-card-tags">
                            <Badge
                              color={
                                t.priority === "high" ? "orange" : "neutral"
                              }
                            >
                              {t.priority === "high"
                                ? "Приоритетная"
                                : "Обычная"}
                            </Badge>
                            <small>
                              {stores.find((s) => s.id === t.storeId)?.name}
                            </small>
                          </div>
                          <h3>{t.title}</h3>
                          <p>{t.description}</p>
                          <div className="task-meta">
                            <span className="tiny-avatar">
                              {t.assignee.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{t.assignee}</span>
                            <span className="task-date">
                              <CalendarDays size={13} />
                              {shortDate(t.due)}
                            </span>
                          </div>
                          <button
                            className={
                              status === "doing"
                                ? "primary-button full-width"
                                : "secondary-button full-width"
                            }
                            onClick={() => changeTaskStatus(t)}
                          >
                            {status === "todo" ? (
                              <>
                                <ArrowRight size={14} />
                                Взять в работу
                              </>
                            ) : status === "doing" ? (
                              <>
                                <Check size={14} />
                                Завершить задачу
                              </>
                            ) : (
                              <>
                                <RefreshCw size={13} />
                                Открыть заново
                              </>
                            )}
                          </button>
                        </article>
                      ))}
                    {!filteredTasks.some((t) => t.status === status) && (
                      <div className="kanban-empty">Здесь пока нет задач</div>
                    )}
                  </section>
                ))}
              </div>
            </>
          )}

          {activePage === "assistant" && (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    Спросите ROMEO{" "}
                    <Sparkles className="inline-spark" size={23} />
                  </h1>
                </div>
                <button className="secondary-button" onClick={clearChat}>
                  <Plus size={16} />
                  Новый диалог
                </button>
              </div>
              {role !== "employee" && (
                <div className="assistant-filters">
                  <span>
                    <ShieldCheck size={15} />
                    Доступ: {roles[role].name.toLowerCase()}
                  </span>
                  <Filters
                    role={role}
                    storeId={storeId}
                    setStoreId={changeStore}
                    period={period}
                    setPeriod={changePeriod}
                    onReset={resetFilters}
                  />
                </div>
              )}
              <section className="card assistant-panel">
                <div className="chat-body">
                  {!messages.length && !thinking ? (
                    <div className="assistant-welcome">
                      <h2>Что хотите узнать?</h2>
                      <div className="suggestion-grid">
                        {(role === "employee"
                          ? [
                              "Как оформить списание?",
                              "Покажи правила списания",
                            ]
                          : [
                              "Какая выручка за октябрь?",
                              "Сравни магазины по прибыли",
                              "Сколько денег осталось?",
                              "Какие заявки на согласовании?",
                            ]
                        ).map((text, i) => (
                          <button key={text} onClick={() => ask(text)}>
                            {i % 2 ? (
                              <Wallet size={17} />
                            ) : (
                              <TrendingUp size={17} />
                            )}
                            <span>{text}</span>
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="messages">
                      {messages.map((m) => (
                        <div key={m.id} className="message-pair">
                          <div className="user-message">
                            <span>{m.question}</span>
                            <span className="avatar small-avatar">
                              {roles[role].initials}
                            </span>
                          </div>
                          <div className="assistant-message">
                            <span className="ai-icon">
                              <Sparkles size={17} />
                            </span>
                            <div>
                              <strong>ROMEO Assistant</strong>
                              <div className="answer-text">{m.text}</div>
                              <div className="answer-source">
                                <Link2 size={13} />
                                {m.source}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {thinking && (
                        <div className="thinking">
                          <Sparkles size={17} />
                          <span>
                            Проверяю показатели
                            <span className="typing-dots">…</span>
                          </span>
                        </div>
                      )}
                      <div ref={messagesEnd} />
                    </div>
                  )}
                </div>
                <form
                  className="chat-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(question);
                  }}
                >
                  <input
                    aria-label="Вопрос помощнику"
                    placeholder={
                      role === "employee"
                        ? "Спросите о рабочей инструкции…"
                        : "Например: сколько заработал магазин за октябрь?"
                    }
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={1000}
                    disabled={thinking}
                  />
                  <button
                    className="send-button"
                    disabled={!question.trim() || thinking}
                    aria-label="Отправить вопрос"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </section>
            </>
          )}

          {activePage === "settings" && (
            <SettingsPage
              key={`${role}:${settingsRevision}`}
              role={role}
              preferences={preferences}
              connections={connections}
              onSave={(value) => {
                setPreferences(value);
                setNotificationsOpen(false);
              }}
              onConnections={setConnections}
              onRole={chooseRole}
              onReset={() => setModal("reset")}
              notify={setToast}
            />
          )}
        </main>
      </div>

      {modal === "roles" && (
        <Modal title="Сменить роль" subtitle="" onClose={closeModal}>
          <div className="role-options">
            {(Object.keys(roles) as Role[]).map((r) => (
              <button
                className={"role-option " + (r === role ? "chosen" : "")}
                key={r}
                onClick={() => chooseRole(r)}
              >
                <span className="avatar">{roles[r].initials}</span>
                <span>
                  <strong>{roles[r].name}</strong>
                  <small>{roles[r].description}</small>
                </span>
                {r === role ? (
                  <CircleCheck size={20} />
                ) : (
                  <ChevronRight size={19} />
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {selectedRequest && (
        <Modal
          title={selectedRequest.title}
          subtitle={
            selectedRequest.id + " · " + shortDate(selectedRequest.date)
          }
          onClose={closeModal}
        >
          <div className="detail-amount">{money(selectedRequest.amount)}</div>
          <Badge
            color={
              selectedRequest.status === "pending"
                ? "orange"
                : selectedRequest.status === "approved"
                  ? "green"
                  : "red"
            }
          >
            {statusLabels[selectedRequest.status]}
          </Badge>
          <dl className="detail-list">
            <div>
              <dt>Магазин</dt>
              <dd>
                {stores.find((s) => s.id === selectedRequest.storeId)?.name}
              </dd>
            </div>
            <div>
              <dt>Автор</dt>
              <dd>{selectedRequest.author}</dd>
            </div>
            <div>
              <dt>Статья</dt>
              <dd>{selectedRequest.category}</dd>
            </div>
          </dl>
          <div className="detail-comment">
            <small>ОБОСНОВАНИЕ</small>
            <p>{selectedRequest.note}</p>
          </div>
          <div className="modal-note">
            <CircleAlert size={16} />
            Одобрение не проводит платёж.
          </div>
          {selectedRequest.status === "pending" && canApprove(role) && (
            <div className="modal-actions">
              <button
                className="secondary-button danger-text"
                onClick={() => approveRequest(selectedRequest.id, "rejected")}
              >
                <X size={16} />
                Отклонить
              </button>
              <button
                className="primary-button"
                onClick={() => approveRequest(selectedRequest.id, "approved")}
              >
                <Check size={16} />
                Согласовать расход
              </button>
            </div>
          )}
        </Modal>
      )}
      {selectedOperation && (
        <OperationModal operation={selectedOperation} onClose={closeModal} />
      )}
      {selectedStore && (
        <Modal
          title={selectedStore.name}
          subtitle={selectedStore.city + " · " + selectedStore.address}
          onClose={closeModal}
          wide
        >
          <div className="store-detail-manager">
            <span>
              <Users size={15} />
              Управляющий: {selectedStore.manager}
            </span>
            <Badge>{periodLabels[period]}</Badge>
          </div>
          <div className="metrics-grid three compact">
            {(() => {
              const t = summarize(selectedDays([selectedStore.id], period));
              return (
                <>
                  <Metric
                    title="Выручка"
                    value={compactMoney(t.revenue)}
                    subtitle={`${number(t.orders)} заказов`}
                    icon={<TrendingUp size={15} />}
                  />
                  <Metric
                    title="Прибыль *"
                    value={compactMoney(t.profit)}
                    subtitle={`маржа ${t.margin.toFixed(1)}%`}
                    icon={<Wallet size={15} />}
                  />
                  <Metric
                    title="Списания"
                    value={money(t.writeoffs)}
                    subtitle="за выбранный период"
                    icon={<FileText size={15} />}
                  />
                </>
              );
            })()}
          </div>
          <RevenueChart rows={selectedDays([selectedStore.id], period)} />
          <div className="modal-note">
            * Предварительный результат до налогов и общесетевых расходов.
          </div>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setModal(null);
                setTaskFilter("all");
                setTaskQuery("");
                navigate("tasks", { storeId: selectedStore.id });
              }}
            >
              Задачи магазина
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setModal(null);
                navigate("finance", {
                  storeId: selectedStore.id,
                  financeTab: "pnl",
                });
              }}
            >
              Открыть финансы <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "new-request" && (
        <Modal
          title="Новая заявка на расход"
          subtitle="Опишите расход и передайте его на согласование."
          protectChanges
          onClose={closeModal}
        >
          <RequestForm
            role={role}
            storeId={storeId}
            onSave={(r) => {
              setRequests((prev) => [r, ...prev]);
              setModal(null);
              setRequestFilter("all");
              setRequestQuery("");
              navigate("finance", {
                financeTab: "requests",
                storeId: ids.includes(r.storeId) ? storeId : r.storeId,
              });
              setToast(
                `Заявка «${r.title}» создана. Её рассмотрит собственник или финансист.`,
              );
            }}
          />
        </Modal>
      )}
      {modal === "new-task" && role !== "employee" && (
        <Modal
          title="Новая задача"
          subtitle="Укажите результат, ответственного и срок."
          protectChanges
          onClose={closeModal}
        >
          <TaskForm
            role={role}
            storeId={storeId}
            onSave={(t) => {
              setTasks((prev) => [t, ...prev]);
              setModal(null);
              setTaskQuery("");
              setTaskFilter("all");
              navigate("tasks", {
                storeId: ids.includes(t.storeId) ? storeId : t.storeId,
              });
              setToast(`Задача назначена: ${t.assignee}`);
            }}
          />
        </Modal>
      )}
      {modal === "reset" && (
        <Modal
          title="Сбросить изменения?"
          subtitle="Созданные заявки, задачи и настройки будут удалены. Исходные данные восстановятся."
          onClose={closeModal}
        >
          <div className="modal-actions">
            <button className="secondary-button" onClick={closeModal}>
              Отмена
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setRequests(initialRequests);
                setTasks(initialTasks);
                setPreferences(defaultPreferences);
                setConnections([]);
                try {
                  Object.keys(roles).forEach((name) =>
                    sessionStorage.removeItem("romeo-settings-draft:" + name),
                  );
                } catch {
                  /* Draft storage is optional. */
                }
                setSettingsRevision((value) => value + 1);
                resetFilters();
                clearChat();
                setModal(null);
                setToast("Исходные данные восстановлены");
              }}
            >
              Восстановить
            </button>
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="Как работать в ROMEO" subtitle="" onClose={closeModal}>
          <div className="help-steps">
            <div>
              <span>01</span>
              <p>
                <strong>Посмотрите результаты сети</strong>Измените период и
                магазин. Все графики и показатели пересчитаются.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Проследите движение денег</strong>Откройте финансы →
                Движение денег → любую операцию.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Согласуйте расход</strong>Создайте заявку или
                рассмотрите готовую. Решение сохранится в браузере.
              </p>
            </div>
            <div>
              <span>04</span>
              <p>
                <strong>Задайте вопрос помощнику</strong>Сравните магазины по
                прибыли, затем смените роль и проверьте доступы.
              </p>
            </div>
          </div>
          <div className="modal-note">
            Данные вымышлены и сохраняются в этом браузере. МойСклад, банки и
            внешняя ИИ-модель не подключены. Помощник использует готовые расчёты
            и шаблоны инструкций. Переключение ролей показывает права доступа,
            без авторизации.
          </div>
          <button className="primary-button full-width" onClick={closeModal}>
            Понятно <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          <span>{toast.message}</span>
          {toast.undo && (
            <button className="undo-button" onClick={toast.undo}>
              <Undo2 size={15} />
              Отменить действие
            </button>
          )}
          <button aria-label="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function OperationModal({
  operation: o,
  onClose,
}: {
  operation: Operation;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Детали операции"
      subtitle={o.id + " · " + shortDate(o.date)}
      onClose={onClose}
    >
      <div
        className={`detail-amount ${o.direction === "in" ? "positive" : ""}`}
      >
        {o.direction === "in" ? "+" : "−"}
        {money(o.amount)}
      </div>
      <h3>{o.title}</h3>
      <dl className="detail-list">
        <div>
          <dt>Магазин</dt>
          <dd>{stores.find((s) => s.id === o.storeId)?.name}</dd>
        </div>
        <div>
          <dt>Статья</dt>
          <dd>{o.category}</dd>
        </div>
        <div>
          <dt>Источник</dt>
          <dd>{o.source}</dd>
        </div>
        <div>
          <dt>Статус проверки</dt>
          <dd>
            <Badge color={o.needsReview ? "orange" : "green"}>
              {o.needsReview ? "Уточнить основание" : "Сопоставлено"}
            </Badge>
          </dd>
        </div>
      </dl>
      <div className="modal-note">
        <FileText size={16} />
        Сводная операция за день.
      </div>
      <button
        className="secondary-button full-width"
        onClick={() =>
          exportCsv("ROMEO-" + o.id + ".csv", [
            ["ДЕМО-ДАННЫЕ"],
            ["ID", "Дата", "Описание", "Статья", "Сумма", "Направление"],
            [
              o.id,
              o.date,
              o.title,
              o.category,
              o.amount,
              o.direction === "in" ? "Поступление" : "Выплата",
            ],
          ])
        }
      >
        <Download size={16} />
        Скачать операцию
      </button>
    </Modal>
  );
}
function RequestForm({
  role,
  storeId,
  onSave,
}: {
  role: Role;
  storeId: string;
  onSave: (r: ExpenseRequest) => void;
}) {
  const allowed = visibleStores(role);
  const [error, setError] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    const amount = Number(form.get("amount"));
    const id = String(form.get("store"));
    if (
      !title ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !allowed.some((s) => s.id === id)
    ) {
      setError("Укажите название расхода, положительную сумму и магазин.");
      (
        e.currentTarget.elements.namedItem("title") as HTMLInputElement
      )?.focus();
      return;
    }
    if (!String(form.get("note")).trim()) {
      setError("Опишите, для чего нужен расход.");
      (
        e.currentTarget.elements.namedItem("note") as HTMLTextAreaElement
      )?.focus();
      return;
    }
    onSave({
      id: "REQ-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      title,
      amount,
      storeId: id,
      category: String(form.get("category")),
      author: roles[role].person,
      date: "2026-11-01",
      status: "pending",
      note: String(form.get("note")).trim(),
    });
  };
  return (
    <form
      onSubmit={submit}
      className="form-layout"
      onChange={() => setError("")}
    >
      <label>
        Название расхода
        <input
          name="title"
          required
          maxLength={120}
          placeholder="Например, обслуживание холодильника"
        />
      </label>
      <div className="form-row">
        <label>
          Сумма, ₸
          <input
            name="amount"
            type="number"
            min="1"
            max="100000000"
            step="1"
            required
            placeholder="85 000"
          />
        </label>
        <label>
          Статья
          <select name="category">
            <option>Материалы</option>
            <option>Обслуживание</option>
            <option>Аренда</option>
            <option>ФОТ</option>
            <option>Прочие расходы</option>
          </select>
        </label>
      </div>
      <label>
        Магазин
        <select
          name="store"
          defaultValue={
            allowed.some((s) => s.id === storeId) ? storeId : allowed[0].id
          }
        >
          {allowed.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.city}
            </option>
          ))}
        </select>
      </label>
      <label>
        Обоснование
        <textarea
          name="note"
          required
          rows={3}
          maxLength={1000}
          placeholder="Для чего нужен расход и какой результат ожидается"
        />
      </label>
      <div className="modal-note">
        Заявку рассмотрит собственник или финансист.
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button full-width" type="submit">
        <Send size={16} />
        Отправить на согласование
      </button>
    </form>
  );
}
function TaskForm({
  role,
  storeId,
  onSave,
}: {
  role: Role;
  storeId: string;
  onSave: (t: Task) => void;
}) {
  const allowed = visibleStores(role);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(
    allowed.some((s) => s.id === storeId) ? storeId : allowed[0].id,
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    if (!title || !allowed.some((s) => s.id === target)) {
      setError("Укажите название задачи и магазин.");
      (
        e.currentTarget.elements.namedItem("title") as HTMLInputElement
      )?.focus();
      return;
    }
    if (!String(form.get("description")).trim()) {
      setError("Опишите ожидаемый результат задачи.");
      (
        e.currentTarget.elements.namedItem("description") as HTMLTextAreaElement
      )?.focus();
      return;
    }
    onSave({
      id: "TASK-" + crypto.randomUUID(),
      title,
      description: String(form.get("description")).trim(),
      storeId: target,
      assignee: String(form.get("assignee")),
      due: String(form.get("due")),
      priority: form.get("priority") === "high" ? "high" : "normal",
      status: "todo",
    });
  };
  return (
    <form
      className="form-layout"
      onSubmit={submit}
      onChange={() => setError("")}
    >
      <label>
        Название задачи
        <input
          name="title"
          required
          maxLength={100}
          placeholder="Что нужно сделать?"
        />
      </label>
      <label>
        Ожидаемый результат
        <textarea
          name="description"
          required
          maxLength={1000}
          rows={3}
          placeholder="Опишите критерий выполнения"
        />
      </label>
      <label>
        Магазин
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {allowed.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label>
          Ответственный
          <select name="assignee" key={target}>
            <option>{stores.find((s) => s.id === target)!.manager}</option>
            {target === "s1" && <option>Меруерт</option>}
            <option>Динара</option>
          </select>
        </label>
        <label>
          Срок
          <input
            name="due"
            type="date"
            required
            defaultValue="2026-11-03"
            min="2026-11-01"
            max="2027-12-31"
          />
        </label>
      </div>
      <label>
        Приоритет
        <select name="priority">
          <option value="normal">Обычный</option>
          <option value="high">Приоритетный</option>
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button full-width" type="submit">
        <Plus size={16} />
        Создать задачу
      </button>
    </form>
  );
}
