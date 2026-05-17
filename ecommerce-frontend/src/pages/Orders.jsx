import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, money, unwrapList } from "../utils/store";

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/orders")
      .then((res) => setOrders(unwrapList(res.data, ["orders"])))
      .catch((err) => { if (err.response?.status === 401) navigate("/login"); else setError(firstApiError(err, "Failed to load orders.")); })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="loading">Loading orders...</div>;

  return (
    <main className="container">
      <h1 className="page-title">My Orders</h1>
      <p className="page-subtitle">Track every order placed from your account.</p>
      {error && <div className="alert alert-error">{error}</div>}
      {orders.length === 0 ? <div className="empty-state card">No orders found.</div> : (
        <section className="table-list" style={{ marginTop: 22 }}>
          {orders.map((order) => {
            const total = order.total || order.total_price || order.grand_total || order.amount || 0;
            return <article className="card card-body" key={order.id}>
              <div className="meta"><h2 className="product-title">Order #{order.id}</h2><strong className="price">{money(total)}</strong></div>
              <p className="page-subtitle">Status: {order.status || "Pending"}</p>
              <p>Shipping: {order.shipping_address || "N/A"}</p>
              <p>Phone: {order.phone || "N/A"}</p>
              <p>Date: {order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}</p>
              {(order.items || order.order_items || []).map((item) => <div className="order-item" key={item.id}><strong>{item.product?.name || item.product_name || "Product"}</strong><p className="page-subtitle">Qty {item.quantity} - {money(item.price || item.product?.price)}</p></div>)}
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
export default Orders;
