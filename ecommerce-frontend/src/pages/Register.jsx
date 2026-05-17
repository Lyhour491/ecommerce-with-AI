import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError } from "../utils/store";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/register", form);
      const token = res.data.token || res.data.access_token;
      if (token) localStorage.setItem("token", token);
      navigate("/products");
    } catch (err) {
      setError(firstApiError(err, "Register failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page compact-auth">
      <section className="auth-card">
        <div className="auth-visual register-visual">
          <div className="auth-visual-copy">
            <h2>Start Shopping Smarter</h2>
            <p>Create your account and discover modern products in one clean store.</p>
          </div>
        </div>
        <div className="auth-form-panel">
          <Link to="/" className="auth-brand">ProShop</Link>
          <div className="auth-heading"><h1>Create account</h1><p>Enter your details to join ProShop.</p></div>
          {error && <div className="alert alert-error">{error}</div>}
          <form className="stitch-form" onSubmit={handleRegister}>
            <label><span>Name</span><div className="input-with-icon"><b>👤</b><input name="name" value={form.name} onChange={handleChange} placeholder="Your name" required /></div></label>
            <label><span>Email Address</span><div className="input-with-icon"><b>✉</b><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@company.com" required /></div></label>
            <label><span>Password</span><div className="input-with-icon"><b>▣</b><input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required /></div></label>
            <label><span>Confirm Password</span><div className="input-with-icon"><b>▣</b><input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} placeholder="••••••••" required /></div></label>
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
export default Register;
