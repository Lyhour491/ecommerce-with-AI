import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";

function Checkout() {
  const navigate = useNavigate();
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

  const loadCart = async () => {
    setPageLoading(true);
    try {
      const [cartRes, userRes] = await Promise.all([api.get("/cart"), api.get("/user").catch(() => null)]);
      const user = userRes?.data?.user || userRes?.data || {};
      setCartItems(unwrapList(cartRes.data, ["cart", "items", "cart_items"]));
      setForm((old) => ({ ...old, first_name: old.first_name || String(user.name || "").split(" ")[0] || "", last_name: old.last_name || String(user.name || "").split(" ").slice(1).join(" "), email: old.email || user.email || "" }));
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
      else setError(firstApiError(err, "Failed to load checkout."));
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { loadCart(); }, []);

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

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError("");
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
      navigate("/orders");
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
      <div className="checkout-shell">
        <section className="checkout-form-column">
          <Link className="back-link" to="/cart">← Back to Cart</Link>
          <h1>Checkout</h1>
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleCheckout}>
            <section className="checkout-card">
              <h2><span>1</span> Shipping Details</h2>
              <div className="checkout-grid two">
                <label>First Name<input name="first_name" value={form.first_name} onChange={handleChange} required placeholder="John" /></label>
                <label>Last Name<input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Doe" /></label>
              </div>
              <label>Email Address<input type="email" name="email" value={form.email} onChange={handleChange} placeholder="john@example.com" /></label>
              <label>Street Address<input name="street_address" value={form.street_address} onChange={handleChange} required placeholder="123 Modern Ave" /></label>
              <div className="checkout-grid three">
                <label>City<input name="city" value={form.city} onChange={handleChange} required placeholder="Phnom Penh" /></label>
                <label>State<input name="state" value={form.state} onChange={handleChange} placeholder="PP" /></label>
                <label>ZIP Code<input name="zip_code" value={form.zip_code} onChange={handleChange} placeholder="12000" /></label>
              </div>
              <label>Phone<input name="phone" value={form.phone} onChange={handleChange} required placeholder="012345678" /></label>
            </section>

            <section className="checkout-card">
              <h2><span>2</span> Shipping Method</h2>
              <label className={`ship-option ${form.shipping_method === "standard" ? "active" : ""}`}>
                <input type="radio" name="shipping_method" value="standard" checked={form.shipping_method === "standard"} onChange={handleChange} />
                <b>Standard Delivery<small>3-5 business days</small></b><strong>Free</strong>
              </label>
              <label className={`ship-option ${form.shipping_method === "express" ? "active" : ""}`}>
                <input type="radio" name="shipping_method" value="express" checked={form.shipping_method === "express"} onChange={handleChange} />
                <b>Express Shipping<small>1-2 business days</small></b><strong>$15.00</strong>
              </label>
            </section>

            <section className="checkout-card">
              <h2><span>3</span> Payment Details <em>🔒 Secure</em></h2>
              <p className="test-note">Test only: use 4242 4242 4242 4242 for success, or 4000 0000 0000 0002 to test decline. No real payment is charged.</p>
              <label>Cardholder Name<input name="cardholder_name" value={form.cardholder_name} onChange={handleChange} required placeholder="Name as on card" /></label>
              <label>Card Number<input name="card_number" value={form.card_number} onChange={handleChange} required placeholder="4242 4242 4242 4242" /></label>
              <div className="checkout-grid two">
                <label>Expiry Date<input name="expiry_date" value={form.expiry_date} onChange={handleChange} required placeholder="MM/YY" /></label>
                <label>CVV<input name="cvv" value={form.cvv} onChange={handleChange} required placeholder="123" /></label>
              </div>
            </section>

            <button className="mobile-complete" type="submit" disabled={loading || !cartItems.length}>{loading ? "Processing test payment..." : "Complete Purchase"}</button>
          </form>
        </section>

        <aside className="checkout-summary-column">
          <div className="checkout-summary-card">
            <h2>Order Summary</h2>
            <div className="checkout-items">
              {cartItems.map((item) => {
                const product = item.product || item;
                const img = getImageUrl(product);
                const qty = Number(item.quantity || 1);
                const price = Number(product.price || item.price || 0);
                return <div className="checkout-item" key={item.id}>
                  <div>{img ? <img src={img} alt={product.name} /> : <span />}</div>
                  <p><strong>{product.name || "Product"}</strong><small>Qty: {qty}</small></p>
                  <b>{money(price * qty)}</b>
                </div>;
              })}
            </div>
            <div className="summary-line"><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
            <div className="summary-line"><span>Shipping</span><strong>{totals.shipping ? money(totals.shipping) : "Free"}</strong></div>
            <div className="summary-line"><span>Taxes</span><strong>{money(totals.tax)}</strong></div>
            <div className="summary-total checkout-total"><span>Total</span><strong>{money(totals.total)}</strong></div>
            <button className="checkout-button" type="button" disabled={loading || !cartItems.length} onClick={handleCheckout}>{loading ? "Processing..." : "Complete Purchase"}</button>
            <div className="guarantee">🛡 30-Day Money Back Guarantee</div>
          </div>
          <div className="promo-card"><label>Promo Code<input name="promo_code" value={form.promo_code} onChange={handleChange} placeholder="Enter code" /></label><button type="button">Apply</button></div>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
