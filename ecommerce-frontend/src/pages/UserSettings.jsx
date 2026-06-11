import { useEffect, useState } from "react";
import api from "../api/axios";
import { firstApiError, unwrapUser } from "../utils/store";
import {
  User,
  Mail,
  Phone,
  LockKeyhole,
  MapPin,
  CreditCard,
  Bell,
  Store,
  Plus,
  Pencil,
  Trash2,
  X
} from "lucide-react";

function UserSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });
  
  // Kept loaded profile to reset
  const [initialProfile, setInitialProfile] = useState({
    name: "",
    email: "",
    phone: "",
    avatar: "",
  });

  const [passwords, setPasswords] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rawUser, setRawUser] = useState(null);

  // Addresses state
  const [addresses, setAddresses] = useState(() => {
    const saved = localStorage.getItem("settings_addresses");
    return saved ? JSON.parse(saved) : [
      { id: 1, type: "home", title: "Home Address", name: "John Doe", phone: "+1 (555) 019-2834", line1: "123 Market St", line2: "Apt 4B", city: "San Francisco", state: "CA", zip: "94103", country: "United States", isDefault: true },
      { id: 2, type: "work", title: "Work Office", name: "John Doe", phone: "+1 (555) 019-5821", line1: "500 Howard St", line2: "Floor 3", city: "San Francisco", state: "CA", zip: "94105", country: "United States", isDefault: false }
    ];
  });

  // Cards state
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem("settings_cards");
    return saved ? JSON.parse(saved) : [
      { id: 1, type: "visa", brand: "Visa", name: "John Doe", number: "•••• •••• •••• 4242", exp: "12/26", isDefault: true },
      { id: 2, type: "mastercard", brand: "Mastercard", name: "John Doe", number: "•••• •••• •••• 5555", exp: "08/28", isDefault: false }
    ];
  });

  // Alerts state
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem("settings_alerts");
    return saved ? JSON.parse(saved) : {
      orderUpdates: true,
      promotions: false,
      newProducts: true,
      priceDrops: false,
      newsletter: true
    };
  });

  // 2FA state
  const [twoFactor, setTwoFactor] = useState(() => {
    return localStorage.getItem("settings_2fa") === "true";
  });

  // Modals state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: "home",
    title: "",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    isDefault: false
  });

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({
    brand: "Visa",
    name: "",
    number: "",
    exp: "",
    isDefault: false
  });

  // Persistence effects
  useEffect(() => {
    localStorage.setItem("settings_addresses", JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem("settings_cards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem("settings_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("settings_2fa", twoFactor.toString());
  }, [twoFactor]);

  // Load user from backend
  useEffect(() => {
    api.get("/user")
      .then((res) => {
        const user = unwrapUser(res.data);
        setRawUser(user);
        
        const loadedProfile = {
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          avatar: user.avatar || "",
        };

        setProfile(loadedProfile);
        setInitialProfile(loadedProfile);
        localStorage.setItem("user", JSON.stringify(user));
      })
      .catch((err) => setError(firstApiError(err, "Unable to load your settings.")))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const deleteAvatar = () => {
    setProfile((prev) => ({ ...prev, avatar: "" }));
  };

  const resetProfile = () => {
    setProfile({ ...initialProfile });
    setMessage("Profile form reset.");
    setError("");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSavingProfile(true);

    try {
      const res = await api.put("/user/profile", {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        country: rawUser?.country || "",
        city: rawUser?.city || "",
        zip_code: rawUser?.zip_code || "",
        avatar: profile.avatar,
      });
      const user = unwrapUser(res.data);
      setRawUser(user);
      
      const savedProfile = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
      };

      setProfile(savedProfile);
      setInitialProfile(savedProfile);
      localStorage.setItem("user", JSON.stringify(user));
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(firstApiError(err, "Profile update failed."));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSavingPassword(true);
    try {
      await api.put("/user/password", passwords);
      setPasswords({ current_password: "", password: "", password_confirmation: "" });
      setMessage("Password updated successfully.");
    } catch (err) {
      setError(firstApiError(err, "Password update failed."));
    } finally {
      setSavingPassword(false);
    }
  };

  // Address CRUD
  const openAddressModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({ ...address });
    } else {
      setEditingAddress(null);
      setAddressForm({
        type: "home",
        title: "",
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
        isDefault: false
      });
    }
    setAddressModalOpen(true);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (editingAddress) {
      setAddresses(prev => {
        let updated = prev.map(addr => addr.id === editingAddress.id ? { ...addressForm } : addr);
        if (addressForm.isDefault) {
          updated = updated.map(addr => addr.id === editingAddress.id ? addr : { ...addr, isDefault: false });
        }
        return updated;
      });
    } else {
      const newId = addresses.length > 0 ? Math.max(...addresses.map(a => a.id)) + 1 : 1;
      setAddresses(prev => {
        let updated = [...prev, { ...addressForm, id: newId }];
        if (addressForm.isDefault) {
          updated = updated.map(addr => addr.id === newId ? addr : { ...addr, isDefault: false });
        }
        return updated;
      });
    }
    setAddressModalOpen(false);
    setMessage(editingAddress ? "Address updated successfully." : "Address added successfully.");
  };

  const handleDeleteAddress = (id) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      const isDefault = addresses.find(addr => addr.id === id)?.isDefault;
      setAddresses(prev => {
        let filtered = prev.filter(addr => addr.id !== id);
        if (isDefault && filtered.length > 0) {
          filtered[0].isDefault = true;
        }
        return filtered;
      });
      setMessage("Address deleted successfully.");
    }
  };

  const handleSetDefaultAddress = (id) => {
    setAddresses(prev => prev.map(addr => ({ ...addr, isDefault: addr.id === id })));
    setMessage("Default address updated.");
  };

  // Card CRUD
  const openCardModal = (card = null) => {
    if (card) {
      setEditingCard(card);
      setCardForm({ ...card });
    } else {
      setEditingCard(null);
      setCardForm({
        brand: "Visa",
        name: "",
        number: "",
        exp: "",
        isDefault: false
      });
    }
    setCardModalOpen(true);
  };

  const handleSaveCard = (e) => {
    e.preventDefault();
    let formattedNum = cardForm.number;
    if (!formattedNum.startsWith("••••")) {
      formattedNum = "•••• •••• •••• " + formattedNum.replace(/\s+/g, "").slice(-4);
    }
    const updatedForm = { ...cardForm, number: formattedNum };

    if (editingCard) {
      setCards(prev => {
        let updated = prev.map(c => c.id === editingCard.id ? { ...updatedForm } : c);
        if (cardForm.isDefault) {
          updated = updated.map(c => c.id === editingCard.id ? c : { ...c, isDefault: false });
        }
        return updated;
      });
    } else {
      const newId = cards.length > 0 ? Math.max(...cards.map(c => c.id)) + 1 : 1;
      setCards(prev => {
        let updated = [...prev, { ...updatedForm, id: newId }];
        if (cardForm.isDefault) {
          updated = updated.map(c => c.id === newId ? c : { ...c, isDefault: false });
        }
        return updated;
      });
    }
    setCardModalOpen(false);
    setMessage(editingCard ? "Card updated successfully." : "Card added successfully.");
  };

  const handleDeleteCard = (id) => {
    if (window.confirm("Are you sure you want to delete this payment card?")) {
      const isDefault = cards.find(c => c.id === id)?.isDefault;
      setCards(prev => {
        let filtered = prev.filter(c => c.id !== id);
        if (isDefault && filtered.length > 0) {
          filtered[0].isDefault = true;
        }
        return filtered;
      });
      setMessage("Card deleted successfully.");
    }
  };

  const handleSetDefaultCard = (id) => {
    setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === id })));
    setMessage("Default payment card updated.");
  };

  const toggleAlert = (key) => {
    setAlerts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <main className="settings-page"><div className="loading">Loading settings...</div></main>;

  const nameParts = (profile.name || "").trim().split(/\s+/);
  const userInitials = (nameParts.length > 1
    ? `${nameParts[0][0] || ""}${nameParts[nameParts.length - 1][0] || ""}`
    : `${nameParts[0]?.[0] || "U"}`
  ).toUpperCase();

  return (
    <main className="container" style={{ maxWidth: 1000, padding: "24px 16px" }}>
      <section className="settings-hero">
        {profile.avatar ? (
          <img src={profile.avatar} alt="Avatar" className="settings-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <div className="settings-avatar">{userInitials}</div>
        )}
        <div>
          <span className="settings-kicker">Account Center</span>
          <h2>Account Settings</h2>
          <p>Update your personal details, shipping addresses, payment methods, and notification alerts.</p>
        </div>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="product-tabs-row" style={{ marginBottom: 24 }}>
        <div className="product-tabs">
          <button className={activeTab === "profile" ? "active" : ""} onClick={() => { setActiveTab("profile"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} /> Profile
          </button>
          <button className={activeTab === "addresses" ? "active" : ""} onClick={() => { setActiveTab("addresses"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} /> Addresses
          </button>
          <button className={activeTab === "payment" ? "active" : ""} onClick={() => { setActiveTab("payment"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={18} /> Payment
          </button>
          <button className={activeTab === "alerts" ? "active" : ""} onClick={() => { setActiveTab("alerts"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={18} /> Alerts
          </button>
          <button className={activeTab === "security" ? "active" : ""} onClick={() => { setActiveTab("security"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LockKeyhole size={18} /> Security
          </button>
          {rawUser?.seller_status && (
            <button className={activeTab === "seller" ? "active" : ""} onClick={() => { setActiveTab("seller"); setMessage(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Store size={18} /> Seller Info
            </button>
          )}
        </div>
      </div>

      <div className="settings-content">
        {activeTab === "profile" && (
          <div className="settings-grid" style={{ gridTemplateColumns: "250px 1fr" }}>
            {/* Avatar Card */}
            <div className="settings-pane-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
              <h3>Profile Picture</h3>
              <div style={{ position: "relative", width: 120, height: 120 }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar Preview" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #3568d4, #7c3aed)", color: "white", fontSize: 40, fontWeight: 900 }}>{userInitials}</div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                <label className="btn btn-ghost" style={{ cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center", padding: "8px 16px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                  Change Avatar
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </label>
                {profile.avatar && (
                  <button className="btn btn-danger" type="button" onClick={deleteAvatar} style={{ padding: "8px 16px", borderRadius: 8 }}>Delete Photo</button>
                )}
              </div>
            </div>

            {/* Personal Info Card */}
            <form className="settings-pane-card" onSubmit={saveProfile}>
              <h3>Personal Information</h3>
              <div style={{ display: "grid", gap: 20 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>Full Name</span>
                  <div className="settings-input-with-icon">
                    <User className="settings-input-icon" size={18} />
                    <input 
                      value={profile.name} 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                      required 
                    />
                  </div>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>Email Address</span>
                    <div className="settings-input-with-icon">
                      <Mail className="settings-input-icon" size={18} />
                      <input 
                        type="email" 
                        value={profile.email} 
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })} 
                        required 
                      />
                    </div>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>Phone Number</span>
                    <div className="settings-input-with-icon">
                      <Phone className="settings-input-icon" size={18} />
                      <input 
                        value={profile.phone} 
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })} 
                        placeholder="+1 (555) 019-2834" 
                      />
                    </div>
                  </label>
                </div>

                <div className="settings-btn-row">
                  <button className="btn btn-ghost" type="button" onClick={resetProfile} style={{ border: "1px solid #cbd5e1" }}>
                    Reset
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {activeTab === "addresses" && (
          <div className="settings-pane-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3>Saved Addresses</h3>
              <button className="btn btn-primary" type="button" onClick={() => openAddressModal()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} /> Add New Address
              </button>
            </div>

            <div className="settings-address-list">
              {addresses.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>No saved addresses. Add one to get started!</p>
              ) : (
                addresses.map((address) => (
                  <div key={address.id} className="settings-item-card">
                    <div className="settings-item-left">
                      <div className="settings-card-logo-box">
                        <MapPin size={20} />
                      </div>
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">
                          {address.title}
                          {address.isDefault && <span className="settings-badge-default">default</span>}
                        </h4>
                        <p className="settings-item-desc">
                          {address.name} | {address.phone}
                        </p>
                        <p className="settings-item-desc">
                          {address.line1}, {address.line2 ? `${address.line2}, ` : ""}{address.city}, {address.state} {address.zip}, {address.country}
                        </p>
                      </div>
                    </div>
                    <div className="settings-item-actions">
                      {!address.isDefault && (
                        <button className="btn btn-ghost" type="button" onClick={() => handleSetDefaultAddress(address.id)} style={{ fontSize: 12, padding: "4px 8px" }}>
                          Set Default
                        </button>
                      )}
                      <button className="btn btn-ghost" type="button" onClick={() => openAddressModal(address)} style={{ display: "inline-flex", padding: 8 }}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleDeleteAddress(address.id)} style={{ display: "inline-flex", padding: 8, color: "var(--danger)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "payment" && (
          <div className="settings-pane-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3>Saved Payment Methods</h3>
              <button className="btn btn-primary" type="button" onClick={() => openCardModal()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={16} /> Add Payment Method
              </button>
            </div>

            <div className="settings-card-list">
              {cards.length === 0 ? (
                <p style={{ color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>No saved payment methods. Add one to get started!</p>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className="settings-item-card">
                    <div className="settings-item-left">
                      <div className="settings-card-logo-box">
                        <CreditCard size={20} />
                      </div>
                      <div className="settings-item-info">
                        <h4 className="settings-item-title">
                          {card.brand} Ending in {card.number.slice(-4)}
                          {card.isDefault && <span className="settings-badge-default">default</span>}
                        </h4>
                        <p className="settings-item-desc">
                          {card.name} | Expires {card.exp}
                        </p>
                      </div>
                    </div>
                    <div className="settings-item-actions">
                      {!card.isDefault && (
                        <button className="btn btn-ghost" type="button" onClick={() => handleSetDefaultCard(card.id)} style={{ fontSize: 12, padding: "4px 8px" }}>
                          Set Default
                        </button>
                      )}
                      <button className="btn btn-ghost" type="button" onClick={() => openCardModal(card)} style={{ display: "inline-flex", padding: 8 }}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={() => handleDeleteCard(card.id)} style={{ display: "inline-flex", padding: 8, color: "var(--danger)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="settings-pane-card">
            <h3>Notification Preferences</h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
              Choose which updates you want to receive about your activity, orders, and promotional offers.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              <div className="settings-alert-row">
                <div className="settings-alert-info">
                  <h4>Order Updates</h4>
                  <p>Get notified when your order is placed, shipped, or delivered.</p>
                </div>
                <button 
                  type="button" 
                  className={`settings-toggle-btn ${alerts.orderUpdates ? "enabled" : "disabled"}`}
                  onClick={() => toggleAlert("orderUpdates")}
                >
                  {alerts.orderUpdates ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="settings-alert-row">
                <div className="settings-alert-info">
                  <h4>Promotions & Discounts</h4>
                  <p>Receive coupons, sales alerts, and exclusive offers.</p>
                </div>
                <button 
                  type="button" 
                  className={`settings-toggle-btn ${alerts.promotions ? "enabled" : "disabled"}`}
                  onClick={() => toggleAlert("promotions")}
                >
                  {alerts.promotions ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="settings-alert-row">
                <div className="settings-alert-info">
                  <h4>New Products</h4>
                  <p>Get recommendations when products you might like are added.</p>
                </div>
                <button 
                  type="button" 
                  className={`settings-toggle-btn ${alerts.newProducts ? "enabled" : "disabled"}`}
                  onClick={() => toggleAlert("newProducts")}
                >
                  {alerts.newProducts ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="settings-alert-row">
                <div className="settings-alert-info">
                  <h4>Price Drops</h4>
                  <p>Get notified when items in your wishlist or cart go on sale.</p>
                </div>
                <button 
                  type="button" 
                  className={`settings-toggle-btn ${alerts.priceDrops ? "enabled" : "disabled"}`}
                  onClick={() => toggleAlert("priceDrops")}
                >
                  {alerts.priceDrops ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="settings-alert-row">
                <div className="settings-alert-info">
                  <h4>Weekly Newsletter</h4>
                  <p>A round-up of the best stories, products, and trends of the week.</p>
                </div>
                <button 
                  type="button" 
                  className={`settings-toggle-btn ${alerts.newsletter ? "enabled" : "disabled"}`}
                  onClick={() => toggleAlert("newsletter")}
                >
                  {alerts.newsletter ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Password Form */}
            <form className="settings-pane-card" onSubmit={savePassword}>
              <h3>Change Password</h3>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
                Update your password regularly to keep your account safe.
              </p>

              <div style={{ display: "grid", gap: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>Current Password</span>
                  <div className="settings-input-with-icon">
                    <LockKeyhole className="settings-input-icon" size={18} />
                    <input 
                      type="password" 
                      value={passwords.current_password} 
                      onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} 
                      required 
                    />
                  </div>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>New Password</span>
                  <div className="settings-input-with-icon">
                    <LockKeyhole className="settings-input-icon" size={18} />
                    <input 
                      type="password" 
                      value={passwords.password} 
                      onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} 
                      required 
                      minLength={6} 
                    />
                  </div>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>Confirm New Password</span>
                  <div className="settings-input-with-icon">
                    <LockKeyhole className="settings-input-icon" size={18} />
                    <input 
                      type="password" 
                      value={passwords.password_confirmation} 
                      onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })} 
                      required 
                      minLength={6} 
                    />
                  </div>
                </label>
              </div>

              <div className="settings-btn-row">
                <button 
                  className="btn btn-ghost" 
                  type="button" 
                  onClick={() => setPasswords({ current_password: "", password: "", password_confirmation: "" })}
                  style={{ border: "1px solid #cbd5e1" }}
                >
                  Clear Fields
                </button>
                <button className="btn btn-primary" type="submit" disabled={savingPassword}>
                  {savingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>

            {/* Two Factor Authentication */}
            <div className="settings-pane-card">
              <h3>Advanced Security</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="settings-alert-row" style={{ cursor: "pointer" }} onClick={() => setTwoFactor(!twoFactor)}>
                  <div className="settings-alert-info">
                    <h4>Two-Factor Authentication (2FA)</h4>
                    <p>Require a verification code in addition to your password to sign in.</p>
                  </div>
                  <button 
                    type="button" 
                    className={`settings-toggle-btn ${twoFactor ? "enabled" : "disabled"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTwoFactor(!twoFactor);
                    }}
                  >
                    {twoFactor ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "seller" && rawUser?.seller_status && (
          <div className="settings-pane-card">
            <h3>Seller Profile Information</h3>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <strong>Application Status:</strong>
                {rawUser.seller_status === "approved" && <span className="status completed">Approved Seller</span>}
                {rawUser.seller_status === "pending" && <span className="status pending">Pending Approval</span>}
                {rawUser.seller_status === "rejected" && <span className="status cancelled">Rejected</span>}
              </div>
              
              <div className="settings-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <strong>Shop Name</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.shop_name || "N/A"}</p>
                </div>
                <div>
                  <strong>Primary Category</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.shop_category || "N/A"}</p>
                </div>
              </div>

              <div>
                <strong>Shop Description</strong>
                <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.shop_description || "N/A"}</p>
              </div>

              <div className="settings-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <strong>Tax ID / EIN</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.tax_id || "N/A"}</p>
                </div>
                <div>
                  <strong>Business Phone</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_phone || "N/A"}</p>
                </div>
              </div>

              <div className="settings-grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
                <div>
                  <strong>Business Address</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_address || "N/A"}</p>
                </div>
                <div>
                  <strong>Website</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.website || "N/A"}</p>
                </div>
              </div>

              <div className="settings-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <div>
                  <strong>City</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_city || "N/A"}</p>
                </div>
                <div>
                  <strong>State</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_state || "N/A"}</p>
                </div>
                <div>
                  <strong>ZIP</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_zip || "N/A"}</p>
                </div>
                <div>
                  <strong>Country</strong>
                  <p style={{ margin: "4px 0 16px", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>{rawUser.business_country || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {addressModalOpen && (
        <div className="settings-modal-overlay" onClick={() => setAddressModalOpen(false)}>
          <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingAddress ? "Edit Address" : "Add New Address"}</h3>
              <button className="btn btn-ghost" style={{ padding: 4, display: "inline-flex", cursor: "pointer", border: 0, background: "transparent" }} onClick={() => setAddressModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Address Title</span>
                  <input 
                    value={addressForm.title} 
                    onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })} 
                    placeholder="e.g. Home" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Recipient Name</span>
                  <input 
                    value={addressForm.name} 
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} 
                    placeholder="John Doe" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Phone Number</span>
                  <input 
                    value={addressForm.phone} 
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} 
                    placeholder="+1 (555) 019-2834" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Address Type</span>
                  <select 
                    value={addressForm.type} 
                    onChange={(e) => setAddressForm({ ...addressForm, type: e.target.value })}
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", background: "white" }}
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Address Line 1</span>
                <input 
                  value={addressForm.line1} 
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} 
                  placeholder="Street address, P.O. box" 
                  required 
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Address Line 2 (Optional)</span>
                <input 
                  value={addressForm.line2} 
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })} 
                  placeholder="Apartment, suite, unit, building, floor" 
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>City</span>
                  <input 
                    value={addressForm.city} 
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} 
                    placeholder="San Francisco" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>State / Province</span>
                  <input 
                    value={addressForm.state} 
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} 
                    placeholder="CA" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>ZIP / Postal Code</span>
                  <input 
                    value={addressForm.zip} 
                    onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} 
                    placeholder="94103" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Country</span>
                  <input 
                    value={addressForm.country} 
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} 
                    placeholder="United States" 
                    required 
                    style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                  />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={addressForm.isDefault} 
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} 
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Set as default shipping address</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setAddressModalOpen(false)} style={{ border: "1px solid #cbd5e1" }}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cardModalOpen && (
        <div className="settings-modal-overlay" onClick={() => setCardModalOpen(false)}>
          <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingCard ? "Edit Card" : "Add Payment Method"}</h3>
              <button className="btn btn-ghost" style={{ padding: 4, display: "inline-flex", cursor: "pointer", border: 0, background: "transparent" }} onClick={() => setCardModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCard} style={{ display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Card Brand</span>
                <select 
                  value={cardForm.brand} 
                  onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })}
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", background: "white" }}
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="American Express">American Express</option>
                  <option value="Discover">Discover</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Cardholder Name</span>
                <input 
                  value={cardForm.name} 
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} 
                  placeholder="John Doe" 
                  required 
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Card Number</span>
                <input 
                  value={cardForm.number} 
                  onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })} 
                  placeholder="16-digit card number" 
                  required 
                  maxLength={19}
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>Expiration Date</span>
                <input 
                  value={cardForm.exp} 
                  onChange={(e) => setCardForm({ ...cardForm, exp: e.target.value })} 
                  placeholder="MM/YY" 
                  required 
                  maxLength={5}
                  style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px" }}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input 
                  type="checkbox" 
                  checked={cardForm.isDefault} 
                  onChange={(e) => setCardForm({ ...cardForm, isDefault: e.target.checked })} 
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Set as default payment method</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setCardModalOpen(false)} style={{ border: "1px solid #cbd5e1" }}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default UserSettings;
