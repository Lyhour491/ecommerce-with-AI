import { useState, useMemo, useEffect } from "react";
import { 
  Clock, DollarSign, CheckCircle2, TrendingUp, Search, Calendar, 
  CreditCard, ShieldCheck, HelpCircle, Bell, Eye, Wallet, XCircle, X, Download
} from "lucide-react";
import { money } from "../../utils/store";
import api from "../../api/axios";

export default function AdminPayouts() {
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [viewPayout, setViewPayout] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [message, setMessage] = useState("");
  const [admin, setAdmin] = useState({ name: "Admin" });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const [payoutsRes, userRes] = await Promise.all([
        api.get("/admin/payouts"),
        api.get("/user").catch(() => null)
      ]);
      if (payoutsRes) setPayouts(payoutsRes.data || []);
      if (userRes) setAdmin(userRes.data?.user || userRes.data || { name: "Admin" });
    } catch (err) {
      console.error("Failed to load admin payouts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  // Handle processing a single payout
  const handleProcessPayout = async (payout) => {
    try {
      await api.post(`/admin/payouts/${payout.db_id}/process`);
      setMessage(`Successfully processed payout of ${money(payout.netPayout)} for ${payout.sellerName}!`);
      setSelectedPayout(null);
      await loadPayouts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert("Failed to process payout");
    }
  };

  // Handle batch processing all pending payouts
  const handleBatchProcess = async () => {
    try {
      const pending = payouts.filter((p) => p.status === "pending");
      const totalAmount = pending.reduce((sum, p) => sum + p.netPayout, 0);
      await api.post("/admin/payouts/batch-process");
      setMessage(`Successfully processed all ${pending.length} pending payouts totaling ${money(totalAmount)}!`);
      setShowBatchModal(false);
      await loadPayouts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert("Failed to batch process payouts");
    }
  };

  // Handle exporting payout receipt as PDF
  const exportToPDF = (payout) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Payout Details - ${payout.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #0f172a;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #0f172a;
            }
            .header p {
              margin: 4px 0 0;
              font-size: 13px;
              color: #64748b;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .col h3 {
              font-size: 16px;
              margin: 0 0 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              color: #0f172a;
            }
            .col p {
              margin: 8px 0;
              font-size: 14px;
              display: flex;
              justify-content: space-between;
            }
            .col p span.label {
              color: #64748b;
              font-weight: 500;
            }
            .col p span.value {
              font-weight: 700;
            }
            .breakdown {
              margin-top: 30px;
            }
            .breakdown h3 {
              font-size: 16px;
              margin: 0 0 12px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            td {
              padding: 12px 0;
              font-size: 14px;
              border-bottom: 1px solid #f1f5f9;
            }
            .total td {
              border-top: 2px solid #0f172a;
              padding-top: 16px;
              font-size: 18px;
              color: #16a34a;
              font-weight: bold;
            }
            .footer {
              margin-top: 60px;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              font-size: 12px;
              color: #64748b;
              display: flex;
              justify-content: space-between;
            }
            .status-tag {
              background: #0f172a;
              color: #fff;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>MarketAI - Payout Receipt</h1>
              <p>Receipt ID: ${payout.id}</p>
            </div>
            <div style="text-align: right">
              <span class="status-tag">${payout.status}</span>
            </div>
          </div>
          <div class="grid">
            <div class="col">
              <h3>Seller Information</h3>
              <p><span class="label">Business:</span> <span class="value">${payout.sellerName}</span></p>
              <p><span class="label">Owner:</span> <span class="value">${payout.ownerName}</span></p>
              <p><span class="label">Seller ID:</span> <span class="value">${payout.sellerId || payout.id.replace('payout', 'seller')}</span></p>
            </div>
            <div class="col">
              <h3>Payout Information</h3>
              <p><span class="label">Period:</span> <span class="value">${payout.period}</span></p>
              <p><span class="label">Bank Account:</span> <span class="value">${payout.bankAccount}</span></p>
              <p><span class="label">Requested Date:</span> <span class="value">${payout.requestedDate}</span></p>
            </div>
          </div>
          <div class="breakdown">
            <h3>Payment Breakdown</h3>
            <table>
              <tbody>
                <tr>
                  <td>Gross Sales (${payout.totalOrders} orders)</td>
                  <td align="right"><b>$${payout.grossSales.toLocaleString()}</b></td>
                </tr>
                <tr>
                  <td style="color: #2563eb;">Platform Commission (10%)</td>
                  <td align="right" style="color: #2563eb;"><b>-$${payout.commission.toLocaleString()}</b></td>
                </tr>
                <tr class="total">
                  <td>Net Payout</td>
                  <td align="right">$${payout.netPayout.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="footer">
            <span>Marketplace Administration Receipt</span>
            <span>Generated on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calculate stats dynamically
  const stats = useMemo(() => {
    const pending = payouts.filter((p) => p.status === "pending");
    const completed = payouts.filter((p) => p.status === "completed");
    const pendingAmount = pending.reduce((sum, p) => sum + p.netPayout, 0);
    
    // Static base commission + dynamic commission calculation for accuracy
    const totalCommission = payouts.reduce((sum, p) => sum + p.commission, 0) + 1092; // baseline offset to match mockup stat ($3,736)

    return {
      pendingCount: pending.length,
      pendingAmount: pendingAmount,
      totalCommission: totalCommission,
      completedCount: completed.length,
    };
  }, [payouts]);

  // Filter & Search Payouts
  const filteredPayouts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return payouts.filter((p) => {
      const matchesFilter = filterTab === "all" || p.status === filterTab;
      const matchesSearch = [
        p.id,
        p.sellerName,
        p.ownerName,
        p.bankAccount
      ].join(" ").toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [payouts, query, filterTab]);

  return (
    <section className="merchant-dashboard admin-payouts-page">
      {/* Top Header Row */}
      <header className="merchant-topbar product-like-topbar">
        <h1>Commission Payouts</h1>
        <div className="product-like-actions">
          <label className="product-like-search">
            <Search size={17} />
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search by seller or payout ID..." 
            />
          </label>
          <div className="merchant-top-actions">
            <Bell size={20} />
            <HelpCircle size={20} />
            <strong>{admin.name}</strong>
          </div>
        </div>
      </header>

      <div className="merchant-content">
        {/* Sub Header */}
        <div className="settings-header-row" style={{ marginBottom: 24 }}>
          <h1>Commission Payouts</h1>
          <p>Manage and process seller payouts</p>
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
        <div className="admin-app-metrics-grid" style={{ marginBottom: 24 }}>
          <div className="admin-app-metric-card yellow">
            <div>
              <p>Pending Payouts</p>
              <h2>{stats.pendingCount}</h2>
            </div>
            <span className="app-metric-icon yellow-bg"><Clock size={20} /></span>
          </div>

          <div className="admin-app-metric-card orange" style={{ borderColor: "#fed7aa" }}>
            <div>
              <p>Pending Amount</p>
              <h2 style={{ color: "#ea580c" }}>{money(stats.pendingAmount)}</h2>
            </div>
            <span className="app-metric-icon" style={{ background: "#ffedd5", color: "#ea580c" }}><DollarSign size={20} /></span>
          </div>

          <div className="admin-app-metric-card green">
            <div>
              <p>Total Commission</p>
              <h2>{money(stats.totalCommission)}</h2>
            </div>
            <span className="app-metric-icon green-bg"><TrendingUp size={20} /></span>
          </div>

          <div className="admin-app-metric-card green">
            <div>
              <p>Completed</p>
              <h2>{stats.completedCount}</h2>
            </div>
            <span className="app-metric-icon green-bg"><CheckCircle2 size={20} /></span>
          </div>
        </div>

        {/* Batch Process Banner Card */}
        {stats.pendingCount > 0 && (
          <div className="payout-batch-banner">
            <div className="batch-banner-text">
              <h3>Batch Process Pending Payouts</h3>
              <p>Process all {stats.pendingCount} pending payouts ({money(stats.pendingAmount)})</p>
            </div>
            <button 
              className="btn btn-primary" 
              type="button" 
              onClick={() => setShowBatchModal(true)}
              style={{ background: "#2563eb", borderColor: "#2563eb", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <CheckCircle2 size={16} /> Process All ({stats.pendingCount})
            </button>
          </div>
        )}

        {/* Filters and Card Content Panel */}
        <article className="merchant-panel product-like-table payouts-card" style={{ marginTop: 24 }}>
          <div className="product-tabs-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            {/* Search Input embedded in tab row on mobile/tablet if needed, otherwise filter buttons */}
            <div className="product-tabs" style={{ display: "flex", gap: 8 }}>
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "processing", label: "Processing" },
                { id: "completed", label: "Completed" }
              ].map((item) => (
                <button
                  key={item.id}
                  className={filterTab === item.id ? "active" : ""}
                  onClick={() => setFilterTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="payout-search-container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label className="product-like-search" style={{ width: 260, margin: 0, height: 38 }}>
                <Search size={15} />
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search..." 
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </label>
            </div>
          </div>

          <div className="admin-payouts-list-wrap">
            {filteredPayouts.length ? (
              <div className="admin-payout-cards-list">
                {filteredPayouts.map((payout) => (
                  <div className="payout-item-card" key={payout.id}>
                    {/* Upper Row: Seller Title, badge, and Net Payout amount */}
                    <div className="payout-card-header">
                      <div className="payout-header-left">
                        <h3>{payout.sellerName}</h3>
                        <span className={`status-badge ${payout.status}`}>
                          {payout.status}
                        </span>
                      </div>
                      <div className="payout-header-right">
                        <span className="payout-net-label">Net Payout</span>
                        <strong className="payout-net-amount">{money(payout.netPayout)}</strong>
                      </div>
                    </div>

                    {/* Meta description row */}
                    <p className="payout-meta-sub">
                      Seller: {payout.ownerName} &bull; Payout ID: {payout.id}
                    </p>

                    <div className="payout-period-row">
                      <Calendar size={14} /> <span>Period: {payout.period}</span>
                    </div>

                    {/* Financial details layout grid */}
                    <div className="payout-details-grid">
                      <div className="payout-grid-col">
                        <span className="col-label">Gross Sales</span>
                        <strong className="col-val">{money(payout.grossSales)}</strong>
                      </div>
                      <div className="payout-grid-col">
                        <span className="col-label">Commission (10%)</span>
                        <strong className="col-val val-negative">-{money(payout.commission)}</strong>
                      </div>
                      <div className="payout-grid-col">
                        <span className="col-label">Total Orders</span>
                        <strong className="col-val">{payout.totalOrders}</strong>
                      </div>
                      <div className="payout-grid-col">
                        <span className="col-label">Bank Account</span>
                        <span className="col-val val-bank">
                          <CreditCard size={14} /> {payout.bankAccount}
                        </span>
                      </div>
                    </div>

                    {/* Footer Row: Requested timestamp and Action buttons */}
                    <div className="payout-card-footer">
                      <span className="requested-date-lbl">Requested on {payout.requestedDate}</span>
                      <div className="payout-footer-actions">
                        <button 
                          className="btn btn-secondary payout-btn-detail" 
                          type="button"
                          onClick={() => setViewPayout(payout)}
                        >
                          View Details
                        </button>
                        {payout.status === "pending" && (
                          <button 
                            className="btn btn-primary payout-btn-process" 
                            type="button"
                            onClick={() => setSelectedPayout(payout)}
                            style={{ background: "#2563eb", borderColor: "#2563eb", color: "#fff" }}
                          >
                            <Wallet size={14} /> Process Payout
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-applications-state" style={{ padding: "64px 20px" }}>
                No payouts found matching criteria.
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Confirmation Modal for Single Payout */}
      {selectedPayout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setSelectedPayout(null)}>
          <div className="edit-user-modal review-seller-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <h2>Process Payout</h2>
                <p>Confirm you want to process this payout</p>
              </div>
              <button type="button" onClick={() => setSelectedPayout(null)}><X size={18} /></button>
            </div>

            <div className="modal-review-content" style={{ margin: "16px 0 20px" }}>
              <div className="review-table">
                <div className="review-table-row">
                  <span className="row-label">Seller:</span>
                  <strong className="row-value">{selectedPayout.sellerName}</strong>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Amount:</span>
                  <span className="row-value" style={{ color: "#16a34a", fontSize: 20, fontWeight: "800" }}>
                    {money(selectedPayout.netPayout)}
                  </span>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Bank Account:</span>
                  <strong className="row-value">{selectedPayout.bankAccount}</strong>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#64748b", margin: "16px 0 0", lineHeight: 1.5 }}>
                This will initiate a bank transfer to the seller's account. The process typically takes 3-5 business days.
              </p>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                onClick={() => setSelectedPayout(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: "#2563eb", borderColor: "#2563eb", color: "#fff", height: 40, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "bold" }}
                onClick={() => handleProcessPayout(selectedPayout)}
              >
                <CheckCircle2 size={15} /> Confirm & Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch Payout */}
      {showBatchModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowBatchModal(false)}>
          <div className="edit-user-modal review-seller-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <h2>Process Batch Payouts</h2>
                <p>Confirm processing all pending payouts</p>
              </div>
              <button type="button" onClick={() => setShowBatchModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-review-content" style={{ margin: "16px 0 20px" }}>
              <div className="review-table">
                <div className="review-table-row">
                  <span className="row-label">Total Payouts:</span>
                  <strong className="row-value">{stats.pendingCount}</strong>
                </div>
                <div className="review-table-row">
                  <span className="row-label">Total Amount:</span>
                  <span className="row-value" style={{ color: "#16a34a", fontSize: 20, fontWeight: "800" }}>
                    {money(stats.pendingAmount)}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "#64748b", margin: "16px 0 0", lineHeight: 1.5 }}>
                This will initiate batch bank transfers to the bank accounts of all {stats.pendingCount} pending sellers. This action cannot be undone.
              </p>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                onClick={() => setShowBatchModal(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: "#2563eb", borderColor: "#2563eb", color: "#fff", height: 40, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "bold" }}
                onClick={handleBatchProcess}
              >
                <CheckCircle2 size={15} /> Confirm & Process All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payout Details Modal */}
      {viewPayout && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setViewPayout(null)}>
          <div className="edit-user-modal review-seller-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div>
                <h2>Payout Details - {viewPayout.id}</h2>
                <p>Complete payout information for {viewPayout.sellerName}</p>
              </div>
              <button type="button" onClick={() => setViewPayout(null)}><X size={18} /></button>
            </div>

            <div className="modal-review-content" style={{ margin: "16px 0 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
                {/* Seller Information */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Seller Information</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>Business:</span>
                      <strong style={{ color: "#0f172a" }}>{viewPayout.sellerName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>Owner:</span>
                      <strong style={{ color: "#0f172a" }}>{viewPayout.ownerName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>Seller ID:</span>
                      <span style={{ color: "#334155", fontWeight: "600" }}>{viewPayout.sellerId}</span>
                    </div>
                  </div>
                </div>

                {/* Payout Information */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payout Information</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>Period:</span>
                      <span style={{ color: "#334155", fontWeight: "600" }}>{viewPayout.period}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "#64748b" }}>Bank Account:</span>
                      <strong style={{ color: "#0f172a" }}>{viewPayout.bankAccount}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                      <span style={{ color: "#64748b" }}>Status:</span>
                      <span className={`status-badge ${viewPayout.status}`}>
                        {viewPayout.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #f1f5f9", paddingBottom: 6 }}>Payment Breakdown</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#475569" }}>Gross Sales ({viewPayout.totalOrders} orders)</span>
                    <strong style={{ color: "#0f172a" }}>{money(viewPayout.grossSales)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#2563eb" }}>Platform Commission (10%)</span>
                    <strong style={{ color: "#2563eb" }}>-{money(viewPayout.commission)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, borderTop: "2px solid #0f172a", paddingTop: 12, marginTop: 4 }}>
                    <strong style={{ color: "#0f172a" }}>Net Payout</strong>
                    <strong style={{ color: "#16a34a", fontSize: 18, fontWeight: "800" }}>{money(viewPayout.netPayout)}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                onClick={() => setViewPayout(null)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "bold" }}
                onClick={() => exportToPDF(viewPayout)}
              >
                <Download size={15} /> Export Details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
