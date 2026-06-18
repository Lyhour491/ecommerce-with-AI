import { useEffect, useState } from "react";
import { 
  Store, User, CreditCard, Truck, Bell, Mail, Phone, 
  Globe, Upload, Save, CheckCircle, RotateCcw 
} from "lucide-react";
import api from "../../api/axios";
import { firstApiError, unwrapUser } from "../../utils/store";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rawUser, setRawUser] = useState(null);
  
  const [activeTab, setActiveTab] = useState("store"); // "store" | "business" | "payout" | "shipping" | "alerts"

  // Base profile details (saves to backend)
  const [profileForm, setProfileForm] = useState({
    shop_name: "",
    shop_description: "",
    tax_id: "",
    website: "",
    business_phone: "",
    business_address: "",
    business_country: "United States",
  });

  // Extended merchant configurations (persisted to localStorage)
  const [extendedForm, setExtendedForm] = useState({
    shop_slug: "",
    legal_business_name: "",
    email: "",
    
    // Payout settings
    payout_method: "bank",
    bank_name: "",
    account_name: "",
    account_number: "",
    routing_number: "",
    paypal_email: "",

    // Shipping settings
    free_shipping_threshold: "50",
    processing_time: "1-2",
    standard_shipping_rate: "5.99",
    express_shipping_rate: "12.99",
    return_window: "30",

    // Alerts settings
    new_orders: true,
    low_stock: true,
    customer_messages: true,
    product_reviews: true,
    payment_received: true,
    marketing_emails: false,
  });

  const defaultExtendedForm = {
    shop_slug: "",
    legal_business_name: "",
    email: "",
    payout_method: "bank",
    bank_name: "",
    account_name: "",
    account_number: "",
    routing_number: "",
    paypal_email: "",
    free_shipping_threshold: "50",
    processing_time: "1-2",
    standard_shipping_rate: "5.99",
    express_shipping_rate: "12.99",
    return_window: "30",
    new_orders: true,
    low_stock: true,
    customer_messages: true,
    product_reviews: true,
    payment_received: true,
    marketing_emails: false,
  };

  useEffect(() => {
    api.get("/user")
      .then((res) => {
        const user = unwrapUser(res.data);
        setRawUser(user);
        
        setProfileForm({
          shop_name: user.shop_name || "",
          shop_description: user.shop_description || "",
          tax_id: user.tax_id || "",
          website: user.website || "",
          business_phone: user.business_phone || "",
          business_address: user.business_address || "",
          business_country: user.business_country || "United States",
        });

        setExtendedForm({
          ...defaultExtendedForm,
          ...(user.seller_settings || {}),
          shop_slug: user.seller_settings?.shop_slug || (user.shop_name || "").toLowerCase().replace(/[^a-z0-9]/g, "-"),
          email: user.seller_settings?.email || user.email || "",
          legal_business_name: user.seller_settings?.legal_business_name || user.shop_name || "",
        });
      })
      .catch((err) => setError(firstApiError(err, "Failed to load seller settings.")))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleExtendedChange = (e) => {
    setExtendedForm({ ...extendedForm, [e.target.name]: e.target.value });
  };

  const toggleAlert = (field) => {
    setExtendedForm({ ...extendedForm, [field]: !extendedForm[field] });
  };

  const handleReset = () => {
    if (!confirm("Reset all settings to default values?")) return;
    
    // Reset profile fields to backend values
    if (rawUser) {
      setProfileForm({
        shop_name: rawUser.shop_name || "",
        shop_description: rawUser.shop_description || "",
        tax_id: rawUser.tax_id || "",
        website: rawUser.website || "",
        business_phone: rawUser.business_phone || "",
        business_address: rawUser.business_address || "",
        business_country: rawUser.business_country || "United States",
      });

      const resetExt = {
        ...defaultExtendedForm,
        shop_slug: (rawUser.shop_name || "").toLowerCase().replace(/[^a-z0-9]/g, "-"),
        email: rawUser.email || "",
        legal_business_name: rawUser.shop_name || "",
      };
      setExtendedForm(resetExt);
      setMessage("Settings reset to defaults successfully.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Save primary fields to backend
      const res = await api.put("/user/profile", {
        name: rawUser?.name || "Seller",
        email: rawUser?.email || "",
        ...profileForm,
        seller_settings: extendedForm,
      });
      const user = unwrapUser(res.data);
      setRawUser(user);
      localStorage.setItem("user", JSON.stringify(user));

      setMessage("Settings updated successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="seller-loading">Loading store settings...</div>;

  return (
    <div className="merchant-dashboard">
      {/* Top Header */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Settings</h1>
        </div>
        <div className="merchant-top-actions">
          <span>Seller Account ID: <b>#{rawUser?.id}</b></span>
          <div className="mini-profile">{(rawUser?.name || "S").charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <div className="merchant-content" style={{ maxWidth: 880, margin: "0 auto", padding: "24px 22px" }}>
        
        <div className="settings-header-row">
          <h1>Store Settings</h1>
          <p>Manage your store configuration and preferences</p>
        </div>

        {/* Dynamic Tabs Navigation */}
        <div className="settings-tabs-container">
          <button 
            type="button" 
            className={`settings-tab-btn ${activeTab === "store" ? "active" : ""}`}
            onClick={() => setActiveTab("store")}
          >
            <Store size={15} /> Store
          </button>
          <button 
            type="button" 
            className={`settings-tab-btn ${activeTab === "business" ? "active" : ""}`}
            onClick={() => setActiveTab("business")}
          >
            <User size={15} /> Business
          </button>
          <button 
            type="button" 
            className={`settings-tab-btn ${activeTab === "payout" ? "active" : ""}`}
            onClick={() => setActiveTab("payout")}
          >
            <CreditCard size={15} /> Payout
          </button>
          <button 
            type="button" 
            className={`settings-tab-btn ${activeTab === "shipping" ? "active" : ""}`}
            onClick={() => setActiveTab("shipping")}
          >
            <Truck size={15} /> Shipping
          </button>
          <button 
            type="button" 
            className={`settings-tab-btn ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            <Bell size={15} /> Alerts
          </button>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* TAB 1: Store Information */}
          {activeTab === "store" && (
            <div className="settings-card">
              <h3>Store Information</h3>
              
              {/* Store Logo Upload Area */}
              <div className="logo-upload-section">
                <div className="logo-preview-box">
                  <Store size={28} />
                </div>
                <div className="logo-upload-info">
                  <button type="button" className="btn-upload-logo-action" disabled title="Logo upload is not configured yet">
                    <Upload size={13} /> Upload Logo
                  </button>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Recommended: 400x400px, PNG or JPG</span>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: "grid", gap: 16 }}>
                <label>
                  <span>Store Name</span>
                  <input 
                    name="shop_name" 
                    value={profileForm.shop_name} 
                    onChange={handleProfileChange} 
                    required 
                    placeholder="Enter store display name" 
                  />
                </label>

                <div>
                  <span style={{ display: "block", fontWeight: 700, color: "var(--muted)", fontSize: 14, marginBottom: 7 }}>Store URL</span>
                  <div className="url-prefix-wrapper">
                    <span className="url-prefix-label">marketplace.com/</span>
                    <input 
                      name="shop_slug" 
                      value={extendedForm.shop_slug} 
                      onChange={handleExtendedChange} 
                      required 
                      placeholder="storeurl" 
                    />
                  </div>
                </div>

                <label>
                  <span>Store Description</span>
                  <textarea 
                    name="shop_description" 
                    value={profileForm.shop_description} 
                    onChange={handleProfileChange} 
                    rows={4} 
                    required 
                    placeholder="Describe your store..." 
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label>
                    <span>Email</span>
                    <div className="input-icon-wrapper">
                      <Mail size={16} />
                      <input 
                        name="email" 
                        value={extendedForm.email} 
                        onChange={handleExtendedChange} 
                        required 
                        placeholder="contact@store.com" 
                      />
                    </div>
                  </label>
                  
                  <label>
                    <span>Phone</span>
                    <div className="input-icon-wrapper">
                      <Phone size={16} />
                      <input 
                        name="business_phone" 
                        value={profileForm.business_phone} 
                        onChange={handleProfileChange} 
                        required 
                        placeholder="+1 (555) 123-4567" 
                      />
                    </div>
                  </label>
                </div>

                <label>
                  <span>Website (Optional)</span>
                  <div className="input-icon-wrapper">
                    <Globe size={16} />
                    <input 
                      name="website" 
                      value={profileForm.website} 
                      onChange={handleProfileChange} 
                      placeholder="https://yourstore.com" 
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Business Information */}
          {activeTab === "business" && (
            <div className="settings-card">
              <h3>Business Information</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <label>
                  <span>Legal Business Name</span>
                  <input 
                    name="legal_business_name" 
                    value={extendedForm.legal_business_name} 
                    onChange={handleExtendedChange} 
                    required 
                    placeholder="Acme Corporation" 
                  />
                </label>

                <label>
                  <span>Tax ID / EIN</span>
                  <input 
                    name="tax_id" 
                    value={profileForm.tax_id} 
                    onChange={handleProfileChange} 
                    required 
                    placeholder="12-3456789" 
                  />
                </label>

                <label>
                  <span>Business Address</span>
                  <textarea 
                    name="business_address" 
                    value={profileForm.business_address} 
                    onChange={handleProfileChange} 
                    rows={3} 
                    required 
                    placeholder="123 Corporate Way, Suite 100" 
                  />
                </label>

                <label>
                  <span>Country</span>
                  <select 
                    name="business_country" 
                    value={profileForm.business_country} 
                    onChange={handleProfileChange}
                    required
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                  </select>
                </label>

                {/* Verification Status Card */}
                <div className="verification-status-banner">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <CheckCircle size={22} style={{ color: "#2563eb" }} />
                    <div>
                      <strong style={{ display: "block", fontSize: 14, color: "#1e3a8a", marginBottom: 2 }}>Verification Status</strong>
                      <span style={{ fontSize: 13, color: "#3b82f6" }}>Your business information has been verified</span>
                    </div>
                  </div>
                  <span className="verification-badge">Verified</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Payout Settings */}
          {activeTab === "payout" && (
            <div className="settings-card">
              <h3>Payout Information</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <label>
                  <span>Payout Method</span>
                  <select 
                    name="payout_method" 
                    value={extendedForm.payout_method} 
                    onChange={handleExtendedChange}
                  >
                    <option value="bank">Bank Account Transfer</option>
                    <option value="paypal">PayPal Account</option>
                  </select>
                </label>

                {extendedForm.payout_method === "bank" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <label>
                        <span>Bank Name</span>
                        <input 
                          name="bank_name" 
                          value={extendedForm.bank_name} 
                          onChange={handleExtendedChange} 
                          placeholder="e.g. Chase Bank" 
                        />
                      </label>
                      <label>
                        <span>Account Holder Name</span>
                        <input 
                          name="account_name" 
                          value={extendedForm.account_name} 
                          onChange={handleExtendedChange} 
                          placeholder="Legal Account Name" 
                        />
                      </label>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
                      <label>
                        <span>Account Number / IBAN</span>
                        <input 
                          name="account_number" 
                          value={extendedForm.account_number} 
                          onChange={handleExtendedChange} 
                          placeholder="•••• 4567" 
                        />
                      </label>
                      <label>
                        <span>Routing Number</span>
                        <input 
                          name="routing_number" 
                          value={extendedForm.routing_number} 
                          onChange={handleExtendedChange} 
                          placeholder="Routing code" 
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <label>
                    <span>PayPal Email</span>
                    <div className="input-icon-wrapper">
                      <Mail size={16} />
                      <input 
                        name="paypal_email" 
                        value={extendedForm.paypal_email} 
                        onChange={handleExtendedChange} 
                        placeholder="paypal@yourdomain.com" 
                      />
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Shipping Settings */}
          {activeTab === "shipping" && (
            <div className="settings-card">
              <h3>Shipping Settings</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <label>
                    <span>Free Shipping Threshold ($)</span>
                    <input 
                      type="number"
                      name="free_shipping_threshold" 
                      value={extendedForm.free_shipping_threshold} 
                      onChange={handleExtendedChange} 
                      placeholder="50" 
                    />
                  </label>
                  
                  <label>
                    <span>Processing Time (days)</span>
                    <input 
                      name="processing_time" 
                      value={extendedForm.processing_time} 
                      onChange={handleExtendedChange} 
                      placeholder="1-2" 
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <label>
                    <span>Standard Shipping Rate ($)</span>
                    <input 
                      type="number"
                      step="0.01"
                      name="standard_shipping_rate" 
                      value={extendedForm.standard_shipping_rate} 
                      onChange={handleExtendedChange} 
                      placeholder="5.99" 
                    />
                  </label>
                  
                  <label>
                    <span>Express Shipping Rate ($)</span>
                    <input 
                      type="number"
                      step="0.01"
                      name="express_shipping_rate" 
                      value={extendedForm.express_shipping_rate} 
                      onChange={handleExtendedChange} 
                      placeholder="12.99" 
                    />
                  </label>
                </div>

                <label style={{ maxWidth: "50%" }}>
                  <span>Return Window (days)</span>
                  <input 
                    type="number"
                    name="return_window" 
                    value={extendedForm.return_window} 
                    onChange={handleExtendedChange} 
                    placeholder="30" 
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: Alerts Notification Preferences */}
          {activeTab === "alerts" && (
            <div className="settings-card">
              <h3>Notification Preferences</h3>
              <div className="alerts-list-container">
                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">New Orders</span>
                    <span className="alert-preference-desc">Receive notifications for new orders</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.new_orders ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("new_orders")}
                  >
                    {extendedForm.new_orders ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">Low Stock</span>
                    <span className="alert-preference-desc">Receive notifications for low stock</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.low_stock ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("low_stock")}
                  >
                    {extendedForm.low_stock ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">Customer Messages</span>
                    <span className="alert-preference-desc">Receive notifications for customer messages</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.customer_messages ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("customer_messages")}
                  >
                    {extendedForm.customer_messages ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">Product Reviews</span>
                    <span className="alert-preference-desc">Receive notifications for product reviews</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.product_reviews ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("product_reviews")}
                  >
                    {extendedForm.product_reviews ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">Payment Received</span>
                    <span className="alert-preference-desc">Receive notifications for payment received</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.payment_received ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("payment_received")}
                  >
                    {extendedForm.payment_received ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="alert-preference-row">
                  <div className="alert-preference-left">
                    <span className="alert-preference-title">Marketing Emails</span>
                    <span className="alert-preference-desc">Receive notifications for marketing emails</span>
                  </div>
                  <button 
                    type="button" 
                    className={`btn-toggle-switch ${extendedForm.marketing_emails ? "enabled" : "disabled"}`}
                    onClick={() => toggleAlert("marketing_emails")}
                  >
                    {extendedForm.marketing_emails ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <button 
              type="button" 
              className="btn-cancel-form" 
              onClick={handleReset} 
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 20px", height: 44 }}
            >
              <RotateCcw size={15} /> Reset to Defaults
            </button>
            <button 
              type="submit" 
              className="btn-save-form" 
              disabled={saving}
              style={{ height: 44 }}
            >
              <Save size={16} /> {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
