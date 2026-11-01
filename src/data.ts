export type Role = "owner" | "finance" | "manager" | "employee";
export type Page =
  "overview" | "finance" | "stores" | "tasks" | "assistant" | "settings";
export type Period = "month" | "week" | "yesterday" | "quarter";
export interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  base: number;
}
export const stores: Store[] = [
  {
    id: "s1",
    name: "Ботанический",
    city: "Астана",
    address: "пр. Кабанбай батыра, 48",
    manager: "Алия С.",
    base: 640000,
  },
  {
    id: "s2",
    name: "Хан Шатыр",
    city: "Астана",
    address: "пр. Туран, 37",
    manager: "Диана К.",
    base: 530000,
  },
  {
    id: "s3",
    name: "Правый берег",
    city: "Астана",
    address: "ул. Кенесары, 40",
    manager: "Мадина А.",
    base: 380000,
  },
  {
    id: "s4",
    name: "Самал",
    city: "Алматы",
    address: "мкр. Самал-2, 15",
    manager: "Айгерим Т.",
    base: 710000,
  },
  {
    id: "s5",
    name: "Абая",
    city: "Алматы",
    address: "пр. Абая, 109",
    manager: "Дана М.",
    base: 590000,
  },
  {
    id: "s6",
    name: "Mega",
    city: "Алматы",
    address: "ул. Розыбакиева, 247",
    manager: "Аружан Б.",
    base: 490000,
  },
  {
    id: "s7",
    name: "Центральный",
    city: "Шымкент",
    address: "пр. Тауке хана, 18",
    manager: "Сауле Н.",
    base: 360000,
  },
  {
    id: "s8",
    name: "Гоголя",
    city: "Караганда",
    address: "ул. Гоголя, 42",
    manager: "Асем Р.",
    base: 310000,
  },
];
export const roles: Record<
  Role,
  {
    name: string;
    person: string;
    initials: string;
    description: string;
    pages: Page[];
  }
> = {
  owner: {
    name: "Собственник",
    person: "Азат",
    initials: "АЗ",
    description: "Вся сеть и все показатели",
    pages: ["overview", "finance", "stores", "tasks", "assistant", "settings"],
  },
  finance: {
    name: "Финансист",
    person: "Динара",
    initials: "ДИ",
    description: "Финансы и согласование расходов",
    pages: ["overview", "finance", "stores", "tasks", "assistant", "settings"],
  },
  manager: {
    name: "Управляющий",
    person: "Алия",
    initials: "АЛ",
    description: "Магазин «Ботанический»",
    pages: ["overview", "finance", "stores", "tasks", "assistant", "settings"],
  },
  employee: {
    name: "Сотрудник",
    person: "Меруерт",
    initials: "МЕ",
    description: "Свои задачи и инструкции",
    pages: ["tasks", "assistant", "settings"],
  },
};
export const canApprove = (role: Role) =>
  role === "owner" || role === "finance";
export function visibleStores(role: Role) {
  return role === "manager" || role === "employee"
    ? stores.filter((s) => s.id === "s1")
    : stores;
}
export function scopeStores(role: Role, selected: string) {
  return visibleStores(role)
    .filter((s) => selected === "all" || s.id === selected)
    .map((s) => s.id);
}
export interface Daily {
  date: string;
  storeId: string;
  revenue: number;
  orders: number;
  cogs: number;
  writeoffs: number;
  rent: number;
  payroll: number;
  fees: number;
  other: number;
}
export interface Operation {
  id: string;
  date: string;
  storeId: string;
  title: string;
  category: string;
  amount: number;
  direction: "in" | "out";
  source: string;
  needsReview?: boolean;
}
function random(seed: number) {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}
export const days: Daily[] = [];
export const operations: Operation[] = [];
for (let d = 0; d < 92; d++) {
  const date = new Date(Date.UTC(2026, 7, 1 + d));
  const iso = date.toISOString().slice(0, 10);
  const dayOfMonth = date.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(2026, date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  stores.forEach((store, i) => {
    const weekend = [0, 5, 6].includes(date.getUTCDay()) ? 1.22 : 0.91;
    const growth = 1 + d * 0.0024;
    const revenue =
      Math.round(
        (store.base * weekend * growth * (0.72 + random(d * 8 + i) * 0.56)) /
          100,
      ) * 100;
    const orders = Math.round(
      revenue / (17000 + i * 900 + random(d + i * 31) * 6000),
    );
    const cogs = Math.round(revenue * (0.39 + random(d * 9 + i) * 0.08));
    const writeoffs = Math.round(
      cogs * (i === 4 ? 0.105 : 0.025 + random(d + i) * 0.025),
    );
    const rent = Math.round((store.base * 1.15) / daysInMonth);
    const payroll = Math.round((store.base * 3.6) / daysInMonth);
    const fees = Math.round(revenue * 0.018);
    const other = Math.round(revenue * 0.017);
    days.push({
      date: iso,
      storeId: store.id,
      revenue,
      orders,
      cogs,
      writeoffs,
      rent,
      payroll,
      fees,
      other,
    });
    const add = (
      suffix: string,
      title: string,
      category: string,
      amount: number,
      direction: "in" | "out",
      source: string,
      needsReview = false,
    ) =>
      operations.push({
        id: `OP-${d}-${i}-${suffix}`,
        date: iso,
        storeId: store.id,
        title,
        category,
        amount,
        direction,
        source,
        needsReview,
      });
    add(
      "sale",
      `Оплаты покупателей · ${orders} заказов`,
      "Продажи",
      revenue,
      "in",
      "МойСклад",
    );
    add(
      "purchase",
      "Оплата поставщику цветов",
      "Закупки",
      Math.round(cogs * (d % 3 === 0 ? 1.2 : 0.9)),
      "out",
      "Банковская выписка",
    );
    add(
      "fees",
      "Комиссия за приём платежей",
      "Эквайринг",
      fees,
      "out",
      "Банковская выписка",
    );
    if (dayOfMonth === 5)
      add(
        "rent",
        "Аренда магазина",
        "Аренда",
        Math.round(store.base * 1.15),
        "out",
        "Банковская выписка",
      );
    if ([10, 25].includes(dayOfMonth))
      add(
        "payroll",
        "Выплата заработной платы",
        "ФОТ",
        Math.round(store.base * 1.8),
        "out",
        "Банковская выписка",
      );
    if (dayOfMonth % 7 === 0)
      add(
        "other",
        "Упаковка и хозяйственные расходы",
        "Прочие",
        other * 7,
        "out",
        "Касса",
        i === 4 && dayOfMonth === 28,
      );
  });
}
export const periodLabels: Record<Period, string> = {
  month: "Октябрь 2026",
  week: "25–31 октября",
  yesterday: "31 октября",
  quarter: "Август — октябрь",
};
export function periodBounds(period: Period): [string, string] {
  return [
    {
      month: "2026-10-01",
      week: "2026-10-25",
      yesterday: "2026-10-31",
      quarter: "2026-08-01",
    }[period],
    "2026-10-31",
  ];
}
export function selectedDays(ids: string[], period: Period, previous = false) {
  let [start, end] = periodBounds(period);
  if (previous) {
    if (period === "month") {
      start = "2026-09-01";
      end = "2026-09-30";
    } else {
      const length = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
      end = new Date(Date.parse(start) - 86400000).toISOString().slice(0, 10);
      start = new Date(Date.parse(start) - length * 86400000)
        .toISOString()
        .slice(0, 10);
    }
  }
  return days.filter(
    (d) => ids.includes(d.storeId) && d.date >= start && d.date <= end,
  );
}
export function selectedOperations(ids: string[], period: Period) {
  const [start, end] = periodBounds(period);
  return operations
    .filter((o) => ids.includes(o.storeId) && o.date >= start && o.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function summarize(rows: Daily[]) {
  const revenue = rows.reduce((s, d) => s + d.revenue, 0);
  const orders = rows.reduce((s, d) => s + d.orders, 0);
  const cogs = rows.reduce((s, d) => s + d.cogs, 0);
  const writeoffs = rows.reduce((s, d) => s + d.writeoffs, 0);
  const rent = rows.reduce((s, d) => s + d.rent, 0);
  const payroll = rows.reduce((s, d) => s + d.payroll, 0);
  const fees = rows.reduce((s, d) => s + d.fees, 0);
  const other = rows.reduce((s, d) => s + d.other, 0);
  const gross = revenue - cogs;
  const expenses = rent + payroll + fees + other + writeoffs;
  return {
    revenue,
    orders,
    cogs,
    writeoffs,
    rent,
    payroll,
    fees,
    other,
    gross,
    expenses,
    profit: gross - expenses,
    average: orders ? Math.round(revenue / orders) : 0,
    margin: revenue ? ((gross - expenses) / revenue) * 100 : 0,
  };
}
export function cashflow(ids: string[], period: Period) {
  const [start] = periodBounds(period);
  const opening =
    ids.length * 1500000 +
    operations
      .filter((o) => ids.includes(o.storeId) && o.date < start)
      .reduce(
        (sum, o) => sum + (o.direction === "in" ? o.amount : -o.amount),
        0,
      );
  const rows = selectedOperations(ids, period);
  const incoming = rows
    .filter((o) => o.direction === "in")
    .reduce((sum, o) => sum + o.amount, 0);
  const outgoing = rows
    .filter((o) => o.direction === "out")
    .reduce((sum, o) => sum + o.amount, 0);
  return {
    opening,
    incoming,
    outgoing,
    closing: opening + incoming - outgoing,
    net: incoming - outgoing,
  };
}
export function trend(rows: Daily[]) {
  const result = new Map<
    string,
    { date: string; revenue: number; profit: number }
  >();
  rows.forEach((d) => {
    const point = result.get(d.date) ?? { date: d.date, revenue: 0, profit: 0 };
    point.revenue += d.revenue;
    point.profit +=
      d.revenue - d.cogs - d.writeoffs - d.rent - d.payroll - d.fees - d.other;
    result.set(d.date, point);
  });
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}
export function percentChange(current: number, previous: number) {
  return previous ? ((current - previous) / previous) * 100 : null;
}
export const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
  " ₸";
export const compactMoney = (value: number) =>
  Math.abs(value) >= 1000000
    ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
        value / 1000000,
      ) + " млн ₸"
    : money(value);
export const number = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value);
export const shortDate = (date: string) =>
  new Date(date + "T12:00:00Z")
    .toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    })
    .replace(".", "");
export type ExpenseStatus = "pending" | "approved" | "rejected";
export interface ExpenseRequest {
  id: string;
  title: string;
  storeId: string;
  amount: number;
  category: string;
  author: string;
  date: string;
  status: ExpenseStatus;
  note: string;
}
export const initialRequests: ExpenseRequest[] = [
  {
    id: "REQ-1042",
    title: "Сервис холодильной камеры",
    storeId: "s5",
    amount: 125000,
    category: "Обслуживание",
    author: "Дана М.",
    date: "2026-10-31",
    status: "pending",
    note: "Плановая диагностика и замена уплотнителя. Счёт от сервисной компании.",
  },
  {
    id: "REQ-1041",
    title: "Упаковка для новой коллекции",
    storeId: "s1",
    amount: 85000,
    category: "Материалы",
    author: "Алия С.",
    date: "2026-10-31",
    status: "pending",
    note: "Бумага, ленты и коробки на две недели работы.",
  },
  {
    id: "REQ-1040",
    title: "Замена освещения витрины",
    storeId: "s4",
    amount: 48000,
    category: "Обслуживание",
    author: "Айгерим Т.",
    date: "2026-10-30",
    status: "pending",
    note: "Две светодиодные панели и работа мастера.",
  },
  {
    id: "REQ-1039",
    title: "Флористические инструменты",
    storeId: "s1",
    amount: 32000,
    category: "Материалы",
    author: "Алия С.",
    date: "2026-10-29",
    status: "approved",
    note: "Секаторы и ножницы для сотрудников. Ожидает оплаты.",
  },
];
export interface Task {
  id: string;
  title: string;
  description: string;
  storeId: string;
  assignee: string;
  due: string;
  priority: "high" | "normal";
  status: "todo" | "doing" | "done";
}
export const initialTasks: Task[] = [
  {
    id: "TASK-1",
    title: "Разобрать причины списаний",
    description:
      "Проверить списания за октябрь и подготовить корректировку закупок.",
    storeId: "s5",
    assignee: "Дана М.",
    due: "2026-11-02",
    priority: "high",
    status: "todo",
  },
  {
    id: "TASK-2",
    title: "Подготовить инвентаризацию",
    description: "Сверить остатки цветов и упаковки, отметить расхождения.",
    storeId: "s1",
    assignee: "Меруерт",
    due: "2026-11-02",
    priority: "high",
    status: "todo",
  },
  {
    id: "TASK-3",
    title: "Проверить расход без документа",
    description: "Уточнить основание хозяйственного расхода от 28 октября.",
    storeId: "s5",
    assignee: "Динара",
    due: "2026-11-01",
    priority: "high",
    status: "doing",
  },
  {
    id: "TASK-4",
    title: "Обновить витрину к выходным",
    description: "Подготовить букеты новой коллекции по инструкции.",
    storeId: "s1",
    assignee: "Меруерт",
    due: "2026-11-03",
    priority: "normal",
    status: "doing",
  },
  {
    id: "TASK-5",
    title: "Проверить кассовую смену",
    description: "Сопоставить оплаты покупателей и поступления в кассу.",
    storeId: "s4",
    assignee: "Айгерим Т.",
    due: "2026-11-01",
    priority: "normal",
    status: "done",
  },
  {
    id: "TASK-6",
    title: "Ознакомиться с правилами списания",
    description:
      "Изучить инструкцию в разделе «Помощник» и подтвердить ознакомление.",
    storeId: "s1",
    assignee: "Меруерт",
    due: "2026-11-01",
    priority: "normal",
    status: "done",
  },
];
export function accessibleTasks(tasks: Task[], role: Role, ids: string[]) {
  const allowed = visibleStores(role).map((s) => s.id);
  return tasks.filter(
    (t) =>
      allowed.includes(t.storeId) &&
      ids.includes(t.storeId) &&
      (role !== "employee" || t.assignee === "Меруерт"),
  );
}
export function assistantAnswer(
  question: string,
  role: Role,
  ids: string[],
  period: Period,
  requests: ExpenseRequest[],
) {
  const q = question.toLowerCase();
  const authorized = visibleStores(role).map((s) => s.id);
  const safeIds = ids.filter((id) => authorized.includes(id));
  const scope =
    safeIds.length === stores.length
      ? "Вся сеть"
      : stores
          .filter((s) => safeIds.includes(s.id))
          .map((s) => s.name)
          .join(", ");
  const source = `${periodLabels[period]} · ${scope} · продажи и денежные операции`;
  if (
    /инструкц|списать|правил.*списан|регламент|как.*списан|оформ.*списан/.test(
      q,
    )
  )
    return {
      text: "Как оформить списание\n1. Проверьте фактическое количество и состояние товара.\n2. Укажите причину: качество поставки, хранение или истечение срока.\n3. Передайте данные управляющему для проверки.\n4. После подтверждения оформите документ списания в МойСклад.\n\nСогласуйте инструкцию с управляющим.",
      source: "Шаблон инструкции · списание товара",
    };
  if (role === "employee")
    return {
      text: "В роли сотрудника доступны инструкции и ваши задачи. Финансовые показатели доступны собственнику, финансисту и управляющему в пределах его магазина. Попробуйте: «Как оформить списание?»",
      source: "Права роли «Сотрудник»",
    };
  if (
    role === "manager" &&
    /вс[яе] сеть|всех магазин|алматы|самал|абая|mega|шымкент|караганда|хан шатыр|правый берег|гоголя/.test(
      q,
    )
  )
    return {
      text: "В этой роли доступны только данные магазина «Ботанический». Для просмотра всей сети переключитесь на роль собственника или финансиста в профиле.",
      source: "Права роли «Управляющий»",
    };
  const mentioned = stores.filter(
    (s) => q.includes(s.name.toLowerCase()) || q.includes(s.city.toLowerCase()),
  );
  const answerIds = mentioned.length
    ? safeIds.filter((id) => mentioned.some((s) => s.id === id))
    : safeIds;
  if (!answerIds.length)
    return {
      text: "Запрошенный магазин не входит в текущий фильтр. Выберите его в верхней панели или переключитесь на всю сеть.",
      source,
    };
  const effectivePeriod: Period = /вчера/.test(q)
    ? "yesterday"
    : /недел/.test(q)
      ? "week"
      : /октябр/.test(q)
        ? "month"
        : period;
  const total = summarize(selectedDays(answerIds, effectivePeriod));
  const cash = cashflow(answerIds, effectivePeriod);
  const actualSource = `${periodLabels[effectivePeriod]} · ${stores
    .filter((s) => answerIds.includes(s.id))
    .map((s) => s.name)
    .join(", ")}`;
  if (/почему|причин/.test(q))
    return {
      text: `В выбранном периоде списания составляют ${money(total.writeoffs)}, а расходы без себестоимости — ${money(total.expenses)}. Эти суммы влияют на результат.\n\nДанных для подтверждения причин изменения недостаточно: нужно проверить первичные операции и объяснения управляющих. Я не буду выдавать предположение за установленную причину.`,
      source: actualSource,
    };
  if (/сравни|лучши|лидер|больше.*прибыл/.test(q)) {
    const ranking = answerIds
      .map((id) => ({
        store: stores.find((s) => s.id === id)!,
        ...summarize(selectedDays([id], effectivePeriod)),
      }))
      .sort((a, b) => b.profit - a.profit);
    return {
      text:
        "Магазины по управленческой прибыли:\n" +
        ranking
          .map(
            (s, i) =>
              `${i + 1}. ${s.store.name} · ${s.store.city} — ${money(s.profit)}`,
          )
          .join("\n") +
        "\n\nПрибыль предварительная: период не закрыт финансистом.",
      source: actualSource,
    };
  }
  if (/согласован|заявк/.test(q)) {
    const pending = requests.filter(
      (r) => answerIds.includes(r.storeId) && r.status === "pending",
    );
    return {
      text: `Ожидают согласования: ${pending.length} заявки на ${money(pending.reduce((sum, r) => sum + r.amount, 0))}.\n${pending.map((r) => `• ${r.title} — ${money(r.amount)}`).join("\n")}\n\nСогласование не означает оплату и не меняет ДДС.`,
      source: "Текущий реестр заявок · " + scope,
    };
  }
  if (/денег|ддс|деньги|поступлен|выплат/.test(q))
    return {
      text: `Движение денег за выбранный период:\n• На начало: ${money(cash.opening)}\n• Поступления: ${money(cash.incoming)}\n• Выплаты: ${money(cash.outgoing)}\n• На конец: ${money(cash.closing)}\n\nОстаток денег не равен прибыли.`,
      source: actualSource,
    };
  if (/списан/.test(q))
    return {
      text: `Списания: ${money(total.writeoffs)} — ${((total.writeoffs / total.revenue) * 100).toFixed(1)}% выручки.\nПричины нужно проверить по документам списания.`,
      source: actualSource,
    };
  if (/прибыл|заработа|марж/.test(q))
    return {
      text: `Предварительная управленческая прибыль: ${money(total.profit)}.\n\nРасчёт:\nВыручка ${money(total.revenue)}\n− себестоимость ${money(total.cogs)}\n− расходы и списания ${money(total.expenses)}\n\nМаржа: ${total.margin.toFixed(1)}%. Без налогов и общесетевых расходов. Это не чистая прибыль.`,
      source: actualSource,
    };
  if (/расход|потрат/.test(q))
    return {
      text: `Расходы периода, без себестоимости:\n• ФОТ: ${money(total.payroll)}\n• Аренда: ${money(total.rent)}\n• Эквайринг: ${money(total.fees)}\n• Списания: ${money(total.writeoffs)}\n• Прочее: ${money(total.other)}\n\nВсего: ${money(total.expenses)}. Это начисленные расходы P&L, фактические выплаты показаны в ДДС.`,
      source: actualSource,
    };
  if (/выручк|продаж|сводк|чек|заказ/.test(q))
    return {
      text: `За выбранный период:\n• Выручка: ${money(total.revenue)}\n• Заказы: ${number(total.orders)}\n• Средний чек: ${money(total.average)}\n• Валовая прибыль: ${money(total.gross)}\n\nВсе показатели рассчитаны из одного набора данных с учётом фильтров.`,
      source: actualSource,
    };
  return {
    text: "Могу показать выручку, прибыль, расходы, остаток денег, заявки и инструкцию по списанию.\n\nПопробуйте: «Сравни магазины по прибыли» или «Сколько денег осталось?»",
    source: "Доступные расчёты",
  };
}
