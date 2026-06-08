import { Sparkles, TrendingUp, DollarSign, AlertCircle, Award } from "lucide-react";

export default function SellerAiInsights() {
  const insights = [
    {
      id: 1,
      title: "High Demand Recommendation",
      category: "Inventory Optimization",
      desc: "Audio & Sound categories are showing a 45% month-over-month increase in volume sales. Your catalog product 'ProSeries Wireless Headphones' currently has 48 units left, which is estimated to sell out within 14 days at the current run-rate.",
      impact: "Consider restocking an additional 50 units to prevent potential stockouts during high season.",
      metric: "Potential Sales Loss: $4,890.00",
      color: "blue",
      icon: <TrendingUp size={20} />,
    },
    {
      id: 2,
      title: "Pricing Optimization Opportunity",
      category: "Revenue Maximization",
      desc: "Market data shows similar listings for 'Carbon Fiber Travel Case' are priced between $39.00 and $44.00, while your current listing is priced at $49.00. Competitor price points are capturing 65% more volume.",
      impact: "We recommend dropping your price to $42.00. This is predicted to increase weekly sales velocity by 120%, resulting in higher total weekly profits.",
      metric: "Predicted Net Profit Gain: +24%",
      color: "green",
      icon: <DollarSign size={20} />,
    },
    {
      id: 3,
      title: "Shipping Performance Alert",
      category: "Customer Experience",
      desc: "Based on 3 critical customer reviews received in the last 7 days, buyers have reported standard shipping times taking up to 6 business days. Slow shipping decreases repeat purchase rate by 30%.",
      impact: "Consider utilizing Cambodia Post Express or DHL Ecommerce services to fulfill orders faster and maintain your 4.8 star rating.",
      metric: "Customer Satisfaction: Risk of drop to 4.5",
      color: "orange",
      icon: <AlertCircle size={20} />,
    },
  ];

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Sparkles size={20} style={{ color: "#8b5cf6" }} />
          <h1>AI-Powered Analytics</h1>
        </div>
        <div className="merchant-top-actions">
          <span>AI Model Accuracy: <b>98.4%</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row">
          <h1>AI Financial Insights</h1>
          <p>Automated recommendations and opportunities generated based on your catalog and sales history.</p>
        </div>

        {/* Core Insights List */}
        <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
          {insights.map((insight) => (
            <div className="card" key={insight.id} style={{ background: "white", padding: 26, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className={`metric-icon ${insight.color}`} style={{ width: 44, height: 44, borderRadius: 12, marginTop: 4 }}>
                    {insight.icon}
                  </div>
                  <div>
                    <span style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 900, color: "var(--muted)", letterSpacing: ".04em" }}>
                      {insight.category}
                    </span>
                    <h2 style={{ fontSize: 20, margin: "4px 0 12px" }}>{insight.title}</h2>
                    <p style={{ color: "var(--text)", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 780, fontSize: 14 }}>
                      {insight.desc}
                    </p>
                    <div style={{ background: "#f8fafc", borderLeft: `3px solid var(--border)`, padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: 16 }}>
                      <strong style={{ fontSize: 13, display: "block", color: "var(--text)", marginBottom: 4 }}>AI Recommendation:</strong>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{insight.impact}</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: "#edf2f7", borderRadius: 12, padding: "16px 20px", textAlign: "right" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: "bold" }}>Projected Impact</span>
                  <strong style={{ display: "block", fontSize: 18, color: "var(--primary)", marginTop: 6 }}>
                    {insight.metric}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Panel: General Advice */}
        <div className="card" style={{ marginTop: 28, background: "linear-gradient(135deg, #eff6ff, #f5f3ff)", border: "1px solid #dbeafe", padding: 24, display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#3b82f6", display: "grid", placeItems: "center", color: "white", fontSize: 22 }}>
            💡
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Maximize Your Marketplace Visibility</h3>
            <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
              Stores that keep zero out-of-stock items have a <b>3.5x higher</b> catalog placement rate in search recommendations. Check your inventory weekly to maintain steady sales velocity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
