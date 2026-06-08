import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money } from "../../utils/store";
import { Package, TrendingUp, DollarSign, Users, ArrowUpRight } from "lucide-react";

export default function SellerDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/seller/stats"),
      api.get("/seller/orders")
    ])
      .then(([statsRes, ordersRes]) => {
        setStats(statsRes.data);
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="seller-loading">Loading dashboard insights...</div>;
  }

  // Extract Top Selling Products from live order data
  const productSales = {};
  orders.forEach((order) => {
    (order.order_items || []).forEach((item) => {
      const p = item.product || {};
      const id = p.id || item.product_id;
      if (!id) return;
      if (!productSales[id]) {
        productSales[id] = {
          name: p.name || `Product #${id}`,
          image: p.image || (p.images?.[0]?.image_path) || "",
          sales: 0,
          revenue: 0,
        };
      }
      productSales[id].sales += item.quantity;
      productSales[id].revenue += Number(item.price || p.price || 0) * item.quantity;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 4);

  const cards = [
    {
      label: "Total Revenue",
      value: money(stats?.total_revenue ?? 0),
      icon: <DollarSign size={20} />,
      note: "+14.2% from last month",
      color: "green",
    },
    {
      label: "Products Sold",
      value: stats?.total_sold ?? 0,
      icon: <TrendingUp size={20} />,
      note: "+8.3% sales volume",
      color: "blue",
    },
    {
      label: "Active Products",
      value: stats?.total_products ?? 0,
      icon: <Package size={20} />,
      note: "Live in store catalog",
      color: "purple",
    },
    {
      label: "Conversion Rate",
      value: "3.4%",
      icon: <Users size={20} />,
      note: "+0.8% interaction gain",
      color: "orange",
    },
  ];

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="merchant-search" style={{ border: "0", background: "transparent" }}>
          <span>Search dashboard insights...</span>
        </div>
        <div className="merchant-top-actions">
          <span>Current Store Status: <b>Online</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row">
          <h1>Seller Dashboard</h1>
          <p>Real-time analytics and overview of your store's performance.</p>
        </div>

        {/* Metrics Grid */}
        <div className="merchant-metrics">
          {cards.map((card) => (
            <div className="merchant-metric-card" key={card.label}>
              <div>
                <p>{card.label}</p>
                <h2>{card.value}</h2>
                <span className={`metric-note ${card.color}`}>{card.note}</span>
              </div>
              <div className={`metric-icon ${card.color}`}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Spline Chart & Top Products */}
        <div className="merchant-grid-main">
          {/* SVG Sales Spline Chart */}
          <div className="merchant-panel">
            <div className="panel-head">
              <h2>Sales Performance</h2>
              <div className="range-tabs">
                <span>Month</span>
                <button type="button">Week</button>
              </div>
            </div>
            
            <div className="line-chart">
              <svg viewBox="0 0 500 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3568d4" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3568d4" stopOpacity="0.00" />
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="50" y1="170" x2="480" y2="170" stroke="#f1f5f9" strokeWidth="1" />

                {/* Y Axis Labels */}
                <text x="15" y="25">$1K</text>
                <text x="15" y="75">$750</text>
                <text x="15" y="125">$500</text>
                <text x="15" y="175">$250</text>
                <text x="15" y="215">$0</text>

                {/* Spline Area Fill */}
                <path d="M 50 190 Q 150 170 200 110 T 350 80 T 480 50 L 480 200 L 50 200 Z" fill="url(#chart-grad)" />

                {/* Spline Line */}
                <path d="M 50 190 Q 150 170 200 110 T 350 80 T 480 50" fill="none" stroke="#3568d4" strokeWidth="3" />

                {/* X Axis Labels */}
                <text x="50" y="235">Jan</text>
                <text x="136" y="235">Feb</text>
                <text x="222" y="235">Mar</text>
                <text x="308" y="235">Apr</text>
                <text x="394" y="235">May</text>
                <text x="480" y="235">Jun</text>
              </svg>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="merchant-panel">
            <h2>Top Products</h2>
            <div className="top-products">
              {topProducts.length === 0 ? (
                <p style={{ color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>No sales data available yet.</p>
              ) : (
                topProducts.map((p, idx) => (
                  <div className="top-product" key={idx}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: 10, background: "#eef3fa", display: "grid", placeItems: "center", color: "#64748b" }}>📦</div>
                    )}
                    <div>
                      <strong>{p.name}</strong>
                      <span>{p.sales} units sold</span>
                    </div>
                    <b>{money(p.revenue)}</b>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Grid: Recent Orders */}
        <div className="merchant-grid-bottom" style={{ gridTemplateColumns: "1fr" }}>
          <div className="merchant-panel orders-panel">
            <div className="panel-head">
              <h2>Recent Orders</h2>
              <a href="/seller/orders">View All Orders →</a>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user?.name || order.user?.email || "Customer"}</td>
                    <td>{money(order.total_price)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
