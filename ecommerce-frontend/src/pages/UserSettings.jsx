import { useEffect, useState } from "react";
import api from "../api/axios";
import { firstApiError, unwrapUser } from "../utils/store";

function UserSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    zip_code: "",
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
  const [twoFactor, setTwoFactor] = useState(false);
  const [rawUser, setRawUser] = useState(null);

  useEffect(() => {
    api.get("/user")
      .then((res) => {
        const user = unwrapUser(res.data);
        setRawUser(user);
        
        // Split name into first and last name
        const nameParts = (user.name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        setProfile({
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
          phone: user.phone || "",
          country: user.country || "",
          city: user.city || "",
          zip_code: user.zip_code || "",
          avatar: user.avatar || "",
        });
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

  const saveProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSavingProfile(true);

    const mergedName = `${profile.first_name} ${profile.last_name}`.trim();

    try {
      const res = await api.put("/user/profile", {
        name: mergedName,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
        city: profile.city,
        zip_code: profile.zip_code,
        avatar: profile.avatar,
      });
      const user = unwrapUser(res.data);
      setRawUser(user);
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

  if (loading) return <main className="settings-page"><div className="loading">Loading settings...</div></main>;

  const userInitials = `${profile.first_name[0] || ""}${profile.last_name[0] || ""}`.toUpperCase() || "U";

  return (
    <main className="container" style={{ maxWidth: 1000 }}>
      <section className="settings-hero">
        {profile.avatar ? (
          <img src={profile.avatar} alt="Avatar" className="settings-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <div className="settings-avatar">{userInitials}</div>
        )}
        <div>
          <span className="settings-kicker">Account Center</span>
          <h2>Account Settings</h2>
          <p>Update your personal details, secure your credentials, and view your seller status.</p>
        </div>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="product-tabs-row" style={{ marginBottom: 24 }}>
        <div className="product-tabs">
          <button className={activeTab === "profile" ? "active" : ""} onClick={() => { setActiveTab("profile"); setMessage(""); setError(""); }}>Profile</button>
          <button className={activeTab === "password" ? "active" : ""} onClick={() => { setActiveTab("password"); setMessage(""); setError(""); }}>Password</button>
          <button className={activeTab === "security" ? "active" : ""} onClick={() => { setActiveTab("security"); setMessage(""); setError(""); }}>Security</button>
          <button className={activeTab === "seller" ? "active" : ""} onClick={() => { setActiveTab("seller"); setMessage(""); setError(""); }}>Seller Info</button>
        </div>
      </div>

      <div className="settings-content">
        {activeTab === "profile" && (
          <div className="settings-grid" style={{ gridTemplateColumns: "250px 1fr" }}>
            <div className="settings-card stitch-form" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3>Profile Picture</h3>
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar Preview" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} />
              ) : (
                <div style={{ width: 120, height: 120, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #3568d4, #7c3aed)", color: "white", fontSize: 40, fontWeight: 900 }}>{userInitials}</div>
              )}
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                <label className="btn btn-ghost" style={{ cursor: "pointer", display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                  Change Avatar
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </label>
                {profile.avatar && (
                  <button className="btn btn-danger" type="button" onClick={deleteAvatar}>Delete Photo</button>
                )}
              </div>
            </div>

            <form className="settings-card stitch-form" onSubmit={saveProfile}>
              <h3>Personal Information</h3>
              <div className="settings-form-grid">
                <label className="wide">
                  <span>First Name</span>
                  <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} required />
                </label>
                <label className="wide">
                  <span>Last Name</span>
                  <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} required />
                </label>
              </div>
              <div className="settings-form-grid">
                <label className="wide">
                  <span>Email</span>
                  <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
                </label>
                <label className="wide">
                  <span>Phone Number</span>
                  <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 019-2834" />
                </label>
              </div>
              <div className="settings-form-grid">
                <label>
                  <span>Country</span>
                  <input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="United States" />
                </label>
                <label>
                  <span>City</span>
                  <input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="San Francisco" />
                </label>
                <label>
                  <span>ZIP Code</span>
                  <input value={profile.zip_code} onChange={(e) => setProfile({ ...profile, zip_code: e.target.value })} placeholder="94103" />
                </label>
              </div>
              <div style={{ textAlign: "right" }}>
                <button className="btn btn-primary" type="submit" disabled={savingProfile}>{savingProfile ? "Saving Changes..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "password" && (
          <form className="settings-card stitch-form" style={{ maxWidth: 600, margin: "0 auto" }} onSubmit={savePassword}>
            <h3>Account Security</h3>
            <p className="page-subtitle" style={{ fontSize: 14 }}>Update your password regularly to keep your account safe.</p>
            <label>
              <span>Current Password</span>
              <input type="password" value={passwords.current_password} onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })} required />
            </label>
            <label>
              <span>New Password</span>
              <input type="password" value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} required minLength={6} />
            </label>
            <label>
              <span>Confirm New Password</span>
              <input type="password" value={passwords.password_confirmation} onChange={(e) => setPasswords({ ...passwords, password_confirmation: e.target.value })} required minLength={6} />
            </label>
            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={savingPassword}>{savingPassword ? "Updating Password..." : "Save Changes"}</button>
            </div>
          </form>
        )}

        {activeTab === "security" && (
          <div className="settings-card" style={{ maxWidth: 800, margin: "0 auto" }}>
            <h3>Security Settings</h3>
            
            <div className="settings-toggles">
              <div className={`toggle-row ${twoFactor ? "active" : ""}`} onClick={() => setTwoFactor(!twoFactor)}>
                <span>Two-Factor Authentication (2FA)</span>
                <b>{twoFactor ? "Enabled" : "Disabled"}</b>
              </div>
              <div className="toggle-row">
                <span>Login Notifications</span>
                <b>Enabled</b>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h4>Active Login Sessions</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>Browser / Device</th>
                    <th style={{ padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>IP Address</th>
                    <th style={{ padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>Location</th>
                    <th style={{ padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 0", fontWeight: 700 }}>Chrome (Windows 11)</td>
                    <td style={{ padding: "12px 0" }}>192.168.1.45</td>
                    <td style={{ padding: "12px 0" }}>San Francisco, CA</td>
                    <td style={{ padding: "12px 0" }}><span className="status completed" style={{ fontSize: 11 }}>Active Session</span></td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px 0", fontWeight: 700 }}>Safari (iPhone 15)</td>
                    <td style={{ padding: "12px 0" }}>203.0.113.88</td>
                    <td style={{ padding: "12px 0" }}>California, USA</td>
                    <td style={{ padding: "12px 0" }}><span className="status pending" style={{ fontSize: 11 }}>3 hours ago</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "seller" && (
          <div className="settings-card" style={{ maxWidth: 800, margin: "0 auto" }}>
            <h3>Seller Profile Information</h3>
            {rawUser?.seller_status ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: "var(--muted)", marginBottom: 20 }}>You have not submitted a seller application yet.</p>
                <a className="btn btn-primary" href="/become-seller">Apply to become a Seller</a>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default UserSettings;
