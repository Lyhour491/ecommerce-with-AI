import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import api from "../../api/axios";

export default function SellerAiInsights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/seller/ai-insights");
      const list = Array.isArray(res.data?.insights) ? res.data.insights : [];
      setInsights(list);
    } catch (err) {
      setError("Failed to load AI recommendations.");
      console.error("AI Insights fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const getIcon = (color) => {
    if (color === "green") return <DollarSign size={20} />;
    if (color === "blue") return <TrendingUp size={20} />;
    return <AlertCircle size={20} />;
  };

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

        {error && <div className="alert alert-error" style={{ marginTop: 20 }}>{error}</div>}

        {loading ? (
          <div className="seller-loading" style={{ marginTop: 24 }}>Loading AI Recommendations...</div>
        ) : insights.length === 0 ? (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", background: "white", marginTop: 24 }}>
            No recommendations generated. Add more products and complete transactions to train the AI model.
          </div>
        ) : (
          /* Core Insights List */
          <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
            {insights.map((insight) => (
              <div className="card" key={insight.id} style={{ background: "white", padding: 26, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div className={`metric-icon ${insight.color || "blue"}`} style={{ width: 44, height: 44, borderRadius: 12, marginTop: 4 }}>
                      {getIcon(insight.color)}
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
        )}

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
