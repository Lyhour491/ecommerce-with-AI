import { useEffect, useMemo, useState } from "react";
import { Bell, DollarSign, Globe2, Mail, RotateCcw, Save, Shield } from "lucide-react";
import api from "../../api/axios";
import { firstApiError } from "../../utils/store";

const defaultSettings = {
  platform: {
    platform_name: "MarketAI",
    support_email: "support@marketai.com",
    commission_rate: 10,
    currency: "USD",
    minimum_order_amount: 5,
    maximum_order_amount: 10000,
  },
  payments: {
    payout_schedule: "weekly",
    minimum_payout_amount: 50,
    payout_processing_days: 3,
    gateways: {
      stripe: true,
      paypal: true,
    },
  },
  email: {
    smtp_server: "smtp.marketai.com",
    smtp_port: 587,
    smtp_username: "noreply@marketai.com",
    from_email_address: "MarketAI <noreply@marketai.com>",
    order_emails: true,
    marketing_emails: false,
  },
  security: {
    require_2fa: false,
    session_timeout_minutes: 30,
    max_login_attempts: 5,
    minimum_password_length: 8,
    require_strong_passwords: true,
  },
  alerts: {
    new_order: true,
    new_seller: true,
    dispute: true,
    payout: true,
    system_alerts: true,
  },
};

const tabs = [
  { id: "platform", label: "Platform", icon: Globe2 },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "email", label: "Email", icon: Mail },
  { id: "security", label: "Security", icon: Shield },
  { id: "alerts", label: "Alerts", icon: Bell },
];

const currencies = [
  ["USD", "USD - US Dollar"],
  ["KHR", "KHR - Cambodian Riel"],
  ["EUR", "EUR - Euro"],
  ["THB", "THB - Thai Baht"],
];

function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("platform");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeTitle = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label || "Platform", [activeTab]);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/admin/settings");
        setSettings({ ...defaultSettings, ...(res.data?.settings || {}) });
      } catch (err) {
        setError(firstApiError(err, "Failed to load system settings."));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateGroup = (group, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }));
  };

  const updateNested = (group, parent, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [parent]: {
          ...current[group][parent],
          [key]: value,
        },
      },
    }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await api.put("/admin/settings", normalizeSettings(settings));
      setSettings({ ...defaultSettings, ...(res.data?.settings || {}) });
      setMessage(res.data?.message || "System settings saved successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to save system settings."));
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await api.post("/admin/settings/reset");
      setSettings({ ...defaultSettings, ...(res.data?.settings || {}) });
      setMessage(res.data?.message || "System settings reset to defaults.");
    } catch (err) {
      setError(firstApiError(err, "Failed to reset system settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="system-settings-page">
      <div className="system-settings-shell">
        <header className="system-settings-header">
          <h1>System Settings</h1>
          <p>Configure platform-wide settings and preferences</p>
        </header>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="system-settings-tabs" aria-label="System settings sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <form className="system-settings-form" onSubmit={saveSettings}>
          <section className="system-settings-panel" aria-labelledby={`${activeTab}-settings-title`}>
            {loading ? (
              <p className="system-settings-loading">Loading {activeTitle.toLowerCase()} settings...</p>
            ) : (
              <>
                {activeTab === "platform" && (
                  <PlatformPane settings={settings.platform} update={updateGroup} />
                )}
                {activeTab === "payments" && (
                  <PaymentsPane settings={settings.payments} update={updateGroup} updateNested={updateNested} />
                )}
                {activeTab === "email" && (
                  <EmailPane settings={settings.email} update={updateGroup} />
                )}
                {activeTab === "security" && (
                  <SecurityPane settings={settings.security} update={updateGroup} />
                )}
                {activeTab === "alerts" && (
                  <AlertsPane settings={settings.alerts} update={updateGroup} />
                )}
              </>
            )}
          </section>

          <div className="system-settings-actions">
            <button type="button" className="btn-secondary" onClick={resetSettings} disabled={saving || loading}>
              <RotateCcw size={16} /> Reset to Defaults
            </button>
            <button type="submit" className="btn-add-product" disabled={saving || loading}>
              <Save size={16} /> {saving ? "Saving..." : "Save All Settings"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function PlatformPane({ settings, update }) {
  return (
    <>
      <h2 id="platform-settings-title">Platform Configuration</h2>
      <div className="system-settings-grid">
        <Field label="Platform Name">
          <input value={settings.platform_name} onChange={(e) => update("platform", "platform_name", e.target.value)} />
        </Field>
        <Field label="Support Email">
          <input type="email" value={settings.support_email} onChange={(e) => update("platform", "support_email", e.target.value)} />
        </Field>
        <Field label="Commission Rate (%)" hint="Platform commission on all sales" badge={`Current: ${settings.commission_rate || 0}%`}>
          <div className="system-input-suffix">
            <input type="number" min="0" max="100" step="0.1" value={settings.commission_rate} onChange={(e) => update("platform", "commission_rate", e.target.value)} />
            <span>%</span>
          </div>
        </Field>
        <Field label="Currency">
          <select value={settings.currency} onChange={(e) => update("platform", "currency", e.target.value)}>
            {currencies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Minimum Order Amount">
          <input type="number" min="0" step="0.01" value={settings.minimum_order_amount} onChange={(e) => update("platform", "minimum_order_amount", e.target.value)} />
        </Field>
        <Field label="Maximum Order Amount">
          <input type="number" min="0" step="0.01" value={settings.maximum_order_amount} onChange={(e) => update("platform", "maximum_order_amount", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function PaymentsPane({ settings, update, updateNested }) {
  return (
    <>
      <h2 id="payments-settings-title">Payment Settings</h2>
      <div className="system-settings-grid">
        <Field label="Payout Schedule">
          <select value={settings.payout_schedule} onChange={(e) => update("payments", "payout_schedule", e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <Field label="Minimum Payout Amount">
          <input type="number" min="0" step="0.01" value={settings.minimum_payout_amount} onChange={(e) => update("payments", "minimum_payout_amount", e.target.value)} />
        </Field>
        <Field label="Payout Processing Time (days)" hint="Typical processing time for seller payouts" wide>
          <input type="number" min="0" max="60" value={settings.payout_processing_days} onChange={(e) => update("payments", "payout_processing_days", e.target.value)} />
        </Field>
      </div>

      <Divider />
      <h3>Payment Gateways</h3>
      <div className="system-settings-stack">
        <ToggleCard
          title="Stripe"
          description="Credit card processing"
          enabled={settings.gateways.stripe}
          onClick={() => updateNested("payments", "gateways", "stripe", !settings.gateways.stripe)}
        />
        <ToggleCard
          title="PayPal"
          description="PayPal payments"
          enabled={settings.gateways.paypal}
          onClick={() => updateNested("payments", "gateways", "paypal", !settings.gateways.paypal)}
        />
      </div>
    </>
  );
}

function EmailPane({ settings, update }) {
  return (
    <>
      <h2 id="email-settings-title">Email Configuration</h2>
      <div className="system-settings-grid">
        <Field label="SMTP Server">
          <input value={settings.smtp_server} onChange={(e) => update("email", "smtp_server", e.target.value)} />
        </Field>
        <Field label="SMTP Port">
          <input type="number" min="1" max="65535" value={settings.smtp_port} onChange={(e) => update("email", "smtp_port", e.target.value)} />
        </Field>
        <Field label="SMTP Username" wide>
          <input value={settings.smtp_username} onChange={(e) => update("email", "smtp_username", e.target.value)} />
        </Field>
        <Field label="From Email Address" wide>
          <input value={settings.from_email_address} onChange={(e) => update("email", "from_email_address", e.target.value)} />
        </Field>
      </div>

      <Divider />
      <h3>Email Types</h3>
      <div className="system-settings-stack">
        <ToggleCard
          title="Order Emails"
          description="Send order confirmations and updates"
          enabled={settings.order_emails}
          onClick={() => update("email", "order_emails", !settings.order_emails)}
        />
        <ToggleCard
          title="Marketing Emails"
          description="Send promotional and newsletter emails"
          enabled={settings.marketing_emails}
          onClick={() => update("email", "marketing_emails", !settings.marketing_emails)}
        />
      </div>
    </>
  );
}

function SecurityPane({ settings, update }) {
  return (
    <>
      <h2 id="security-settings-title">Security Settings</h2>
      <div className="system-settings-stack">
        <ToggleCard
          title="Require Two-Factor Authentication"
          description="Force all users to enable 2FA"
          enabled={settings.require_2fa}
          onLabel="Required"
          offLabel="Optional"
          onClick={() => update("security", "require_2fa", !settings.require_2fa)}
        />
      </div>

      <div className="system-settings-grid compact">
        <Field label="Session Timeout (minutes)">
          <input type="number" min="5" max="1440" value={settings.session_timeout_minutes} onChange={(e) => update("security", "session_timeout_minutes", e.target.value)} />
        </Field>
        <Field label="Max Login Attempts">
          <input type="number" min="1" max="20" value={settings.max_login_attempts} onChange={(e) => update("security", "max_login_attempts", e.target.value)} />
        </Field>
        <Field label="Minimum Password Length" wide>
          <input type="number" min="6" max="128" value={settings.minimum_password_length} onChange={(e) => update("security", "minimum_password_length", e.target.value)} />
        </Field>
      </div>

      <div className="system-settings-stack">
        <ToggleCard
          title="Require Strong Passwords"
          description="Passwords must include uppercase, lowercase, numbers, and symbols"
          enabled={settings.require_strong_passwords}
          onClick={() => update("security", "require_strong_passwords", !settings.require_strong_passwords)}
        />
      </div>
    </>
  );
}

function AlertsPane({ settings, update }) {
  const alertRows = [
    ["new_order", "New Order"],
    ["new_seller", "New Seller"],
    ["dispute", "Dispute"],
    ["payout", "Payout"],
    ["system_alerts", "System Alerts"],
  ];

  return (
    <>
      <h2 id="alerts-settings-title">Admin Notifications</h2>
      <p className="system-settings-intro">Configure which events trigger admin notifications</p>
      <div className="system-settings-stack">
        {alertRows.map(([key, title]) => (
          <ToggleCard
            key={key}
            title={title}
            description="Get notified when this event occurs"
            enabled={settings[key]}
            onClick={() => update("alerts", key, !settings[key])}
          />
        ))}
      </div>
    </>
  );
}

function Field({ label, hint, badge, wide = false, children }) {
  return (
    <label className={wide ? "system-field wide" : "system-field"}>
      <span>
        {label}
        {badge && <b>{badge}</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function ToggleCard({ title, description, enabled, onClick, onLabel = "Enabled", offLabel = "Disabled" }) {
  return (
    <button type="button" className="system-toggle-card" onClick={onClick}>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <b className={enabled ? "enabled" : ""}>{enabled ? onLabel : offLabel}</b>
    </button>
  );
}

function Divider() {
  return <div className="system-settings-divider" aria-hidden="true" />;
}

function normalizeSettings(settings) {
  return {
    ...settings,
    platform: {
      ...settings.platform,
      commission_rate: Number(settings.platform.commission_rate || 0),
      minimum_order_amount: Number(settings.platform.minimum_order_amount || 0),
      maximum_order_amount: Number(settings.platform.maximum_order_amount || 0),
    },
    payments: {
      ...settings.payments,
      minimum_payout_amount: Number(settings.payments.minimum_payout_amount || 0),
      payout_processing_days: Number(settings.payments.payout_processing_days || 0),
    },
    email: {
      ...settings.email,
      smtp_port: Number(settings.email.smtp_port || 0),
    },
    security: {
      ...settings.security,
      session_timeout_minutes: Number(settings.security.session_timeout_minutes || 0),
      max_login_attempts: Number(settings.security.max_login_attempts || 0),
      minimum_password_length: Number(settings.security.minimum_password_length || 0),
    },
  };
}

export default AdminSettings;
