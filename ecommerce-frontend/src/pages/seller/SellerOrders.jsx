import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money } from "../../utils/store";
import { ShoppingCart } from "lucide-react";

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/seller/orders")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        setOrders(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusClass = (status) => {
    const map = {
      delivered: "status-delivered",
      processing: "status-processing",
      pending: "status-pending",
      shipped: "status-shipped",
      cancelled: "status-cancelled",
    };
    return map[status] || "status-pending";
  };

  if (loading) {
    return <div className="seller-loading">Loading orders...</div>;
  }

  return (
    <div className="seller-orders-page">
      <div className="seller-page-header">
        <h1>My Orders</h1>
        <p>Orders containing your products</p>
      </div>

      {orders.length === 0 ? (
        <div className="seller-empty">
          <ShoppingCart size={48} />
          <h3>No orders yet</h3>
          <p>Orders containing your products will appear here.</p>
        </div>
      ) : (
        <div className="seller-orders-table-wrap">
          <table className="seller-orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id}</td>
                  <td>{order.user?.name || "—"}</td>
                  <td>
                    <div className="seller-order-items">
                      {(order.order_items || []).map((item, i) => (
                        <span key={i} className="seller-order-item-pill">
                          {item.product?.name || `Product #${item.product_id}`} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="order-total">{money(order.total_price)}</td>
                  <td>
                    <span className={`seller-status-badge ${statusClass(order.status)}`}>
                      {order.status || "pending"}
                    </span>
                  </td>
                  <td className="order-date">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
