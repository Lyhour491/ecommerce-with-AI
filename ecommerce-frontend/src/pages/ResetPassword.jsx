import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { firstApiError } from "../utils/store";

function StoreVisual() {
  return (
    <div className="auth-visual">
      <div className="store-scene">
        <span className="spot spot-left" />
        <span className="spot spot-right" />
        <div className="ceiling-line line-one" />
        <div className="ceiling-line line-two" />
        <div className="shelf shelf-left">
          {Array.from({ length: 18 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="shelf shelf-main">
          {Array.from({ length: 42 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
        <div className="shelf shelf-right">
          {Array.from({ length: 18 }).map((_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="auth-visual-copy">
        <h2>Choose a Secure Password</h2>
        <p>
          Ensure your account stays safe by setting a strong, unique password.
        </p>
      </div>
    </div>
  );
}

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [form, setForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token || !email) {
      setError("Reset link is missing email or token. Please request another reset link.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/reset-password", {
        token,
        email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setMessage(res.data.message || "Your password has been successfully reset.");
      setForm({ password: "", password_confirmation: "" });
    } catch (err) {
      setError(firstApiError(err, "Failed to reset password. The link may have expired or is invalid."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <StoreVisual />
        <div className="auth-form-panel">
          <Link to="/" className="auth-brand">
            ProShop
          </Link>
          <div className="auth-heading">
            <h1>Reset password</h1>
            <p>Please enter your new password below.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && (
            <div className="alert alert-success">
              {message} Go to <Link to="/login" style={{ color: "#004eae", textDecoration: "underline" }}>Sign In</Link> page.
            </div>
          )}

          {!token || !email ? (
            <div className="alert alert-error">
              Invalid or missing password reset parameters. Please request a new link from the{" "}
              <Link to="/forgot-password" style={{ color: "#b91c1c", textDecoration: "underline" }}>Forgot Password</Link> page.
            </div>
          ) : (
            <form className="stitch-form" onSubmit={handleSubmit}>
              <label>
                <span>New Password</span>
                <div className="input-with-icon">
                  <b>▣</b>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </label>

              <label>
                <span>Confirm New Password</span>
                <div className="input-with-icon">
                  <b>▣</b>
                  <input
                    type="password"
                    name="password_confirmation"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </label>

              <button className="auth-submit" type="submit" disabled={loading || !!message}>
                {loading ? "Resetting password..." : "Reset Password"}
              </button>
            </form>
          )}

          <p className="auth-switch">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
