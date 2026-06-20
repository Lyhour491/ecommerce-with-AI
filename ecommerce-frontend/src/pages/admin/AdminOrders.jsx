import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Edit3,
  PackageCheck,
  Search,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";
import api from "../../api/axios";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const unwrapUser = (payload) => payload?.user || payload?.data?.user || payload?.data || payload || { name: "Admin" };

const getArray = (response) => {
  const value = response?.data;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.orders)) return value.orders;
  return [];
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getTotal = (order) => toNumber(order?.total_price ?? order?.total ?? order?.total_amount ?? order?.amount ?? order?.grand_total);
const getCustomer = (order) => order?.user?.name || order?.customer?.name || order?.customer_name || `User #${order?.user_id || "-"}`;
const getStatus = (order) => String(order?.status || "pending").toLowerCase();
const getItems = (order) => order?.order_items || order?.items || order?.orderItems || [];
const getDate = (order) => order?.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [admin, setAdmin] = useState({ name: "Admin" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderForm, setOrderForm] = useState({ status: "pending", phone: "", shipping_address: "" });

  useEffect(() => {
    let alive = true;
    async function loadOrders() {
      setLoading(true);
      setError("");
      try {
        const [ordersRes, userRes] = await Promise.allSettled([api.get("/orders"), api.get("/user")]);
        if (!alive) return;
        if (ordersRes.status === "fulfilled") setOrders(getArray(ordersRes.value));
        else setError("Orders API data could not be loaded. Please check your Laravel API and token.");
        if (userRes.status === "fulfilled") setAdmin(unwrapUser(userRes.value?.data));
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadOrders();
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + getTotal(order), 0);
    const pending = orders.filter((order) => getStatus(order) === "pending").length;
    const delivered = orders.filter((order) => ["delivered", "completed", "complete"].includes(getStatus(order))).length;
    const customers = new Set(orders.map((order) => order?.user_id || getCustomer(order))).size;

    return [
      { label: "Total Orders", value: orders.length.toLocaleString(), note: "+ Live API", icon: ShoppingCart, tone: "blue" },
      { label: "Pending Orders", value: pending.toLocaleString(), note: "Need action", icon: Clock, tone: "orange" },
      { label: "Delivered", value: delivered.toLocaleString(), note: "Completed", icon: PackageCheck, tone: "green" },
      { label: "Order Revenue", value: currency.format(totalRevenue), note: `${customers} customers`, icon: Users, tone: "purple" },
    ];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();
    return orders.filter((order) => {
      const status = getStatus(order);
      const matchesTab = tab === "all" || status === tab;
      const searchable = [order?.id, order?.order_number, getCustomer(order), order?.shipping_address, order?.phone, status]
        .join(" ")
        .toLowerCase();
      return matchesTab && (!search || searchable.includes(search));
    });
  }, [orders, query, tab]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pageOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [query, tab]);

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setOrderForm({
      status: getStatus(order),
      phone: order?.phone || "",
      shipping_address: order?.shipping_address || "",
    });
    setMessage("");
    setError("");
  };

  const closeEditOrder = () => {
    setEditingOrder(null);
    setOrderForm({ status: "pending", phone: "", shipping_address: "" });
  };

  const saveOrder = async (event) => {
    event.preventDefault();
    if (!editingOrder) return;
    setSavingId(editingOrder.id);
    setMessage("");
    setError("");
    try {
      const response = await api.put(`/orders/${editingOrder.id}`, orderForm);
      const updated = response.data?.order || response.data?.data || { ...editingOrder, ...orderForm };
      setOrders((items) => items.map((item) => item.id === editingOrder.id ? { ...item, ...updated } : item));
      setMessage(`Order #${editingOrder.id} updated successfully.`);
      closeEditOrder();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update order. Check status, phone, and shipping address.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="merchant-dashboard admin-orders-page">
      <header className="merchant-topbar product-like-topbar">
        <h1>Order Management</h1>
        <div className="product-like-actions">
          <label className="product-like-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..." /></label>
          <div className="merchant-top-actions"><strong>{admin?.name || "Admin"}</strong><span className="mini-profile">{(admin?.name || "A").charAt(0).toUpperCase()}</span></div>
        </div>
      </header>

      <div className="merchant-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="page-subtitle">Loading order management data...</p>}

        <div className="merchant-metrics order-metrics">
          {stats.map(({ label, value, note, icon: Icon, tone }) => (
            <article className="merchant-metric-card product-stat-card" key={label}>
              <div className={`metric-icon ${tone}`}><Icon size={21} /></div>
              <span className={`metric-pill ${tone}`}>{note}</span>
              <p>{label}</p>
              <h2>{value}</h2>
            </article>
          ))}
        </div>

        <article className="merchant-panel product-like-table orders-management-card">
          <div className="product-tabs-row">
            <div className="product-tabs">
              {["all", "pending", "processing", "delivered"].map((status) => (
                <button key={status} className={tab === status ? "active" : ""} onClick={() => setTab(status)}>
                  {status === "all" ? "All Orders" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="product-like-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Phone</th>
                  <th>Shipping Address</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.length ? pageOrders.map((order) => {
                  const items = getItems(order);
                  const status = getStatus(order);
                  return (
                    <tr key={order.id}>
                      <td><strong>#{order.order_number || order.id}</strong></td>
                      <td><strong>{getCustomer(order)}</strong><span>User ID: {order.user_id || "N/A"}</span></td>
                      <td>{items.length ? `${items.length} item${items.length > 1 ? "s" : ""}` : "Order items"}</td>
                      <td><strong>{currency.format(getTotal(order))}</strong></td>
                      <td>{order.phone || "N/A"}</td>
                      <td className="address-cell"><Truck size={15} />{order.shipping_address || "N/A"}</td>
                      <td><span className={`status ${status}`}>{status}</span></td>
                      <td>{getDate(order)}</td>
                      <td><button className="edit-user-btn" type="button" onClick={() => openEditOrder(order)} disabled={savingId === order.id}><Edit3 size={16} /> Edit</button></td>
                    </tr>
                  );
                }) : <tr><td colSpan="9" className="empty-orders">No orders found from API.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="product-pagination-row">
            <p>Showing {filteredOrders.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredOrders.length)} of {filteredOrders.length} orders</p>
            <div className="product-pagination">
              <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? "active" : ""} onClick={() => setPage(number)}>{number}</button>)}
              <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
            </div>
          </div>
        </article>
      </div>
      {editingOrder && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-user-modal" onSubmit={saveOrder}>
            <div className="modal-header">
              <div><h2>Edit Order</h2><p>Update order status, phone, or shipping address.</p></div>
              <button type="button" onClick={closeEditOrder} aria-label="Close"><X size={18} /></button>
            </div>
            <label>Status<select value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value })}><option value="pending">pending</option><option value="processing">processing</option><option value="shipped">shipped</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option></select></label>
            <label>Phone<input value={orderForm.phone} onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })} required placeholder="Customer phone" /></label>
            <label>Shipping Address<textarea value={orderForm.shipping_address} onChange={(e) => setOrderForm({ ...orderForm, shipping_address: e.target.value })} rows="3" required placeholder="Shipping address" /></label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEditOrder}>Cancel</button>
              <button type="submit" className="btn-add-product" disabled={savingId === editingOrder.id}>{savingId === editingOrder.id ? "Saving..." : "Save Order"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default AdminOrders;
