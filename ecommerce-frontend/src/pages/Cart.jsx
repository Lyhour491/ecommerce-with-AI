import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";

function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [promo, setPromo] = useState("");

  const loadCart = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/cart");
      setCartItems(unwrapList(res.data, ["cart", "items", "cart_items"]));
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
      else setError(firstApiError(err, "Failed to load cart."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCart(); }, []);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      const product = item.product || item;
      return sum + Number(product.price || item.price || 0) * Number(item.quantity || 1);
    }, 0);
    return { subtotal, tax: 0, total: subtotal };
  }, [cartItems]);

  const updateQuantity = async (cartId, quantity) => {
    if (quantity < 1) return;
    setError("");
    try {
      await api.put(`/cart/${cartId}`, { quantity });
      await loadCart();
    } catch (err) {
      setError(firstApiError(err, "Failed to update cart."));
    }
  };

  const deleteItem = async (cartId) => {
    setError("");
    try {
      await api.delete(`/cart/${cartId}`);
      setMessage("Item removed.");
      await loadCart();
    } catch (err) {
      setError(firstApiError(err, "Failed to delete item."));
    }
  };

  if (loading) {
    return (
      <main className="cart-page">
        <div className="cart-shell">
          <section className="cart-main">
            <div className="cart-heading">
              <div className="skeleton-line title skeleton-shimmer" style={{ width: '40%', height: 32 }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '20%', height: 16, marginTop: 8 }} />
            </div>
            <div className="cart-item-list" style={{ marginTop: 24 }}>
              {Array.from({ length: 2 }).map((_, idx) => (
                <article className="pro-cart-item" key={idx} style={{ border: 'none' }}>
                  <div className="pro-cart-img skeleton-shimmer" style={{ borderRadius: 12, height: 96, width: 96 }} />
                  <div className="pro-cart-info" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="skeleton-line title skeleton-shimmer" style={{ width: '60%', height: 20 }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: 14 }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '20%', height: 24 }} />
                  </div>
                  <div className="skeleton-line skeleton-shimmer" style={{ width: 60, height: 20, marginLeft: 'auto' }} />
                </article>
              ))}
            </div>
          </section>
          <aside className="cart-summary-card">
            <div className="skeleton-line title skeleton-shimmer" style={{ width: '60%', height: 24, marginBottom: 20 }} />
            <div className="summary-line"><div className="skeleton-line skeleton-shimmer" style={{ width: '40%' }} /><div className="skeleton-line skeleton-shimmer" style={{ width: '20%' }} /></div>
            <div className="summary-line"><div className="skeleton-line skeleton-shimmer" style={{ width: '50%' }} /><div className="skeleton-line skeleton-shimmer" style={{ width: '15%' }} /></div>
            <div className="summary-line"><div className="skeleton-line skeleton-shimmer" style={{ width: '30%' }} /><div className="skeleton-line skeleton-shimmer" style={{ width: '20%' }} /></div>
            <div className="summary-total" style={{ borderTop: '1px solid #eef2f6', paddingTop: 20, marginTop: 20 }}><div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: 24 }} /><div className="skeleton-line skeleton-shimmer" style={{ width: '20%', height: 24 }} /></div>
            <div className="skeleton-line skeleton-shimmer" style={{ height: 48, borderRadius: 10, marginTop: 20 }} />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-shell">
        <section className="cart-main">
          <div className="cart-heading">
            <h1>Your Shopping Cart</h1>
            <p>You have <strong>{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</strong> in your cart.</p>
          </div>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {cartItems.length === 0 ? (
            <div className="empty-state card">
              <p>Your cart is empty.</p>
              <Link className="btn btn-primary" to="/products">Continue Shopping</Link>
            </div>
          ) : (
            <div className="cart-item-list">
              {cartItems.map((item) => {
                const product = item.product || item;
                const imageUrl = getImageUrl(product);
                const price = Number(product.price || item.price || 0);
                const quantity = Number(item.quantity || 1);
                return (
                  <article className="pro-cart-item" key={item.id}>
                    <div className="pro-cart-img">
                      {imageUrl ? <img src={imageUrl} alt={product.name} /> : <span>No image</span>}
                    </div>
                    <div className="pro-cart-info">
                      <h2>{product.name || "Product"}</h2>
                      <p>{product.category?.name || product.category_name || "Premium"} | {product.color || "Classic"}</p>
                      <div className="mini-stepper">
                        <button type="button" onClick={() => updateQuantity(item.id, quantity - 1)}>-</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, quantity + 1)}>+</button>
                      </div>
                    </div>
                    <strong>{money(price * quantity)}</strong>
                    <button className="cart-trash" type="button" onClick={() => deleteItem(item.id)} title="Remove">🗑</button>
                  </article>
                );
              })}
            </div>
          )}

          <Link className="continue-link" to="/products">← Continue Shopping</Link>
        </section>

        <aside className="cart-summary-card">
          <h2>Order Summary</h2>
          <div className="summary-line"><span>Subtotal</span><strong>{money(totals.subtotal)}</strong></div>
          <div className="summary-line"><span>Shipping</span><b>Calculated at checkout</b></div>
          <div className="summary-line"><span>Tax</span><strong>{money(totals.tax)}</strong></div>
          <div className="summary-total"><span>Total</span><strong>{money(totals.total)}</strong><small>Prices in USD</small></div>
          <label className="promo-label">Promo Code</label>
          <div className="promo-row">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Enter code" />
            <button type="button" onClick={() => setMessage("Promo codes are test-only in this demo.")}>Apply</button>
          </div>
          <button className="checkout-button" type="button" disabled={!cartItems.length} onClick={() => navigate("/checkout")}>Proceed to Checkout →</button>
          <div className="trust-box">🛡 Secure SSL Encrypted Checkout</div>
          <div className="trust-box">🚚 Free Express Shipping on orders over $500</div>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
