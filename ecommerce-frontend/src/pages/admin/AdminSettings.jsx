import { useEffect, useMemo, useState } from "react";
import { Bell, CircleHelp, LockKeyhole, Mail, Save, Settings, ShieldCheck, Store, UserRound } from "lucide-react";
import api from "../../api/axios";
import { firstApiError, unwrapUser } from "../../utils/store";

const defaultStoreSettings = {
  storeName: "Mini Ecommerce Store",
  storeEmail: "admin@example.com",
  storePhone: "012345678",
  storeAddress: "Phnom Penh",
  currency: "USD",
  lowStockAlert: "10",
  orderNotifications: true,
  customerNotifications: true,
};

const loadStoreSettings = () => {
  try {
    return { ...defaultStoreSettings, ...(JSON.parse(localStorage.getItem("adminStoreSettings")) || {}) };
  } catch {
    return defaultStoreSettings;
  }
};

function AdminSettings() {
  const [admin, setAdmin] = useState({ name: "Admin", email: "" });
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [storeForm, setStoreForm] = useState(loadStoreSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initials = useMemo(() => (admin?.name || "A").charAt(0).toUpperCase(), [admin?.name]);

  useEffect(() => {
    const loadAdmin = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/user");
        const user = unwrapUser(res.data);
        setAdmin(user);
        setProfileForm({ name: user?.name || "", email: user?.email || "" });
      } catch (err) {
        setError(firstApiError(err, "Failed to load admin profile."));
      } finally {
        setLoading(false);
      }
    };

    loadAdmin();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving("profile");
    setMessage("");
    setError("");

    try {
      const res = await api.put("/user/profile", profileForm);
      const user = unwrapUser(res.data);
      setAdmin(user);
      setProfileForm({ name: user?.name || "", email: user?.email || "" });
      setMessage("Admin profile updated successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to update profile. Check backend route PUT /api/user/profile."));
    } finally {
      setSaving("");
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setSaving("password");
    setMessage("");
    setError("");

    try {
      await api.put("/user/password", passwordForm);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to change password. Check current password and confirmation."));
    } finally {
      setSaving("");
    }
  };

  const saveStoreSettings = (event) => {
    event.preventDefault();
    setSaving("store");
    setMessage("");
    setError("");
    localStorage.setItem("adminStoreSettings", JSON.stringify(storeForm));
    setMessage("Store settings saved successfully.");
    setSaving("");
  };

  return (
    <section className="merchant-dashboard admin-settings-page">
      <header className="merchant-topbar product-like-topbar">
        <h1>Admin Settings</h1>
        <div className="product-like-actions">
          <div className="merchant-top-actions"><Bell size={20} /><CircleHelp size={20} /><strong>{admin?.name || "Admin"}</strong><span className="mini-profile">{initials}</span></div>
        </div>
      </header>

      <div className="merchant-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="page-subtitle">Loading admin settings...</p>}

        <div className="settings-hero merchant-panel">
          <div className="settings-avatar">{initials}</div>
          <div>
            <span className="settings-kicker"><ShieldCheck size={16} /> Store Owner</span>
            <h2>{admin?.name || "Admin"}</h2>
            <p>{admin?.email || "No email found"}</p>
          </div>
        </div>

        <div className="settings-grid">
          <form className="merchant-panel settings-card" onSubmit={saveProfile}>
            <div className="settings-card-head"><UserRound size={22} /><div><h2>Profile Settings</h2><p>Update admin name and login email.</p></div></div>
            <label>Name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required /></label>
            <button className="btn-add-product" type="submit" disabled={saving === "profile"}><Save size={17} /> {saving === "profile" ? "Saving..." : "Save Profile"}</button>
          </form>

          <form className="merchant-panel settings-card" onSubmit={savePassword}>
            <div className="settings-card-head"><LockKeyhole size={22} /><div><h2>Security</h2><p>Change your admin password.</p></div></div>
            <label>Current Password<input type="password" value={passwordForm.current_password} onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })} required /></label>
            <label>New Password<input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} minLength={6} required /></label>
            <label>Confirm Password<input type="password" value={passwordForm.password_confirmation} onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })} minLength={6} required /></label>
            <button className="btn-add-product" type="submit" disabled={saving === "password"}><Save size={17} /> {saving === "password" ? "Saving..." : "Change Password"}</button>
          </form>
        </div>

        <form className="merchant-panel settings-card store-settings-card" onSubmit={saveStoreSettings}>
          <div className="settings-card-head"><Store size={22} /><div><h2>Store Settings</h2><p>Customize dashboard store details and notifications.</p></div></div>
          <div className="settings-form-grid">
            <label>Store Name<input value={storeForm.storeName} onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })} /></label>
            <label>Store Email<input type="email" value={storeForm.storeEmail} onChange={(e) => setStoreForm({ ...storeForm, storeEmail: e.target.value })} /></label>
            <label>Store Phone<input value={storeForm.storePhone} onChange={(e) => setStoreForm({ ...storeForm, storePhone: e.target.value })} /></label>
            <label>Currency<select value={storeForm.currency} onChange={(e) => setStoreForm({ ...storeForm, currency: e.target.value })}><option value="USD">USD</option><option value="KHR">KHR</option></select></label>
            <label>Low Stock Alert<input type="number" min="0" value={storeForm.lowStockAlert} onChange={(e) => setStoreForm({ ...storeForm, lowStockAlert: e.target.value })} /></label>
            <label className="wide">Store Address<input value={storeForm.storeAddress} onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })} /></label>
          </div>

          <div className="settings-toggles">
            <button type="button" className={storeForm.orderNotifications ? "toggle-row active" : "toggle-row"} onClick={() => setStoreForm({ ...storeForm, orderNotifications: !storeForm.orderNotifications })}><Mail size={18} /><span>Order Notifications</span><b>{storeForm.orderNotifications ? "On" : "Off"}</b></button>
            <button type="button" className={storeForm.customerNotifications ? "toggle-row active" : "toggle-row"} onClick={() => setStoreForm({ ...storeForm, customerNotifications: !storeForm.customerNotifications })}><Settings size={18} /><span>Customer Notifications</span><b>{storeForm.customerNotifications ? "On" : "Off"}</b></button>
          </div>

          <button className="btn-add-product" type="submit" disabled={saving === "store"}><Save size={17} /> Save Store Settings</button>
        </form>
      </div>
    </section>
  );
}

export default AdminSettings;
