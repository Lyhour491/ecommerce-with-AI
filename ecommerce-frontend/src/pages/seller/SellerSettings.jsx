import { useEffect, useState } from "react";
import api from "../../api/axios";
import { firstApiError, unwrapUser } from "../../utils/store";
import { Store, Save, ShieldAlert } from "lucide-react";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rawUser, setRawUser] = useState(null);

  const [form, setForm] = useState({
    shop_name: "",
    shop_description: "",
    shop_category: "",
    tax_id: "",
    website: "",
    business_phone: "",
    business_address: "",
    business_city: "",
    business_state: "",
    business_zip: "",
    business_country: "",
  });

  useEffect(() => {
    api.get("/user")
      .then((res) => {
        const user = unwrapUser(res.data);
        setRawUser(user);
        setForm({
          shop_name: user.shop_name || "",
          shop_description: user.shop_description || "",
          shop_category: user.shop_category || "",
          tax_id: user.tax_id || "",
          website: user.website || "",
          business_phone: user.business_phone || "",
          business_address: user.business_address || "",
          business_city: user.business_city || "",
          business_state: user.business_state || "",
          business_zip: user.business_zip || "",
          business_country: user.business_country || "",
        });
      })
      .catch((err) => setError(firstApiError(err, "Failed to load seller settings.")))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await api.put("/user/profile", {
        name: rawUser?.name || "Seller",
        email: rawUser?.email || "",
        ...form
      });
      const user = unwrapUser(res.data);
      setRawUser(user);
      localStorage.setItem("user", JSON.stringify(user));
      setMessage("Store settings updated successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="seller-loading">Loading store settings...</div>;

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Store Settings</h1>
        </div>
        <div className="merchant-top-actions">
          <span>Seller Account ID: <b>#{rawUser?.id}</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content" style={{ maxWidth: 880 }}>
        <div className="merchant-title-row">
          <h1>Merchant Configurations</h1>
          <p>Update your shop profile details, primary categories, and billing specifications.</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Seller Status Card */}
        <div className="card" style={{ background: "white", padding: 20, marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className="metric-icon blue" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Store size={20} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Seller Status</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>Your seller application has been fully validated.</p>
            </div>
          </div>
          <div>
            {rawUser?.seller_status === "approved" && <span className="status completed">Approved Seller</span>}
            {rawUser?.seller_status === "pending" && <span className="status pending">Pending Approval</span>}
            {rawUser?.seller_status === "rejected" && <span className="status cancelled">Rejected</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card stitch-form" style={{ background: "white", padding: 26 }}>
          <h3>Shop Profile</h3>
          
          <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
            <label>
              <span>Shop Display Name *</span>
              <input name="shop_name" value={form.shop_name} onChange={handleChange} required placeholder="e.g. Acme Gadgets" />
            </label>
            <label>
              <span>Primary Category *</span>
              <input name="shop_category" value={form.shop_category} onChange={handleChange} required placeholder="e.g. Electronics, Fashion" />
            </label>
          </div>

          <label style={{ marginTop: 8 }}>
            <span>Shop Description *</span>
            <textarea name="shop_description" value={form.shop_description} onChange={handleChange} rows={3} required placeholder="Describe your store brand, target market, or details..." />
          </label>

          <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginTop: 8 }}>
            <label>
              <span>Tax ID / EIN *</span>
              <input name="tax_id" value={form.tax_id} onChange={handleChange} required placeholder="12-345678" />
            </label>
            <label>
              <span>Store Website</span>
              <input name="website" value={form.website} onChange={handleChange} placeholder="https://www.example.com" />
            </label>
          </div>

          <h3 style={{ marginTop: 28 }}>Business Location Details</h3>
          <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
            <label>
              <span>Business Address *</span>
              <input name="business_address" value={form.business_address} onChange={handleChange} required placeholder="123 Corporate Way" />
            </label>
            <label>
              <span>Business Phone *</span>
              <input name="business_phone" value={form.business_phone} onChange={handleChange} required placeholder="+1 (555) 012-3456" />
            </label>
          </div>

          <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 8 }}>
            <label>
              <span>City *</span>
              <input name="business_city" value={form.business_city} onChange={handleChange} required placeholder="San Francisco" />
            </label>
            <label>
              <span>State / Prov *</span>
              <input name="business_state" value={form.business_state} onChange={handleChange} required placeholder="CA" />
            </label>
            <label>
              <span>ZIP *</span>
              <input name="business_zip" value={form.business_zip} onChange={handleChange} required placeholder="94103" />
            </label>
            <label>
              <span>Country *</span>
              <input name="business_country" value={form.business_country} onChange={handleChange} required placeholder="United States" />
            </label>
          </div>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Save size={18} /> {saving ? "Saving Configurations..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
