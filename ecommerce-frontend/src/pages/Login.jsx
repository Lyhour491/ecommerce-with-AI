import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, unwrapUser } from "../utils/store";

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
        <h2>Elevate Your Lifestyle</h2>
        <p>
          Experience the next generation of pro-consumer shopping with ProShop.
        </p>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", form);
      const token = res.data.token || res.data.access_token;
      if (!token) throw new Error("No token returned from API.");
      localStorage.setItem("token", token);
      
      // Fetch user profile immediately
      try {
        const userRes = await api.get("/user");
        const user = unwrapUser(userRes.data);
        localStorage.setItem("user", JSON.stringify(user));
      } catch (userErr) {
        console.error("Failed to fetch user profile after login", userErr);
      }

      navigate("/products");
    } catch (err) {
      setError(firstApiError(err, err.message || "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get(`/auth/${provider}/redirect`);
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(`Failed to retrieve redirect URL for ${provider}.`);
      }
    } catch (err) {
      setError(firstApiError(err, `Failed to initiate login with ${provider}.`));
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
            <h1>Welcome back</h1>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form className="stitch-form" onSubmit={handleLogin}>
            <label>
              <span>Email Address</span>
              <div className="input-with-icon">
                <b>✉</b>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </label>

            <label>
              <span className="label-row">
                <span>Password</span>
                <a>Forgot password?</a>
              </span>
              <div className="input-with-icon">
                <b>▣</b>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••••"
                  required
                />
              </div>
            </label>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember for 30 days</span>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="divider">
            <span /> or sign in with <span />
          </div>

          <div className="social-grid">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '4px' }}>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("facebook")}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2" style={{ marginRight: '4px' }}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign up for free</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
export default Login;
