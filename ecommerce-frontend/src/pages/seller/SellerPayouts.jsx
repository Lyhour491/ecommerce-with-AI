import { useState } from "react";
import { money } from "../../utils/store";
import { DollarSign, Send, CheckCircle, Clock, X } from "lucide-react";

export default function SellerPayouts() {
  const [balance, setBalance] = useState(750.00);
  const [showModal, setShowModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("bank");
  const [amount, setAmount] = useState("750.00");
  const [accountDetails, setAccountDetails] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([
    { id: 1, date: "2026-05-15", amount: 1250.00, method: "Bank Transfer", ref: "TXN-902831", status: "completed" },
    { id: 2, date: "2026-04-15", amount: 840.50, method: "PayPal", ref: "TXN-382910", status: "completed" },
    { id: 3, date: "2026-03-15", amount: 620.00, method: "Bank Transfer", ref: "TXN-108293", status: "completed" },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    
    setTimeout(() => {
      const parsedAmount = parseFloat(amount) || 0;
      if (parsedAmount <= 0 || parsedAmount > balance) {
        alert("Invalid withdrawal amount.");
        setLoading(false);
        return;
      }

      const newRecord = {
        id: Date.now(),
        date: new Date().toISOString().split("T")[0],
        amount: parsedAmount,
        method: payoutMethod === "bank" ? "Bank Transfer" : "PayPal",
        ref: "TXN-" + Math.floor(100000 + Math.random() * 900000),
        status: "pending",
      };

      setHistory([newRecord, ...history]);
      setBalance(balance - parsedAmount);
      setSuccessMsg("Payout request submitted successfully!");
      setLoading(false);
      
      // Auto close modal
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
      }, 2000);
    }, 1000);
  };

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Payout Ledger</h1>
        </div>
        <div className="merchant-top-actions">
          <span>Ledger Currency: <b>USD ($)</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row">
          <h1>Payouts & Earnings</h1>
          <p>Request withdrawals and view your merchant transaction history.</p>
        </div>

        <div className="merchant-grid-main" style={{ marginTop: 24 }}>
          {/* Earnings Card */}
          <div className="merchant-panel" style={{ height: "fit-content", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "var(--muted)", margin: "0 0 6px", fontWeight: "bold" }}>Available for Payout</p>
                <h2 style={{ fontSize: 36, margin: 0, color: "var(--primary)", fontWeight: 900 }}>{money(balance)}</h2>
              </div>
              <div className="metric-icon green" style={{ width: 44, height: 44, borderRadius: 12 }}>
                <DollarSign size={20} />
              </div>
            </div>

            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              Requests are processed instantly to your primary payout method. Funds typically settle within 1-2 business days.
            </p>

            <button
              className="btn-add-product"
              style={{ width: "100%", height: 48, borderRadius: 12, justifyContent: "center" }}
              disabled={balance <= 0}
              onClick={() => { setAmount(balance.toFixed(2)); setShowModal(true); }}
            >
              <Send size={18} /> Request Payout
            </button>
          </div>

          {/* History Panel */}
          <div className="merchant-panel">
            <h2>Payout History</h2>
            <div className="product-like-table-wrap" style={{ marginTop: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "12px 8px", color: "var(--muted)", fontSize: 12 }}>Date</th>
                    <th style={{ padding: "12px 8px", color: "var(--muted)", fontSize: 12 }}>Amount</th>
                    <th style={{ padding: "12px 8px", color: "var(--muted)", fontSize: 12 }}>Method</th>
                    <th style={{ padding: "12px 8px", color: "var(--muted)", fontSize: 12 }}>Reference ID</th>
                    <th style={{ padding: "12px 8px", color: "var(--muted)", fontSize: 12 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "16px 8px" }}>{record.date}</td>
                      <td style={{ padding: "16px 8px" }}><strong>{money(record.amount)}</strong></td>
                      <td style={{ padding: "16px 8px" }}>{record.method}</td>
                      <td style={{ padding: "16px 8px", color: "#64748b", fontFamily: "monospace" }}>{record.ref}</td>
                      <td style={{ padding: "16px 8px" }}>
                        {record.status === "completed" ? (
                          <span className="status completed" style={{ fontSize: 11 }}>Completed</span>
                        ) : (
                          <span className="status pending" style={{ fontSize: 11 }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Request Payout Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="edit-user-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Request Payout</h2>
                  <p>Transfer available store funds to your account.</p>
                </div>
                <button onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>

              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <form onSubmit={handleSubmit} className="stitch-form">
                <label>
                  <span>Withdrawal Amount *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Max: {money(balance)}</span>
                </label>

                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#64748b" }}>Transfer Method</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <label className={`ship-option ${payoutMethod === "bank" ? "active" : ""}`} style={{ flex: 1, cursor: "pointer", padding: 12 }}>
                      <input type="radio" name="payoutMethod" checked={payoutMethod === "bank"} onChange={() => setPayoutMethod("bank")} />
                      <b>Bank Account<small>Settle in 1-2 days</small></b>
                    </label>
                    <label className={`ship-option ${payoutMethod === "paypal" ? "active" : ""}`} style={{ flex: 1, cursor: "pointer", padding: 12 }}>
                      <input type="radio" name="payoutMethod" checked={payoutMethod === "paypal"} onChange={() => setPayoutMethod("paypal")} />
                      <b>PayPal<small>Instant transfer</small></b>
                    </label>
                  </div>
                </div>

                <label style={{ marginTop: 8 }}>
                  <span>{payoutMethod === "bank" ? "Bank Routing & Account Numbers *" : "PayPal Email Address *"}</span>
                  <input
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    placeholder={payoutMethod === "bank" ? "Routing: 123456789, Account: 987654321" : "seller@example.com"}
                    required
                  />
                </label>

                <div className="modal-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-add-product" disabled={loading}>
                    {loading ? "Processing..." : "Confirm Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
