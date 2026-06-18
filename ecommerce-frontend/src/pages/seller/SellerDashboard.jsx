import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { money } from "../../utils/store";
import { 
  Package, DollarSign, Plus, LayoutDashboard, ShoppingCart, 
  Settings, BrainCircuit, Activity, Percent
} from "lucide-react";

export default function SellerDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

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

  // Calculate dynamic statistics
  const grossRevenue = stats?.total_revenue ?? 0;
  const platformFee = grossRevenue * 0.10;
  const netRevenue = grossRevenue - platformFee;
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const totalProducts = stats?.total_products ?? 0;

  return (
    <div className="merchant-dashboard modern-seller-dashboard">
      {/* Top Search bar/Header replacement */}
      <div className="merchant-topbar">
        <div className="merchant-search" style={{ border: "0", background: "transparent" }}>
          <span>Search dashboard insights...</span>
        </div>
        <div className="merchant-top-actions">
          <span>Current Store Status: <b style={{ color: "#10b981" }}>Online</b></span>
          <div className="mini-profile" style={{ background: "#2563eb", color: "#fff", border: "0" }}>
            {(user?.name || "S").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="merchant-content">
        {/* Welcome Banner */}
        <div className="seller-welcome-row">
          <div>
            <h1>Welcome back, {user?.shop_name || user?.name || "Seller"}</h1>
            <p className="subtitle-text">Here's what's happening with your store today</p>
          </div>
          <Link to="/seller/products" className="seller-btn-primary add-product-btn-top">
            <Plus size={16} /> Add Product
          </Link>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="seller-metrics-grid-four">
          {/* Card 1: Net Revenue */}
          <div className="seller-metric-new-card">
            <div className="metric-header-row">
              <span className="metric-title">Net Revenue</span>
              <div className="metric-badge-container">
                <span className="metric-icon-bg green-bg"><DollarSign size={18} /></span>
                <span className="metric-badge-pill green-pill">Live</span>
              </div>
            </div>
            <div className="metric-main-value">{money(netRevenue)}</div>
            <div className="metric-footer-text">
              Gross: {money(grossRevenue)} | Commission: 10%
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="seller-metric-new-card">
            <div className="metric-header-row">
              <span className="metric-title">Total Orders</span>
              <div className="metric-badge-container">
                <span className="metric-icon-bg blue-bg"><ShoppingCart size={18} /></span>
              </div>
            </div>
            <div className="metric-main-value">{totalOrders}</div>
            <div className="metric-footer-text">Lifetime orders from customers</div>
          </div>

          {/* Card 3: Total Products */}
          <div className="seller-metric-new-card">
            <div className="metric-header-row">
              <span className="metric-title">Total Products</span>
              <div className="metric-badge-container">
                <span className="metric-icon-bg teal-bg"><Package size={18} /></span>
              </div>
            </div>
            <div className="metric-main-value">{totalProducts}</div>
            <div className="metric-footer-text">Active product listings</div>
          </div>

          {/* Card 4: Avg Order Value */}
          <div className="seller-metric-new-card">
            <div className="metric-header-row">
              <span className="metric-title">Avg Order Value</span>
              <div className="metric-badge-container">
                <span className="metric-icon-bg orange-bg"><Activity size={18} /></span>
                <span className="metric-badge-pill orange-pill">Live</span>
              </div>
            </div>
            <div className="metric-main-value">{money(avgOrderValue)}</div>
            <div className="metric-footer-text">Average revenue per order</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="seller-dashboard-tabs">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={16} /> Overview
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => { setActiveTab("orders"); navigate("/seller/orders"); }}
          >
            <ShoppingCart size={16} /> Recent Orders
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === "products" ? "active" : ""}`}
            onClick={() => { setActiveTab("products"); navigate("/seller/products"); }}
          >
            <Package size={16} /> Top Products
          </button>
        </div>

        {/* Section 1: Recent Orders & Quick Actions (Grid layout) */}
        <div className="seller-two-col-grid" style={{ marginBottom: 30 }}>
          {/* Left Column: Recent Orders */}
          <div className="seller-panel-white">
            <div className="seller-panel-head">
              <h2>Recent Orders</h2>
              <Link to="/seller/orders" className="view-all-link">View All</Link>
            </div>
            <div className="seller-orders-list">
              {orders.length === 0 ? (
                <p className="no-data-text" style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No orders found.</p>
              ) : (
                orders.slice(0, 3).map((order) => {
                  const itemCount = (order.order_items?.length || order.order_item_count || 1);
                  const dateStr = new Date(order.created_at).toISOString().split('T')[0];
                  return (
                    <div className="seller-order-row-card" key={order.id}>
                      <div className="order-left-part">
                        <div className="order-icon-square">
                          <ShoppingCart size={20} />
                        </div>
                        <div className="order-meta-info">
                          <span className="order-id-code">ORD-2024-{String(order.id).padStart(3, '0')}</span>
                          <span className="order-sub-details">
                            {itemCount} item{itemCount !== 1 ? 's' : ''} • {dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="order-right-part">
                        <span className="order-price-val">{money(order.total_price)}</span>
                        <span className={`order-status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Quick Actions */}
          <div className="seller-panel-white">
            <div className="seller-panel-head">
              <h2>Quick Actions</h2>
            </div>
            <div className="seller-quick-actions-list">
              <Link to="/seller/products" className="quick-action-row-btn">
                <span className="action-icon"><Plus size={16} /></span>
                <span className="action-label">Add Product</span>
              </Link>
              <Link to="/seller/payouts" className="quick-action-row-btn">
                <span className="action-icon"><DollarSign size={16} /></span>
                <span className="action-label">View Earnings</span>
              </Link>
              <Link to="/seller/orders" className="quick-action-row-btn">
                <span className="action-icon"><ShoppingCart size={16} /></span>
                <span className="action-label">Manage Orders</span>
              </Link>
              <Link to="/seller/ai-insights" className="quick-action-row-btn">
                <span className="action-icon"><BrainCircuit size={16} /></span>
                <span className="action-label">AI Insights</span>
              </Link>
              <Link to="/seller/products" className="quick-action-row-btn">
                <span className="action-icon"><Package size={16} /></span>
                <span className="action-label">Products</span>
              </Link>
              <Link to="/seller/settings" className="quick-action-row-btn">
                <span className="action-icon"><Settings size={16} /></span>
                <span className="action-label">Store Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section 2: Revenue Breakdown & Performance Metrics */}
        <div className="seller-two-col-equal-grid">
          {/* Revenue Breakdown */}
          <div className="seller-dashboard-card">
            <h2>Revenue Breakdown</h2>
            <div className="revenue-breakdown-list">
              <div className="revenue-card-item">
                <div className="revenue-card-item-left">
                  <span className="revenue-card-item-title">Gross Revenue</span>
                  <span className="revenue-card-item-value">{money(grossRevenue)}</span>
                </div>
                <div className="revenue-card-icon-badge blue">
                  <DollarSign size={20} />
                </div>
              </div>

              <div className="revenue-card-item">
                <div className="revenue-card-item-left">
                  <span className="revenue-card-item-title">Platform Fee (10%)</span>
                  <span className="revenue-card-item-value negative">-{money(platformFee)}</span>
                </div>
                <div className="revenue-card-icon-badge red">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                </div>
              </div>

              <div className="revenue-card-item net-bg">
                <div className="revenue-card-item-left">
                  <span className="revenue-card-item-title">Net Revenue</span>
                  <span className="revenue-card-item-value net">{money(netRevenue)}</span>
                </div>
                <div className="revenue-card-icon-badge green">
                  <DollarSign size={20} />
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-full-width-outline"
              onClick={() => navigate("/seller/payouts")}
            >
              View Detailed Earnings
            </button>
          </div>

          {/* Performance Metrics */}
          <div className="seller-dashboard-card">
            <h2>Performance Metrics</h2>
            <div className="performance-metrics-list">
              {/* Metric 1 */}
              <div className="perf-row">
                <div className="perf-label-container">
                  <span>Order Completion Rate</span>
                  <span className="perf-val-label">92%</span>
                </div>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill green" style={{ width: "92%" }}></div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="perf-row">
                <div className="perf-label-container">
                  <span>Customer Satisfaction</span>
                  <span className="perf-val-label">4.7 / 5.0</span>
                </div>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill blue" style={{ width: "94%" }}></div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="perf-row">
                <div className="perf-label-container">
                  <span>Response Time</span>
                  <span className="perf-val-label">Excellent</span>
                </div>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill orange" style={{ width: "100%" }}></div>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="perf-row">
                <div className="perf-label-container">
                  <span>Shipping Speed</span>
                  <span className="perf-val-label">Good</span>
                </div>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill cyan" style={{ width: "80%" }}></div>
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="btn-full-width-outline"
              onClick={() => navigate("/seller/ai-insights")}
            >
              Get AI Insights
            </button>
          </div>
        </div>


      </div>
    </div>
  );
}
