import { useState, useMemo } from "react";
import { 
  AlertTriangle, Clock, CheckCircle2, Percent, Search, Filter, 
  MoreVertical, Calendar, User, ShoppingCart, DollarSign, X, Edit3, ArrowRight, Bell, CircleHelp
} from "lucide-react";
import { money } from "../../utils/store";

export default function AdminDisputes() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [message, setMessage] = useState("");
  const [admin] = useState({ name: "Admin" });

  const [disputes, setDisputes] = useState([
    {
      id: "DSP-001",
      orderNumber: "10034",
      customerName: "Alice Johnson",
      reason: "Item Not Received",
      statement: "The package shows as delivered, but I have not received it. The shipping company has not responded to my inquiries.",
      amount: 349.00,
      status: "pending",
      date: "Jan 10, 2026"
    },
    {
      id: "DSP-002",
      orderNumber: "10037",
      customerName: "Bob Smith",
      reason: "Product Defective",
      statement: "The screen on the precision watch has a severe crack right out of the box. I would like a full refund.",
      amount: 199.00,
      status: "pending",
      date: "Jan 12, 2026"
    },
    {
      id: "DSP-003",
      orderNumber: "10031",
      customerName: "Charlie Brown",
      reason: "Wrong Item Sent",
      statement: "I ordered the Nordic Oak stand, but received a plastic shoe stand instead. Very disappointing.",
      amount: 35.00,
      status: "refunded",
      date: "Jan 05, 2026"
    },
    {
      id: "DSP-004",
      orderNumber: "10028",
      customerName: "Diana Prince",
      reason: "Item Not Received",
      statement: "Ordered watch last month. Tracking information is not updating and the seller does not reply.",
      amount: 249.00,
      status: "resolved",
      date: "Jan 02, 2026"
    },
    {
      id: "DSP-005",
      orderNumber: "10042",
      customerName: "Ethan Hunt",
      reason: "Defective Item",
      statement: "Earbuds audio is crackling on the left side. Seller ignored replacement request.",
      amount: 199.00,
      status: "pending",
      date: "Jan 14, 2026"
    }
  ]);

  // Reject Claim: Mark dispute as Resolved (claim denied)
  const handleRejectClaim = (dispute) => {
    setDisputes((prev) =>
      prev.map((item) => (item.id === dispute.id ? { ...item, status: "resolved" } : item))
    );
    setMessage(`Dispute ${dispute.id} has been closed/resolved. Customer claim rejected.`);
    setSelectedDispute(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Refund Customer: Mark dispute as Refunded (money returned)
  const handleRefundCustomer = (dispute) => {
    setDisputes((prev) =>
      prev.map((item) => (item.id === dispute.id ? { ...item, status: "refunded" } : item))
    );
    setMessage(`Dispute ${dispute.id} resolved. Successfully refunded ${money(dispute.amount)} to ${dispute.customerName}.`);
    setSelectedDispute(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const active = disputes.filter((d) => d.status === "pending").length;
    const refunded = disputes.filter((d) => d.status === "refunded").length;
    // Ratio formula simulation: Active / (Total resolved + Active)
    const ratio = "0.15%"; 

    return [
      { label: "Active Disputes", value: active.toString(), note: "Awaiting action", icon: AlertTriangle, tone: "red" },
      { label: "Pending Review", value: active.toString(), note: "Review queue", icon: Clock, tone: "orange" },
      { label: "Refunded Claims", value: refunded.toString(), note: "Closed disputes", icon: CheckCircle2, tone: "green" },
      { label: "Chargeback Ratio", value: ratio, note: "Platform health", icon: Percent, tone: "purple" },
    ];
  }, [disputes]);

  // Filter & Search Disputes
  const filteredDisputes = useMemo(() => {
    const search = query.trim().toLowerCase();
    return disputes.filter((d) => {
      const matchesTab = tab === "all" || d.status === tab;
      const searchable = [
        d.id,
        d.orderNumber,
        d.customerName,
        d.reason,
        d.statement
      ].join(" ").toLowerCase();
      return matchesTab && (!search || searchable.includes(search));
    });
  }, [disputes, query, tab]);

  return (
    <section className="merchant-dashboard admin-disputes-page">
      <header className="merchant-topbar product-like-topbar">
        <h1>Dispute Resolution</h1>
        <div className="product-like-actions">
          <label className="product-like-search">
            <Search size={17} />
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search disputes..." 
            />
          </label>
          <div className="merchant-top-actions">
            <Bell size={20} />
            <CircleHelp size={20} />
            <strong>{admin.name}</strong>
            <span className="mini-profile">D</span>
          </div>
        </div>
      </header>

      <div className="merchant-content">
        {/* Header Row */}
        <div className="settings-header-row" style={{ marginBottom: 24 }}>
          <h1>Disputes & Chargebacks</h1>
          <p>Review and resolve customer disputes and transaction inquiries</p>
        </div>

        {message && (
          <div className="alert alert-success" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{message}</span>
            <button onClick={() => setMessage("")} style={{ background: "transparent", color: "inherit", border: "0", cursor: "pointer" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Metrics Grid */}
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

        {/* Disputes Table Panel */}
        <article className="merchant-panel product-like-table disputes-management-card">
          <div className="product-tabs-row">
            <div className="product-tabs">
              {[
                { id: "all", label: "All Disputes" },
                { id: "pending", label: "Pending" },
                { id: "resolved", label: "Resolved" },
                { id: "refunded", label: "Refunded" }
              ].map((item) => (
                <button
                  key={item.id}
                  className={tab === item.id ? "active" : ""}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="table-tools"><Filter size={17} /><MoreVertical size={18} /></div>
          </div>

          <div className="product-like-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dispute ID</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.length ? filteredDisputes.map((dispute) => (
                  <tr key={dispute.id}>
                    <td><strong>{dispute.id}</strong></td>
                    <td><strong>#{dispute.orderNumber}</strong></td>
                    <td>
                      <strong>{dispute.customerName}</strong>
                    </td>
                    <td>{dispute.reason}</td>
                    <td><strong>{money(dispute.amount)}</strong></td>
                    <td>
                      <span className={`status-badge ${dispute.status}`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td>{dispute.date}</td>
                    <td>
                      <button 
                        className="edit-user-btn" 
                        type="button"
                        onClick={() => setSelectedDispute(dispute)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <ArrowRight size={15} /> Review
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8" className="empty-orders">No disputes found matching criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* Review Dispute Modal */}
      {selectedDispute && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setSelectedDispute(null)}>
          <div className="edit-user-modal review-seller-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="modal-header">
              <div>
                <h2>Review Dispute - {selectedDispute.id}</h2>
                <p>Verify customer claim details before deciding</p>
              </div>
              <button type="button" onClick={() => setSelectedDispute(null)}><X size={18} /></button>
            </div>

            <div className="modal-review-content" style={{ margin: "16px 0 20px" }}>
              <div className="review-table">
                <div className="review-table-row">
                  <span className="row-label">Order Reference:</span>
                  <strong className="row-value">#{selectedDispute.orderNumber}</strong>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Customer Name:</span>
                  <span className="row-value">{selectedDispute.customerName}</span>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Requested Refund:</span>
                  <span className="row-value" style={{ color: "var(--danger)", fontWeight: "800" }}>
                    {money(selectedDispute.amount)}
                  </span>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Reason Category:</span>
                  <strong className="row-value">{selectedDispute.reason}</strong>
                </div>
              </div>

              {/* Customer Statement */}
              <div className="review-section full-width" style={{ marginTop: 16 }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Statement</h4>
                <p className="description-text">
                  "{selectedDispute.statement}"
                </p>
              </div>

              <p style={{ fontSize: 12, color: "#64748b", margin: "18px 0 0", lineHeight: 1.4 }}>
                Refunding the customer will automatically return the transaction value and close this case. Rejecting the claim will close the case in favor of the merchant.
              </p>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                onClick={() => setSelectedDispute(null)}
              >
                Cancel
              </button>
              {selectedDispute.status === "pending" && (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ height: 40, padding: "0 18px", color: "var(--danger)", borderColor: "#fecaca", background: "#fef2f2", fontSize: 13, fontWeight: "bold" }}
                    onClick={() => handleRejectClaim(selectedDispute)}
                  >
                    Reject Claim
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff", height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                    onClick={() => handleRefundCustomer(selectedDispute)}
                  >
                    Refund Customer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
