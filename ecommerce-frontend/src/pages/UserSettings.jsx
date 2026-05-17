import { useEffect, useState } from "react";
import api from "../api/axios";
import { firstApiError, unwrapUser } from "../utils/store";

function UserSettings() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/user")
      .then((res) => {
        const user = unwrapUser(res.data);
        setProfile({ name: user.name || "", email: user.email || "" });
        localStorage.setItem("user", JSON.stringify(user));
      })
      .catch((err) => setError(firstApiError(err, "Unable to load your settings.")))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSavingProfile(true);
    try {
      const res = await api.put("/user/profile", profile);
      const user = unwrapUser(res.data);
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

  if (loading) return <main className="settings-page"><div className="settings-card">Loading settings...</div></main>;

  return (
    <main className="settings-page">
      <section className="settings-hero">
        <div>
          <p className="eyebrow">Account Center</p>
          <h1>User Settings</h1>
          <p>Update your profile information and change your password securely.</p>
        </div>
      </section>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="settings-grid">
        <form className="settings-card stitch-form" onSubmit={saveProfile}>
          <h2>Profile Information</h2>
          <label>
            <span>Name</span>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Profile"}</button>
        </form>

        <form className="settings-card stitch-form" onSubmit={savePassword}>
          <h2>Change Password</h2>
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
          <button className="btn btn-primary" type="submit" disabled={savingPassword}>{savingPassword ? "Updating..." : "Update Password"}</button>
        </form>
      </div>
    </main>
  );
}

export default UserSettings;
