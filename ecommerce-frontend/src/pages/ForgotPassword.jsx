import { useState } from "react";
import { Link } from "react-router-dom";
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
        <h2>Reset Your Password</h2>
        <p>
          We'll get you back on track in no time. Check your email for instructions.
        </p>
      </div>
    </div>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await api.post("/forgot-password", { email });
      setMessage(res.data.message || "A password reset link has been sent to your email.");
      setEmail("");
    } catch (err) {
      setError(firstApiError(err, "Failed to send reset link. Make sure the email exists."));
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
            <h1>Forgot password</h1>
            <p>Please enter your email address to request a password reset.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          <form className="stitch-form" onSubmit={handleSubmit}>
            <label>
              <span>Email Address</span>
              <div className="input-with-icon">
                <b>✉</b>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>

          <p className="auth-switch">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
