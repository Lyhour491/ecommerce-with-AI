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

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign up for free</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
export default Login;
