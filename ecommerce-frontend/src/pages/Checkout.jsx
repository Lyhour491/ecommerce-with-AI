import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";

function Checkout() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    street_address: "",
    city: "",
    state: "",
    zip_code: "",
    shipping_method: "standard",
    payment_method: "test_card",
    cardholder_name: "Test User",
    card_number: "4242 4242 4242 4242",
    expiry_date: "12/30",
    cvv: "123",
    promo_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCart = async () => {
    setPageLoading(true);
    try {
      const [cartRes, userRes] = await Promise.all([
        api.get("/cart"),
        api.get("/user").catch(() => null)
      ]);
      const user = userRes?.data?.user || userRes?.data || {};
      setCartItems(unwrapList(cartRes.data, ["cart", "items", "cart_items"]));
      
      const nameParts = (user.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setForm((old) => ({
        ...old,
        first_name: old.first_name || firstName,
        last_name: old.last_name || lastName,
        email: old.email || user.email || "",
        phone: old.phone || user.phone || "",
        street_address: old.street_address || user.business_address || "",
        city: old.city || user.city || "",
        state: old.state || user.business_state || "",
        zip_code: old.zip_code || user.zip_code || "",
      }));
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
      else setError(firstApiError(err, "Failed to load checkout."));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const product = item.product || item;
      return sum + Number(product.price || item.price || 0) * Number(item.quantity || 1);
    }, 0);
    const shipping = form.shipping_method === "express" ? 15 : 0;
    const tax = Number((subtotal * 0.08).toFixed(2));
    return { subtotal, shipping, tax, total: subtotal + shipping + tax };
  }, [cartItems, form.shipping_method]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateShipping = () => {
    if (!form.first_name || !form.street_address || !form.city || !form.phone || !form.email) {
      setError("Please fill in all required shipping fields.");
      return false;
    }
    setError("");
    return true;
  };

  const validatePayment = () => {
    if (form.payment_method === "test_card") {
      if (!form.cardholder_name || !form.card_number || !form.expiry_date || !form.cvv) {
        setError("Please fill in all card details.");
        return false;
      }

      if (form.cardholder_name.trim().length < 3) {
        setError("Cardholder name must be at least 3 characters.");
        return false;
      }

      const digitsOnly = form.card_number.replace(/\s+/g, "");
      if (!/^\d{16}$/.test(digitsOnly)) {
        setError("Card number must be exactly 16 digits.");
        return false;
      }

      if (!/^\d{2}\/\d{2}$/.test(form.expiry_date)) {
        setError("Expiry date must be in MM/YY format (e.g. 12/28).");
        return false;
      }

      const [monthStr, yearStr] = form.expiry_date.split("/");
      const month = parseInt(monthStr, 10);
      const year = parseInt("20" + yearStr, 10);

      if (month < 1 || month > 12) {
        setError("Expiry month must be between 01 and 12.");
        return false;
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        setError("The credit card has expired.");
        return false;
      }

      if (!/^\d{3,4}$/.test(form.cvv)) {
        setError("CVV must be 3 or 4 digits.");
        return false;
      }
    }
    setError("");
    return true;
  };

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const shipping_address = [form.street_address, form.city, form.state, form.zip_code].filter(Boolean).join(", ");
      await api.post("/checkout", {
        shipping_address,
        phone: form.phone,
        shipping_method: form.shipping_method,
        payment_method: form.payment_method,
        cardholder_name: form.cardholder_name,
        card_number: form.card_number,
        expiry_date: form.expiry_date,
        cvv: form.cvv,
      });
      setMessage("Order placed successfully! Redirecting...");
      setTimeout(() => {
        navigate("/orders");
      }, 1500);
    } catch (err) {
      if (err.response?.status === 401) return navigate("/login");
      setError(firstApiError(err, "Checkout failed."));
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) return <div className="loading">Loading checkout...</div>;

  return (
    <main className="checkout-page">
      {/* Horizontal Step Indicator Header */}
      <div style={{ maxWidth: 1180, margin: "0 auto 34px", padding: "0 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#e2e8f0", zIndex: 1 }} />
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center",
              background: step >= 1 ? "var(--primary)" : "white",
              color: step >= 1 ? "white" : "var(--muted)",
              border: `2px solid ${step >= 1 ? "var(--primary)" : "#cbd5e1"}`,
              fontWeight: 800
            }}>1</div>
            <span style={{ fontSize: 13, fontWeight: 800, marginTop: 8, color: step >= 1 ? "var(--text)" : "var(--muted)" }}>Shipping</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center",
              background: step >= 2 ? "var(--primary)" : "white",
              color: step >= 2 ? "white" : "var(--muted)",
              border: `2px solid ${step >= 2 ? "var(--primary)" : "#cbd5e1"}`,
              fontWeight: 800
            }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 800, marginTop: 8, color: step >= 2 ? "var(--text)" : "var(--muted)" }}>Payment</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center",
              background: step >= 3 ? "var(--primary)" : "white",
              color: step >= 3 ? "white" : "var(--muted)",
              border: `2px solid ${step >= 3 ? "var(--primary)" : "#cbd5e1"}`,
              fontWeight: 800
            }}>3</div>
            <span style={{ fontSize: 13, fontWeight: 800, marginTop: 8, color: step >= 3 ? "var(--text)" : "var(--muted)" }}>Review</span>
          </div>
        </div>
      </div>

      <div className="checkout-shell">
        <section className="checkout-form-column">
          <Link className="back-link" to="/cart">← Back to Cart</Link>
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {/* STEP 1: SHIPPING DETAILS */}
          {step === 1 && (
            <div className="checkout-card">
              <h2>Shipping Information</h2>
              <div className="checkout-grid two">
                <label>First Name *<input name="first_name" value={form.first_name} onChange={handleChange} required placeholder="John" /></label>
                <label>Last Name *<input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Doe" /></label>
              </div>
              <div className="checkout-grid two">
                <label>Email Address *<input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" /></label>
                <label>Phone *<input name="phone" value={form.phone} onChange={handleChange} required placeholder="012345678" /></label>
              </div>
              <label>Street Address *<input name="street_address" value={form.street_address} onChange={handleChange} required placeholder="123 Modern Ave" /></label>
              <div className="checkout-grid three">
                <label>City *<input name="city" value={form.city} onChange={handleChange} required placeholder="Phnom Penh" /></label>
                <label>State / Province<input name="state" value={form.state} onChange={handleChange} placeholder="PP" /></label>
                <label>ZIP Code<input name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="12000" /></label>
              </div>

              <h2 style={{ marginTop: 28 }}>Shipping Method</h2>
              <label className={`ship-option ${form.shipping_method === "standard" ? "active" : ""}`} style={{ marginBottom: 12 }}>
                <input type="radio" name="shipping_method" value="standard" checked={form.shipping_method === "standard"} onChange={handleChange} />
                <b>Standard Delivery<small>3-5 business days</small></b><strong>Free</strong>
              </label>
              <label className={`ship-option ${form.shipping_method === "express" ? "active" : ""}`}>
                <input type="radio" name="shipping_method" value="express" checked={form.shipping_method === "express"} onChange={handleChange} />
                <b>Express Shipping<small>1-2 business days</small></b><strong>$15.00</strong>
              </label>

              <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-primary" onClick={() => { if (validateShipping()) setStep(2); }}>Continue to Payment</button>
              </div>
            </div>
          )}

          {/* STEP 2: PAYMENT METHOD */}
          {step === 2 && (
            <div className="checkout-card">
              <h2>Payment Method</h2>
              
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <label className={`ship-option ${form.payment_method === "test_card" ? "active" : ""}`} style={{ flex: 1, cursor: "pointer" }}>
                  <input type="radio" name="payment_method" value="test_card" checked={form.payment_method === "test_card"} onChange={handleChange} />
                  <b>Test Credit Card<small>Simulate online purchase</small></b>
                </label>
                <label className={`ship-option ${form.payment_method === "cash_on_delivery" ? "active" : ""}`} style={{ flex: 1, cursor: "pointer" }}>
                  <input type="radio" name="payment_method" value="cash_on_delivery" checked={form.payment_method === "cash_on_delivery"} onChange={handleChange} />
                  <b>Cash on Delivery<small>Pay upon arrival</small></b>
                </label>
              </div>

              {form.payment_method === "test_card" && (
                <div>
                  <p className="test-note" style={{ marginBottom: 16 }}>
                    💳 Test only: use <code>4242 4242 4242 4242</code> for success, or <code>4000 0000 0000 0002</code> to test decline.
                  </p>
                  <label>Cardholder Name *<input name="cardholder_name" value={form.cardholder_name} onChange={handleChange} required placeholder="Name on Card" /></label>
                  <label style={{ marginTop: 12 }}>Card Number *<input name="card_number" value={form.card_number} onChange={handleChange} required placeholder="4242 4242 4242 4242" /></label>
                  <div className="checkout-grid two" style={{ marginTop: 12 }}>
                    <label>Expiry Date *<input name="expiry_date" value={form.expiry_date} onChange={handleChange} required placeholder="MM/YY" /></label>
                    <label>CVV *<input name="cvv" value={form.cvv} onChange={handleChange} required placeholder="123" /></label>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => { if (validatePayment()) setStep(3); }}>Continue to Review</button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {step === 3 && (
            <div className="checkout-card">
              <h2>Review Your Order</h2>
              <p className="page-subtitle" style={{ marginBottom: 20 }}>Double check your shipping and billing specifications before finalizing.</p>
              
              <div style={{ display: "grid", gap: 20, borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 20 }}>
                <div>
                  <strong style={{ display: "block", color: "var(--text)", marginBottom: 6 }}>Shipping Destination:</strong>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {form.first_name} {form.last_name}<br />
                    {form.street_address}, {form.city}, {form.state} {form.zip_code}<br />
                    Phone: {form.phone} | Email: {form.email}
                  </p>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--text)", marginBottom: 6 }}>Selected Shipping Method:</strong>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {form.shipping_method === "express" ? "Express Delivery (1-2 business days, $15.00)" : "Standard Delivery (3-5 business days, Free)"}
                  </p>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--text)", marginBottom: 6 }}>Payment Method Selected:</strong>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {form.payment_method === "cash_on_delivery" ? "Cash on Delivery" : `Test Credit Card (Ending in ${form.card_number.slice(-4)})`}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Back to Payment</button>
                <button type="button" className="btn btn-primary" onClick={handleCheckout} disabled={loading || !cartItems.length}>
                  {loading ? "Processing..." : "Place Order"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ORDER SUMMARY SIDEBAR */}
        <aside className="checkout-summary-column">
          <div className="checkout-summary-card">
            <h2>Order Summary</h2>
            <div className="checkout-items">
              {cartItems.map((item) => {
                const product = item.product || item;
                const img = getImageUrl(product);
                const qty = Number(item.quantity || 1);
                const price = Number(product.price || item.price || 0);
                return (
                  <div className="checkout-item" key={item.id}>
                    <div>{img ? <img src={img} alt={product.name} /> : <span />}</div>
                    <p><strong>{product.name || "Product"}</strong><small>Qty: {qty}</small></p>
                    <b>{money(price * qty)}</b>
                  </div>
                );
              })}
            </div>
            <div className="summary-line"><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
            <div className="summary-line"><span>Shipping</span><strong>{totals.shipping ? money(totals.shipping) : "Free"}</strong></div>
            <div className="summary-line"><span>Taxes</span><strong>{money(totals.tax)}</strong></div>
            <div className="summary-total checkout-total"><span>Total</span><strong>{money(totals.total)}</strong></div>
            
            {step === 3 && (
              <button className="checkout-button" type="button" disabled={loading || !cartItems.length} onClick={handleCheckout}>
                {loading ? "Processing..." : "Complete Purchase"}
              </button>
            )}
            <div className="guarantee">🛡 30-Day Money Back Guarantee</div>
          </div>
          <div className="promo-card">
            <label>Promo Code<input name="promo_code" value={form.promo_code} onChange={handleChange} placeholder="Enter code" /></label>
            <button type="button">Apply</button>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
