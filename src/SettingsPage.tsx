import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flower2,
  Link2,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  Store,
  Unplug,
  Users,
} from "lucide-react";
import {
  canApprove,
  roles,
  selectedDays,
  selectedOperations,
  visibleStores,
  type Role,
} from "./data";
import { Badge, Modal } from "./ui";

export interface Preferences {
  companyName: string;
  notifications: boolean;
  quickStart: boolean;
  timezone: string;
  avatar: string;
}
export const defaultPreferences: Preferences = {
  companyName: "Romeo Flowers",
  notifications: true,
  quickStart: true,
  timezone: "Asia/Almaty",
  avatar: "monogram",
};
export interface DemoConnection {
  storeId: string;
  syncedAt: string;
}
interface Props {
  role: Role;
  preferences: Preferences;
  connections: DemoConnection[];
  onSave: (value: Preferences) => void;
  onConnections: (value: DemoConnection[]) => void;
  onRole: (role: Role) => void;
  onReset: () => void;
  notify: (message: string) => void;
}

export function CompanyAvatar({ type }: { type: string }) {
  return type === "flower" ? (
    <Flower2 size={22} />
  ) : type === "store" ? (
    <Store size={22} />
  ) : (
    <>r.</>
  );
}

export default function SettingsPage({
  role,
  preferences,
  connections,
  onSave,
  onConnections,
  onRole,
  onReset,
  notify,
}: Props) {
  const [tab, setTab] = useState<"general" | "access" | "integrations">(
    "general",
  );
  const draftKey = "romeo-settings-draft:" + role;
  const [draft, setDraft] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (
        saved?.base === JSON.stringify(preferences) &&
        saved.draft &&
        Object.entries(preferences).every(
          ([key, value]) => typeof saved.draft[key] === typeof value,
        )
      )
        return saved.draft as Preferences;
    } catch {
      /* A draft is optional. */
    }
    return preferences;
  });
  const previousPreferences = useRef(JSON.stringify(preferences));
  const [avatarPicker, setAvatarPicker] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const allowed = visibleStores(role);
  const editable = canApprove(role);
  const selected = allowed.find((s) => s.id === connecting);
  const connected = connections.find((c) => c.storeId === connecting);
  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);

  useEffect(() => {
    const fingerprint = JSON.stringify(preferences);
    if (previousPreferences.current !== fingerprint) {
      previousPreferences.current = fingerprint;
      setDraft(preferences);
    }
  }, [preferences]);
  useEffect(() => {
    try {
      if (dirty)
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ base: JSON.stringify(preferences), draft }),
        );
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* Saving the actual preferences is still available. */
    }
  }, [draft, preferences, draftKey, dirty]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!editable) return;
    if (!draft.companyName.trim()) {
      setError("Введите название компании.");
      return;
    }
    const value = { ...draft, companyName: draft.companyName.trim() };
    onSave(value);
    setDraft(value);
    setSaved(true);
    setError("");
    notify("Настройки сохранены. Изменения применены к рабочему пространству.");
    timers.current.push(setTimeout(() => setSaved(false), 2200));
  };
  const synchronize = () => {
    if (!selected || !editable || step > 0) return;
    setStep(1);
    timers.current.push(setTimeout(() => setStep(2), 500));
    timers.current.push(
      setTimeout(() => {
        const entry = {
          storeId: selected.id,
          syncedAt: new Date().toISOString(),
        };
        onConnections([
          ...connections.filter((c) => c.storeId !== selected.id),
          entry,
        ]);
        setStep(3);
        notify(`Источник «${selected.name}» проверен`);
      }, 1200),
    );
  };
  const closeConnection = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setConnecting(null);
    setStep(0);
  };
  const time = (iso: string) =>
    new Date(iso).toLocaleString("ru-RU", {
      timeZone: preferences.timezone,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <div className="page-heading settings-heading">
        <div>
          <h1>Настройки пространства</h1>
        </div>
      </div>
      <div
        className="settings-segments"
        role="tablist"
        aria-label="Настройки пространства"
      >
        <button
          role="tab"
          aria-selected={tab === "general"}
          onClick={() => setTab("general")}
          className={tab === "general" ? "active" : ""}
        >
          Общие настройки
        </button>
        <button
          role="tab"
          aria-selected={tab === "access"}
          onClick={() => setTab("access")}
          className={tab === "access" ? "active" : ""}
        >
          Доступы команды
        </button>
        <button
          role="tab"
          aria-selected={tab === "integrations"}
          onClick={() => setTab("integrations")}
          className={tab === "integrations" ? "active" : ""}
        >
          Интеграции
        </button>
      </div>

      {tab === "general" && (
        <div
          className="general-settings"
          role="tabpanel"
          aria-label="Общие настройки"
        >
          <h2>Общие настройки</h2>
          <div className="company-avatar-picker">
            <span className="company-avatar">
              <CompanyAvatar type={draft.avatar} />
            </span>
            {editable ? (
              <button
                className="secondary-button"
                onClick={() => setAvatarPicker(true)}
              >
                Выбрать аватар
              </button>
            ) : (
              <Badge>Доступ к просмотру</Badge>
            )}
          </div>
          <form className="space-settings-form" onSubmit={save}>
            <label className="space-field">
              Название компании
              <input
                aria-label="Название компании"
                value={draft.companyName}
                readOnly={!editable}
                required
                maxLength={60}
                onChange={(e) => {
                  setDraft({ ...draft, companyName: e.target.value });
                  setError("");
                }}
              />
            </label>
            <div className="setting-switch-row">
              <div>
                <strong>Уведомления о расходах</strong>
                <p>Показывать заявки и задачи в центре уведомлений</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.notifications}
                aria-label="Уведомления о расходах"
                disabled={!editable}
                className={
                  "switch-control " + (draft.notifications ? "on" : "")
                }
                onClick={() =>
                  setDraft({ ...draft, notifications: !draft.notifications })
                }
              >
                <span />
              </button>
            </div>
            <label className="setting-select-row">
              <strong>Часовой пояс</strong>
              <select
                aria-label="Часовой пояс"
                value={draft.timezone}
                disabled={!editable}
                onChange={(e) =>
                  setDraft({ ...draft, timezone: e.target.value })
                }
              >
                <option value="Asia/Almaty">Алматы / Астана · GMT+5</option>
                <option value="Asia/Qyzylorda">Кызылорда · GMT+5</option>
                <option value="UTC">UTC · GMT+0</option>
              </select>
              <small>Время обновления источников.</small>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {editable ? (
              <div className="settings-save-row">
                <span>
                  {dirty
                    ? "Есть несохранённые изменения"
                    : "Все изменения сохранены"}
                </span>
                <button className="primary-button" type="submit">
                  {saved ? <Check size={15} /> : <Save size={15} />}{" "}
                  {saved ? "Сохранено" : "Сохранить настройки"}
                </button>
              </div>
            ) : (
              <p className="settings-note">
                Настройки компании изменяют собственник и финансист. Ваши данные
                доступны в разделе «Доступы команды».
              </p>
            )}
          </form>
          <section className="demo-management">
            <div>
              <h2>Исходные данные</h2>
              <p>Заявки, задачи и настройки сохраняются в этом браузере.</p>
            </div>
            <button className="secondary-button danger-text" onClick={onReset}>
              <RefreshCw size={14} />
              Сбросить изменения
            </button>
          </section>
        </div>
      )}

      {tab === "access" && (
        <div
          className="access-settings"
          role="tabpanel"
          aria-label="Доступы команды"
        >
          <h2>Роли и уровни доступа</h2>
          <p className="settings-section-intro">
            Посмотрите, как меняется интерфейс для каждого участника команды.
          </p>
          <div className="access-role-grid">
            {(Object.keys(roles) as Role[]).map((value) => (
              <section
                className={
                  "card access-role " + (value === role ? "current" : "")
                }
                key={value}
              >
                <div className="access-role-heading">
                  <span className="avatar">{roles[value].initials}</span>
                  <div>
                    <h3>{roles[value].name}</h3>
                    <p>{roles[value].person}</p>
                  </div>
                  {value === role && <Badge color="purple">Ваша роль</Badge>}
                </div>
                <p>{roles[value].description}</p>
                <ul>
                  <li>
                    <Check size={13} />
                    {value === "employee"
                      ? "Свои задачи и инструкции"
                      : value === "manager"
                        ? "Показатели одного магазина"
                        : "Показатели всей сети"}
                  </li>
                  <li>
                    <Check size={13} />
                    {canApprove(value)
                      ? "Согласование расходов"
                      : value === "manager"
                        ? "Создание заявок и задач"
                        : "Работа со своими задачами"}
                  </li>
                  <li>
                    <Check size={13} />
                    Помощник в пределах доступа
                  </li>
                </ul>
                <button
                  className="secondary-button full-width"
                  onClick={() => onRole(value)}
                >
                  <Users size={14} />
                  Посмотреть как {roles[value].name.toLowerCase()}
                  <ChevronRight size={14} />
                </button>
              </section>
            ))}
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div
          className="integration-settings"
          role="tabpanel"
          aria-label="Интеграции"
        >
          <div className="integration-settings-heading">
            <div>
              <h2>Источники данных</h2>
              <p className="settings-section-intro">МойСклад</p>
            </div>
            <Badge color="purple">
              {
                connections.filter((c) =>
                  allowed.some((s) => s.id === c.storeId),
                ).length
              }{" "}
              / {allowed.length}
            </Badge>
          </div>
          <div className="notice">
            <Sparkles size={16} />
            <span>
              МойСклад не подключён. Проверка ниже выполняется на тестовых
              данных.
            </span>
          </div>
          <section className="card">
            <div className="integration-list">
              {allowed.map((store) => {
                const connection = connections.find(
                  (c) => c.storeId === store.id,
                );
                return (
                  <div className="integration-item" key={store.id}>
                    <span className="integration-logo">МС</span>
                    <div>
                      <strong>{store.name}</strong>
                      <small>
                        {store.city} ·{" "}
                        {connection
                          ? `Обновлено ${time(connection.syncedAt)}`
                          : "МойСклад"}
                      </small>
                    </div>
                    <Badge color={connection ? "green" : "neutral"}>
                      {connection ? "Проверено" : "Не подключён"}
                    </Badge>
                    {editable && (
                      <div className="integration-actions">
                        <button
                          className="secondary-button small-button"
                          aria-label={`${connection ? "Обновить" : "Подключить"} ${store.name}`}
                          onClick={() => {
                            setConnecting(store.id);
                            setStep(0);
                          }}
                        >
                          {connection ? (
                            <RefreshCw size={14} />
                          ) : (
                            <Link2 size={14} />
                          )}
                          <span>{connection ? "Обновить" : "Подключить"}</span>
                        </button>
                        {connection && (
                          <button
                            className="icon-button"
                            aria-label={"Отключить " + store.name}
                            onClick={() => setDisconnecting(store.id)}
                          >
                            <Unplug size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {avatarPicker && (
        <Modal
          title="Аватар компании"
          subtitle="Выберите значок для боковой панели."
          onClose={() => setAvatarPicker(false)}
        >
          <div className="avatar-options">
            {[
              { id: "monogram", label: "Монограмма" },
              { id: "flower", label: "Цветок" },
              { id: "store", label: "Магазин" },
            ].map((option) => (
              <button
                key={option.id}
                className={draft.avatar === option.id ? "selected" : ""}
                onClick={() => {
                  setDraft({ ...draft, avatar: option.id });
                  setAvatarPicker(false);
                }}
              >
                <span className="company-avatar">
                  <CompanyAvatar type={option.id} />
                </span>
                {option.label}
                {draft.avatar === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {selected && (
        <Modal
          title={connected ? "Повторная проверка" : "Проверка источника"}
          subtitle={`${selected.name} · ${selected.city}`}
          onClose={closeConnection}
        >
          <div className="connection-steps">
            {[
              "Проверка доступа",
              "Сверка продаж и денежных операций",
              "Данные готовы к просмотру",
            ].map((label, index) => (
              <div className={step > index ? "complete" : ""} key={label}>
                {step > index ? (
                  <CircleCheck size={19} />
                ) : step === index && step > 0 ? (
                  <LoaderCircle size={19} className="spin" />
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
          {step === 3 && (
            <div className="sync-result">
              <CheckCheck size={23} />
              <div>
                <strong>Проверка завершена</strong>
                <p>
                  {selectedDays([selected.id], "quarter").length} дней продаж ·{" "}
                  {selectedOperations([selected.id], "quarter").length} денежных
                  операций
                </p>
                <small>
                  <Clock3 size={12} />
                  {time(
                    connections.find((c) => c.storeId === selected.id)!
                      .syncedAt,
                  )}
                </small>
              </div>
            </div>
          )}
          <div className="modal-note">
            Проверка сценария без обращения к МойСклад.
          </div>
          <button
            className="primary-button full-width"
            disabled={step === 1 || step === 2}
            onClick={step === 3 ? closeConnection : synchronize}
          >
            {step === 3 ? (
              <>
                <Check size={16} />
                Готово
              </>
            ) : step > 0 ? (
              <>
                <LoaderCircle size={16} className="spin" />
                Проверяем…
              </>
            ) : (
              <>
                <Link2 size={16} />
                {connected ? "Повторить проверку" : "Запустить проверку"}
              </>
            )}
          </button>
        </Modal>
      )}
      {disconnecting && (
        <Modal
          title="Сбросить проверку источника?"
          subtitle="Статус проверки будет сброшен. Данные сохранятся."
          onClose={() => setDisconnecting(null)}
        >
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDisconnecting(null)}
            >
              Отмена
            </button>
            <button
              className="primary-button"
              onClick={() => {
                onConnections(
                  connections.filter((c) => c.storeId !== disconnecting),
                );
                setDisconnecting(null);
                notify("Проверка источника сброшена");
              }}
            >
              Отключить источник
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
