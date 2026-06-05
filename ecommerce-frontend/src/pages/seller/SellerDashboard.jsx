import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money } from "../../utils/store";
import { Package, TrendingUp, DollarSign, Archive } from "lucide-react";

export default function SellerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/seller/stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="seller-loading">Loading dashboard...</div>;
  }

  const cards = [
    {
      label: "Total Products",
      value: stats?.total_products ?? 0,
      icon: <Package size={24} />,
      color: "#4f6ef7",
    },
    {
      label: "Total Stock",
      value: stats?.total_stock ?? 0,
      icon: <Archive size={24} />,
      color: "#10b981",
    },
    {
      label: "Items Sold",
      value: stats?.total_sold ?? 0,
      icon: <TrendingUp size={24} />,
      color: "#f59e0b",
    },
    {
      label: "Total Revenue",
      value: money(stats?.total_revenue ?? 0),
      icon: <DollarSign size={24} />,
      color: "#ef4444",
    },
  ];

  return (
    <div className="seller-dashboard">
      <div className="seller-page-header">
        <h1>Seller Dashboard</h1>
        <p>Overview of your store performance</p>
      </div>

      <div className="seller-stats-grid">
        {cards.map((card) => (
          <div className="seller-stat-card" key={card.label}>
            <div className="seller-stat-icon" style={{ background: card.color + "18", color: card.color }}>
              {card.icon}
            </div>
            <div className="seller-stat-info">
              <span className="seller-stat-value">{card.value}</span>
              <span className="seller-stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="seller-quick-actions">
        <h2>Quick Actions</h2>
        <div className="seller-action-cards">
          <a href="/seller/products" className="seller-action-card">
            <Package size={28} />
            <span>Manage Products</span>
            <p>Add, edit, or remove your listings</p>
          </a>
          <a href="/seller/orders" className="seller-action-card">
            <TrendingUp size={28} />
            <span>View Orders</span>
            <p>Track orders for your products</p>
          </a>
        </div>
      </div>
    </div>
  );
}
