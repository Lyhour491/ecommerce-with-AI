import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { unwrapUser } from "../utils/store";
import { ClipboardList, Mail, Phone, MapPin, CheckCircle, ArrowLeft } from "lucide-react";

function SellerApplicationForm() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [form, setForm] = useState({
    shop_name: "",
    shop_category: "",
    shop_description: "",
    tax_id: "",
    website: "",
    fullName: "", // For visual feedback only (email and name read from user)
    business_phone: "",
    business_address: "",
    business_city: "",
    business_state: "",
    business_zip: "",
    business_country: "",
  });

  useEffect(() => {
    if (!token) {
      navigate("/login", { state: { from: "/become-seller/apply" } });
      return;
    }

    api.get("/user")
      .then((res) => {
        const u = unwrapUser(res.data);
        setUser(u);
        setForm((prev) => ({
          ...prev,
          fullName: u.name || "",
        }));

        // If they are already a seller or pending, redirect
        if (u.role === "seller") {
          navigate("/seller");
        } else if (u.seller_status === "pending") {
          navigate("/become-seller");
        }
      })
      .catch((err) => {
        console.error("Failed to load user information", err);
        setError("Could not retrieve user credentials. Please log in again.");
      })
      .finally(() => {
        setLoadingUser(false);
      });
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await api.post("/seller/apply", {
        shop_name: form.shop_name,
        shop_description: form.shop_description,
        shop_category: form.shop_category,
        tax_id: form.tax_id,
        website: form.website,
        business_phone: form.business_phone,
        business_address: form.business_address,
        business_city: form.business_city,
        business_state: form.business_state,
        business_zip: form.business_zip,
        business_country: form.business_country,
      });

      setSuccess(true);
      // Wait a moment and navigate back
      setTimeout(() => {
        navigate("/become-seller");
      }, 2000);
    } catch (err) {
      console.error("Failed to submit application", err);
      setError(
        err.response?.data?.message || 
        "Failed to submit your seller application. Please check your inputs."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return <div className="loading">Initializing form credentials...</div>;
  }

  return (
    <main className="proshop-page seller-form-page">
      <div className="container" style={{ maxWidth: "800px" }}>
        
        <Link className="crumb" to="/become-seller" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "20px" }}>
          <ArrowLeft size={16} /> Back to Info
        </Link>

        <header className="form-header" style={{ marginBottom: "24px" }}>
          <div className="settings-kicker">Seller Application</div>
          <h1 style={{ marginTop: "10px", fontSize: "32px" }}>Seller Application</h1>
          <p style={{ color: "var(--muted)" }}>Complete the form below to apply to become a seller</p>
        </header>

        {success ? (
          <article className="card form-card text-center" style={{ padding: "40px 20px" }}>
            <div className="feature-icon green" style={{ margin: "0 auto 20px", width: "64px", height: "64px", borderRadius: "50%", display: "grid", placeItems: "center" }}>
              <CheckCircle size={32} />
            </div>
            <h2>Application Submitted!</h2>
            <p style={{ color: "var(--muted)", marginTop: "10px" }}>
              Thank you for applying to become a seller. Your application is now pending review by our administrator.
            </p>
            <p style={{ color: "var(--primary)", fontWeight: "bold", marginTop: "20px" }}>
              Redirecting you back to Become a Seller page...
            </p>
          </article>
        ) : (
          <form className="card form-card seller-app-form" onSubmit={handleSubmit} style={{ padding: "34px", maxWidth: "100%" }}>
            {error && <div className="alert alert-error">{error}</div>}

            {/* 1. Business Information */}
            <fieldset style={{ border: "0", padding: "0", margin: "0 0 34px" }}>
              <legend style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "800", fontSize: "19px", borderBottom: "1px solid var(--border)", width: "100%", paddingBottom: "12px", marginBottom: "20px", color: "var(--primary)" }}>
                <ClipboardList size={20} /> Business Information
              </legend>

              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                <label style={{ gridColumn: "span 1" }}>
                  Business Name *
                  <input 
                    name="shop_name" 
                    value={form.shop_name} 
                    onChange={handleChange} 
                    placeholder="Your Business LLC" 
                    required 
                  />
                </label>
                
                <label style={{ gridColumn: "span 1" }}>
                  Primary Category *
                  <select 
                    name="shop_category" 
                    value={form.shop_category} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Home & Garden">Home & Garden</option>
                    <option value="Sports">Sports</option>
                    <option value="Books">Books</option>
                    <option value="Toys">Toys</option>
                  </select>
                </label>

                <label style={{ gridColumn: "span 2" }}>
                  Business Description *
                  <textarea 
                    name="shop_description" 
                    value={form.shop_description} 
                    onChange={handleChange} 
                    placeholder="Describe what your business sells..." 
                    rows={4} 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  Tax ID / EIN *
                  <input 
                    name="tax_id" 
                    value={form.tax_id} 
                    onChange={handleChange} 
                    placeholder="XX-XXXXXXX" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  Website (Optional)
                  <input 
                    name="website" 
                    type="url" 
                    value={form.website} 
                    onChange={handleChange} 
                    placeholder="https://yourbusiness.com" 
                  />
                </label>
              </div>
            </fieldset>

            {/* 2. Contact Information */}
            <fieldset style={{ border: "0", padding: "0", margin: "0 0 34px" }}>
              <legend style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "800", fontSize: "19px", borderBottom: "1px solid var(--border)", width: "100%", paddingBottom: "12px", marginBottom: "20px", color: "var(--primary)" }}>
                <Mail size={20} /> Contact Information
              </legend>

              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                <label style={{ gridColumn: "span 1" }}>
                  Full Name *
                  <input 
                    name="fullName" 
                    value={form.fullName} 
                    onChange={handleChange} 
                    placeholder="John Doe" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  Email Address *
                  <input 
                    value={user?.email || ""} 
                    disabled 
                    style={{ background: "var(--surface-2)", cursor: "not-allowed" }} 
                  />
                </label>

                <label style={{ gridColumn: "span 2" }}>
                  Phone Number *
                  <input 
                    name="business_phone" 
                    type="tel" 
                    value={form.business_phone} 
                    onChange={handleChange} 
                    placeholder="+1 (555) 123-4567" 
                    required 
                  />
                </label>
              </div>
            </fieldset>

            {/* 3. Business Address */}
            <fieldset style={{ border: "0", padding: "0", margin: "0 0 34px" }}>
              <legend style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "800", fontSize: "19px", borderBottom: "1px solid var(--border)", width: "100%", paddingBottom: "12px", marginBottom: "20px", color: "var(--primary)" }}>
                <MapPin size={20} /> Business Address
              </legend>

              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                <label style={{ gridColumn: "span 2" }}>
                  Street Address *
                  <input 
                    name="business_address" 
                    value={form.business_address} 
                    onChange={handleChange} 
                    placeholder="123 Main Street" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  City *
                  <input 
                    name="business_city" 
                    value={form.business_city} 
                    onChange={handleChange} 
                    placeholder="San Francisco" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  State *
                  <input 
                    name="business_state" 
                    value={form.business_state} 
                    onChange={handleChange} 
                    placeholder="CA" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  ZIP Code *
                  <input 
                    name="business_zip" 
                    value={form.business_zip} 
                    onChange={handleChange} 
                    placeholder="94105" 
                    required 
                  />
                </label>

                <label style={{ gridColumn: "span 1" }}>
                  Country *
                  <input 
                    name="business_country" 
                    value={form.business_country} 
                    onChange={handleChange} 
                    placeholder="United States" 
                    required 
                  />
                </label>
              </div>
            </fieldset>

            {/* 4. Terms Info Panel */}
            <div className="card" style={{ background: "#f8fafc", padding: "20px", border: "1px solid var(--border)", borderRadius: "14px", marginBottom: "34px" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                📝 By submitting this application, you agree to our:
              </h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--muted)", fontSize: "14px", lineHeight: "1.8" }}>
                <li>Seller Terms & Conditions</li>
                <li>10% commission fee on all sales</li>
                <li>Product quality and authenticity guidelines</li>
                <li>Customer service standards</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="form-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
              <Link className="btn btn-ghost" to="/become-seller" style={{ minWidth: "100px" }}>Cancel</Link>
              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ minWidth: "160px" }}>
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default SellerApplicationForm;
