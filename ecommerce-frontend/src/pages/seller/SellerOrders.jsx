import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money, getImageUrl, firstApiError } from "../../utils/store";
import { ShoppingCart, X, Mail, Phone, MapPin, CreditCard, Clock } from "lucide-react";

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = () => {
    setLoading(true);
    api.get("/seller/orders")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        setOrders(list);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      setSuccessMessage("Order status updated successfully!");
      
      // Update order in local state
      const updatedOrder = res.data.order || res.data;
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      
      // Update currently open detail order if matching
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      setErrorMessage(firstApiError(err, "Failed to update order status."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="seller-loading">Loading order entries...</div>;
  }

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Order Manager</h1>
        </div>
        <div className="merchant-top-actions">
          <span>Total Orders: <b>{orders.length}</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row">
          <h1>My Orders</h1>
          <p>Review and process orders containing your products.</p>
        </div>

        {orders.length === 0 ? (
          <div className="card" style={{ padding: "80px 20px", textAlign: "center", background: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b", fontSize: 32 }}>🛒</div>
            <h3 style={{ margin: 0 }}>No orders yet</h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>Orders containing your products will appear here once purchased.</p>
          </div>
        ) : (
          <div className="card product-like-table" style={{ background: "white", marginTop: 24 }}>
            <div className="product-like-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer Name</th>
                    <th>Items</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const items = order.order_items || [];
                    const statusClass = order.status || "pending";
                    return (
                      <tr key={order.id}>
                        <td>
                          <strong style={{ color: "var(--primary)" }}>#{order.id}</strong>
                        </td>
                        <td>
                          <strong>{order.user?.name || "Customer"}</strong>
                          <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{order.user?.email || "—"}</span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {items.slice(0, 2).map((item, idx) => (
                              <span className="status draft" style={{ fontSize: 11, padding: "4px 8px" }} key={idx}>
                                {item.product?.name || `Product #${item.product_id}`} × {item.quantity}
                              </span>
                            ))}
                            {items.length > 2 && (
                              <span className="status archived" style={{ fontSize: 11, padding: "4px 8px" }}>
                                + {items.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "var(--text)" }}>{money(order.total_price)}</strong>
                        </td>
                        <td>
                          <span className={`status ${statusClass}`}>{order.status}</span>
                        </td>
                        <td>
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </td>
                        <td>
                          <button className="edit-user-btn" onClick={() => { setSuccessMessage(""); setErrorMessage(""); setSelectedOrder(order); }}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal Overlay */}
        {selectedOrder && (
          <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="edit-user-modal wide-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
              <div className="modal-header">
                <div>
                  <h2>Order Details #{selectedOrder.id}</h2>
                  <p>Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)}><X size={18} /></button>
              </div>

              {successMessage && <div className="alert alert-success">{successMessage}</div>}
              {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginTop: 14 }}>
                {/* Left side: items list and status */}
                <div>
                  <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>Purchased Items</h3>
                  <div style={{ display: "grid", gap: 12, maxByteSize: 320, overflowY: "auto", paddingRight: 8 }}>
                    {(selectedOrder.order_items || []).map((item) => {
                      const p = item.product || {};
                      const img = getImageUrl(p) || p.image;
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9", paddingBottom: 10 }}>
                          {img ? (
                            <img src={img} alt={p.name} style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", background: "#f8fafc" }} />
                          ) : (
                            <div style={{ width: 52, height: 52, borderRadius: 8, background: "#eef2f6", display: "grid", placeItems: "center" }}>📦</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: 13, display: "block" }}>{p.name || `Product #${item.product_id}`}</strong>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>{money(item.price)} × {item.quantity}</span>
                          </div>
                          <strong>{money(item.price * item.quantity)}</strong>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
                    <span style={{ fontWeight: "bold", color: "var(--muted)" }}>Grand Total:</span>
                    <strong style={{ fontSize: 20, color: "var(--primary)" }}>{money(selectedOrder.total_price)}</strong>
                  </div>
                </div>

                {/* Right side: specs and actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Customer specs */}
                  <div>
                    <h3 style={{ fontSize: 15, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}><Mail size={16} /> Customer Details</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                      <strong>Name:</strong> {selectedOrder.user?.name || "Customer"}<br />
                      <strong>Email:</strong> {selectedOrder.user?.email || "—"}<br />
                      <strong>Phone:</strong> {selectedOrder.phone || "—"}
                    </p>
                  </div>

                  {/* Shipping specifications */}
                  <div>
                    <h3 style={{ fontSize: 15, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}><MapPin size={16} /> Shipping Address</h3>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
                      {selectedOrder.shipping_address || "N/A"}<br />
                      <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase" }}>
                        Method: {selectedOrder.shipping_method || "Standard"}
                      </span>
                    </p>
                  </div>

                  {/* Change order status */}
                  <div style={{ background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                    <h3 style={{ fontSize: 15, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}><Clock size={16} /> Process Order</h3>
                    <label style={{ gap: 6, fontSize: 12 }}>
                      <span>Modify Order Status</span>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                        disabled={updatingStatus}
                        style={{ marginTop: 4, textTransform: "capitalize" }}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="btn-secondary" onClick={() => setSelectedOrder(null)}>Close Receipt</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
