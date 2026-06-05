import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    api.get("/orders")
      .then((res) => setOrders(unwrapList(res.data, ["orders"])))
      .catch((err) => {
        if (err.response?.status === 401) navigate("/login");
        else setError(firstApiError(err, "Failed to load orders."));
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Calculations for dashboard metrics
  const metrics = {
    totalOrders: orders.length,
    pending: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
    delivered: orders.filter((o) => o.status === "delivered" || o.status === "completed").length,
    totalSpent: orders.reduce((sum, o) => sum + Number(o.total || o.total_price || 0), 0),
  };

  // Filter orders by active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return order.status === "pending" || order.status === "processing";
    if (activeTab === "delivered") return order.status === "delivered" || order.status === "completed";
    if (activeTab === "cancelled") return order.status === "cancelled" || order.status === "canceled";
    return true;
  });

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <main className="container" style={{ maxWidth: 1180 }}>
      <div className="section-head">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">Track and review all purchases made on your account.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Metrics Cards Grid */}
      <div className="grid stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 30 }}>
        <div className="card stat" style={{ borderLeft: "4px solid var(--primary)", background: "white" }}>
          <span>Total Orders</span>
          <strong>{metrics.totalOrders}</strong>
        </div>
        <div className="card stat" style={{ borderLeft: "4px solid var(--warning)", background: "white" }}>
          <span>Pending Orders</span>
          <strong>{metrics.pending}</strong>
        </div>
        <div className="card stat" style={{ borderLeft: "4px solid var(--success)", background: "white" }}>
          <span>Delivered</span>
          <strong>{metrics.delivered}</strong>
        </div>
        <div className="card stat" style={{ borderLeft: "4px solid #8b5cf6", background: "white" }}>
          <span>Total Spent</span>
          <strong>{money(metrics.totalSpent)}</strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="product-tabs-row" style={{ marginBottom: 24 }}>
        <div className="product-tabs">
          <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>All Orders</button>
          <button className={activeTab === "pending" ? "active" : ""} onClick={() => setActiveTab("pending")}>Pending / Processing</button>
          <button className={activeTab === "delivered" ? "active" : ""} onClick={() => setActiveTab("delivered")}>Delivered</button>
          <button className={activeTab === "cancelled" ? "active" : ""} onClick={() => setActiveTab("cancelled")}>Cancelled</button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="empty-state card" style={{ background: "white" }}>No orders found in this section.</div>
      ) : (
        <section className="table-list" style={{ display: "grid", gap: 20 }}>
          {filteredOrders.map((order) => {
            const total = order.total || order.total_price || order.grand_total || order.amount || 0;
            const items = order.items || order.order_items || [];
            
            return (
              <article className="card card-body" key={order.id} style={{ background: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #f3f4f6", paddingBottom: 14, marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: 18, color: "var(--text)" }}>Order #{order.id}</h3>
                    <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                      Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`status ${order.status}`} style={{ display: "inline-block", fontSize: 12, fontWeight: 800 }}>
                      {order.status || "Pending"}
                    </span>
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: "1fr 1.5fr", gap: 24 }}>
                  {/* Shipping & Payment summaries */}
                  <div>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text)" }}>Delivery Specifications</h4>
                    <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
                      <strong>Address:</strong> {order.shipping_address || "N/A"}<br />
                      <strong>Phone:</strong> {order.phone || "N/A"}
                    </p>
                    <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text)" }}>Payment specs</h4>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                      <strong>Method:</strong> {order.payment_method === "cash_on_delivery" ? "Cash on Delivery" : "Test Card"}<br />
                      <strong>Ref:</strong> {order.payment_reference || "N/A"}
                    </p>
                  </div>

                  {/* Order items list */}
                  <div>
                    <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text)" }}>Purchased Items ({items.length})</h4>
                    <div style={{ display: "grid", gap: 12 }}>
                      {items.map((item) => {
                        const product = item.product || {};
                        const img = getImageUrl(product) || product.image;
                        return (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {img ? (
                              <img src={img} alt={product.name || "Product"} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", background: "#f3f4f6" }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: 8, background: "#eef2f6", display: "grid", placeItems: "center" }}>📦</div>
                            )}
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{product.name || "Product name"}</p>
                              <span style={{ color: "var(--muted)", fontSize: 12 }}>Qty: {item.quantity}</span>
                            </div>
                            <strong style={{ fontSize: 14, color: "var(--text)" }}>{money((item.price || product.price || 0) * item.quantity)}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Grand Total:</span>
                  <strong style={{ fontSize: 20, color: "var(--primary)" }}>{money(total)}</strong>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default Orders;
