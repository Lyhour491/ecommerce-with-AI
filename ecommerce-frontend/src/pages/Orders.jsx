import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";
import { useDocumentTitle } from "../utils/seo";
import { 
  Package, Heart, TrendingUp, ShoppingCart, 
  Search, Settings, ArrowLeft, Store, ChevronRight,
  Eye, RefreshCw, MessageSquare, Download, MapPin, 
  CreditCard, CheckCircle2, Truck, Check, Star, FileText, HelpCircle, Phone
} from "lucide-react";

function Orders() {
  useDocumentTitle("My Dashboard & Orders - Track Shipments", "View orders history, check delivery tracker statuses, download digital invoices, or contact sellers directly.");
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState("dashboard"); // "dashboard", "orders_list", or "order_details"
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [downloading, setDownloading] = useState(false);
  
  // Chat state hooks
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatTrigger, setChatTrigger] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);

  // Load chat messages from backend API
  useEffect(() => {
    if (showChatModal && selectedOrder) {
      api.get(`/orders/${selectedOrder.id}/messages`)
        .then((res) => {
          setChatMessages(res.data || []);
        })
        .catch((err) => console.error("Failed to load chat messages", err));
    }
  }, [showChatModal, selectedOrder, chatTrigger]);

  // Send customer message to backend API
  const handleSendMessage = (orderId) => {
    if (!chatInput.trim()) return;
    
    api.post(`/orders/${orderId}/messages`, { text: chatInput })
      .then(() => {
        setChatInput("");
        setChatTrigger((t) => t + 1);
      })
      .catch((err) => console.error("Failed to send message", err));
  };

  // Get current user details to check roles
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };
  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  const isSeller = role === "seller" || role === "admin";

  // Wishlist count
  const wishlistCount = (() => {
    try {
      return JSON.parse(localStorage.getItem("wishlist") || "[]").length;
    } catch {
      return 0;
    }
  })();

  useEffect(() => {
    // Fetch orders
    api.get("/orders")
      .then((res) => setOrders(unwrapList(res.data, ["orders"])))
      .catch((err) => {
        if (err.response?.status === 401) navigate("/login");
        else setError(firstApiError(err, "Failed to load orders."));
      })
      .finally(() => setLoading(false));

    // Fetch cart items count
    api.get("/cart")
      .then((res) => {
        const items = unwrapList(res.data, ["cart", "items", "cart_items"]);
        setCartCount(items.length);
      })
      .catch((err) => console.error("Failed to load cart count", err));

    // Fetch recommended products
    api.get("/top-products")
      .then((res) => {
        setRecommendations(unwrapList(res.data, ["products", "top_products"]).slice(0, 4));
      })
      .catch(() => {
        api.get("/products")
          .then((res) => {
            setRecommendations(unwrapList(res.data, ["products"]).slice(0, 4));
          })
          .catch((err) => console.error("Failed to load recommendations", err));
      });
  }, [navigate]);

  // Calculations for dashboard metrics
  const metrics = {
    totalOrders: orders.length,
    active: orders.filter((o) => o.status === "pending" || o.status === "processing" || o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered" || o.status === "completed").length,
    totalSpent: orders.reduce((sum, o) => sum + Number(o.total || o.total_price || 0), 0),
  };

  // Filter orders by active tab and search query
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    let matchesTab = true;
    const orderStatus = String(order.status || "").toLowerCase();
    if (activeTab === "pending") {
      matchesTab = orderStatus === "pending";
    } else if (activeTab === "processing") {
      matchesTab = orderStatus === "processing";
    } else if (activeTab === "delivered") {
      matchesTab = orderStatus === "delivered" || orderStatus === "completed";
    }

    // Search filter
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const orderIdStr = `ORD-2026-${String(order.id).padStart(3, "0")}`.toLowerCase();
      const rawIdStr = String(order.id).toLowerCase();
      
      const items = order.items || order.order_items || [];
      const matchesItems = items.some((item) => 
        String(item.product?.name || "").toLowerCase().includes(q)
      );

      matchesSearch = orderIdStr.includes(q) || rawIdStr.includes(q) || matchesItems;
    }

    return matchesTab && matchesSearch;
  });

  const handleDownloadInvoice = async (order) => {
    // Show the invoice modal first (needed so we can render & capture it)
    setInvoiceOrder(order);
  };

  const escapeInvoiceHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");

  const handleDownloadPDF = () => {
    if (!invoiceOrder || downloading) return;
    setDownloading(true);

    const items = invoiceOrder.items || invoiceOrder.order_items || [];
    const total = invoiceOrder.total_price || invoiceOrder.total || 0;
    const invoiceId = String(invoiceOrder.id).padStart(3, "0");
    const date = invoiceOrder.created_at
      ? new Date(invoiceOrder.created_at).toLocaleDateString()
      : "N/A";
    const status = invoiceOrder.status || "pending";

    const rowsHTML = items.map((item) => {
      const product = item.product || {};
      const unitPrice = Number(item.price || product.price || 0);
      const qty = Number(item.quantity || 1);
      const productName = escapeInvoiceHtml(product.name || "Product");
      return `
        <tr>
          <td style="padding:12px 14px;font-size:14px;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9">${productName}</td>
          <td style="padding:12px 14px;font-size:14px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9">${qty}</td>
          <td style="padding:12px 14px;font-size:14px;color:#475569;text-align:right;border-bottom:1px solid #f1f5f9">$${unitPrice.toFixed(2)}</td>
          <td style="padding:12px 14px;font-size:14px;color:#0f172a;text-align:right;font-weight:700;border-bottom:1px solid #f1f5f9">$${(unitPrice * qty).toFixed(2)}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice INV-2026-${invoiceId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #fff; color: #0f172a; padding: 40px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 900; color: #2563eb; }
    .invoice-label { font-size: 24px; font-weight: 800; color: #0f172a; text-align: right; }
    .meta { font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.6; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #f8fafc; border-bottom: 1px solid #cbd5e1; }
    th { padding: 12px 14px; text-align: left; font-size: 12px; color: #475569; }
    .totals { display: flex; flex-direction: column; gap: 8px; font-size: 14px; max-width: 260px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; color: #475569; }
    .totals-grand { display: flex; justify-content: space-between; border-top: 2px solid #cbd5e1; padding-top: 8px; font-size: 16px; font-weight: 800; color: #0f172a; }
    .footer { border-top: 1px solid #e2e8f0; margin-top: 34px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11px; }
    .print-btn { display: block; margin: 0 auto 28px; padding: 10px 28px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF / Print</button>
  <div class="header">
    <div>
      <div class="brand">MarketAI Store</div>
      <div class="meta">123 Innovation Blvd, Suite 400<br/>Phnom Penh, Cambodia<br/>support@marketai.com</div>
    </div>
    <div>
      <div class="invoice-label">INVOICE</div>
      <div class="meta" style="text-align:right">
        Invoice No: <strong>INV-2026-${invoiceId}</strong><br/>
        Date: ${escapeInvoiceHtml(date)}<br/>
        Status: <span style="text-transform:uppercase;font-weight:700;color:${status === "delivered" ? "#059669" : "#d97706"}">${escapeInvoiceHtml(status)}</span>
      </div>
    </div>
  </div>
  <div class="info-grid">
    <div>
      <div class="info-label">Bill To:</div>
      <strong style="font-size:15px">${escapeInvoiceHtml(invoiceOrder.user?.name || "Customer")}</strong>
      <div class="meta">${escapeInvoiceHtml(invoiceOrder.user?.email || "")}</div>
    </div>
    <div>
      <div class="info-label">Ship To:</div>
      <div class="meta">${escapeInvoiceHtml(invoiceOrder.shipping_address || "-")}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Product Description</th>
        <th style="text-align:center;width:80px">Qty</th>
        <th style="text-align:right;width:110px">Unit Price</th>
        <th style="text-align:right;width:120px">Total</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>$${(Number(total) - Number(invoiceOrder.tax || 0) - Number(invoiceOrder.shipping_fee || 0)).toFixed(2)}</span></div>
    <div class="totals-row"><span>Tax (8%)</span><span>$${Number(invoiceOrder.tax || 0).toFixed(2)}</span></div>
    <div class="totals-row"><span>Shipping</span><span>${invoiceOrder.shipping_fee ? "$" + Number(invoiceOrder.shipping_fee).toFixed(2) : "Free"}</span></div>
    <div class="totals-grand"><span>Grand Total</span><span>$${Number(total).toFixed(2)}</span></div>
  </div>
  <div class="footer">Thank you for your business! Questions? Contact support@marketai.com</div>
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank", "width=860,height=1100");
    if (!popup) {
      // Fallback if popup blocked — direct navigate
      window.open(url, "_blank");
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 10000);
  };

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setView("order_details");
  };

  const renderInvoiceModal = () => invoiceOrder && (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(15, 23, 42, 0.6)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 24,
      overflowY: "auto"
    }} className="no-print-overlay" onClick={() => setInvoiceOrder(null)}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-invoice-modal-content, .printable-invoice-modal-content * {
            visibility: visible;
          }
          .printable-invoice-modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print-overlay {
            background: none !important;
            backdrop-filter: none !important;
            padding: 0 !important;
          }
          .invoice-actions-print {
            display: none !important;
          }
        }
      `}</style>

      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 680,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid #e2e8f0",
        padding: 34,
        position: "relative",
        maxHeight: "90vh",
        overflowY: "auto"
      }} className="printable-invoice-modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 28 }} className="invoice-actions-print" data-html2canvas-ignore="true">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="btn btn-primary"
            style={{ padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, opacity: downloading ? 0.7 : 1, cursor: downloading ? "not-allowed" : "pointer" }}
          >
            <Download size={15} />
            <span>{downloading ? "Generating PDF..." : "Download PDF"}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-ghost"
            style={{ padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}
          >
            <span>Print</span>
          </button>
          <button
            onClick={() => setInvoiceOrder(null)}
            className="btn btn-ghost"
            style={{ padding: "8px 16px", borderRadius: 8 }}
          >
            Close
          </button>
        </div>

        <div style={{ backgroundColor: "#ffffff", padding: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #e2e8f0", paddingBottom: 20, marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, color: "var(--primary)", fontWeight: 900, letterSpacing: "-0.5px" }}>MarketAI Store</h2>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                123 Innovation Blvd, Suite 400<br />
                Phnom Penh, Cambodia<br />
                support@marketai.com
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a", fontWeight: 800 }}>INVOICE</h1>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                Invoice No: <strong>INV-2026-{String(invoiceOrder.id).padStart(3, "0")}</strong><br />
                Date: {invoiceOrder.created_at ? new Date(invoiceOrder.created_at).toLocaleDateString() : "N/A"}<br />
                Status: <span style={{ textTransform: "uppercase", fontWeight: 700, color: invoiceOrder.status === 'delivered' ? '#059669' : '#d97706' }}>{invoiceOrder.status}</span>
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
            <div>
              <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px" }}>Bill To:</h4>
              <strong style={{ fontSize: 15, color: "#0f172a" }}>{invoiceOrder.user?.name || "Customer Name"}</strong>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                Email: {invoiceOrder.user?.email || "customer@example.com"}<br />
                Phone: {invoiceOrder.phone || "N/A"}
              </p>
            </div>
            <div>
              <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px" }}>Ship To:</h4>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                {invoiceOrder.shipping_address || "Shipping Destination Address"}
              </p>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 12, color: "#475569" }}>Product Description</th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, color: "#475569", width: 80 }}>Qty</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#475569", width: 100 }}>Unit Price</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#475569", width: 120 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoiceOrder.items || invoiceOrder.order_items || []).map((item) => {
                const product = item.product || {};
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px", fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
                      {product.name || "Product Name"}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, color: "#475569", textAlign: "center" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, color: "#475569", textAlign: "right" }}>
                      {money(item.price || product.price)}
                    </td>
                    <td style={{ padding: "14px", fontSize: 14, color: "#0f172a", textAlign: "right", fontWeight: 700 }}>
                      {money(Number(item.price || product.price) * Number(item.quantity))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "flex-end", paddingTop: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                height: 44,
                width: "100%",
                maxWidth: 240,
                margin: "0 auto 6px",
                background: "repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 8px, #000 8px, #000 12px, #fff 12px, #fff 14px, #000 14px, #000 18px)"
              }} />
              <span style={{ fontSize: 10, letterSpacing: 3, fontFamily: "monospace", color: "#64748b" }}>
                *INV-{invoiceOrder.id}-{invoiceOrder.payment_reference || "REF"}*
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Subtotal</span>
                <span>{money(Number(invoiceOrder.total_price || invoiceOrder.total) - Number(invoiceOrder.tax || 0) - Number(invoiceOrder.shipping_fee || 0))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Tax (8%)</span>
                <span>{money(invoiceOrder.tax || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Shipping</span>
                <span>{invoiceOrder.shipping_fee ? money(invoiceOrder.shipping_fee) : "Free"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #cbd5e1", paddingTop: 8, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                <span>Grand Total</span>
                <span>{money(invoiceOrder.total_price || invoiceOrder.total)}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 34, paddingTop: 16, textAlign: "center", color: "#94a3b8", fontSize: 11 }}>
            Thank you for your business! If you have any questions about this invoice, please contact support@marketai.com.
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="loading">Loading dashboard...</div>;

  // View 1: Order Details View
  if (view === "order_details" && selectedOrder) {
    const total = selectedOrder.total || selectedOrder.total_price || selectedOrder.grand_total || selectedOrder.amount || 0;
    const items = selectedOrder.items || selectedOrder.order_items || [];
    const status = String(selectedOrder.status || "pending").toLowerCase();
    const formattedDate = selectedOrder.created_at 
      ? new Date(selectedOrder.created_at).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) 
      : "N/A";

    // Stepper checks helper
    const getStepClass = (step) => {
      // Steps: 1 = Placed, 2 = Processing, 3 = Shipped, 4 = Delivered
      if (status === "cancelled" || status === "canceled") {
        if (step === 1) return "completed";
        if (step === 2) return "active"; // Stop active at Processing
        return "";
      }

      if (step === 1) return "completed"; // Order is always placed
      
      if (step === 2) {
        if (status === "processing" || status === "shipped" || status === "delivered" || status === "completed") {
          return status === "processing" ? "active" : "completed";
        }
      }
      
      if (step === 3) {
        if (status === "shipped" || status === "delivered" || status === "completed") {
          return status === "shipped" ? "active" : "completed";
        }
      }
      
      if (step === 4) {
        if (status === "delivered" || status === "completed") {
          return "completed"; // Reached final step
        }
      }
      return "";
    };

    return (
      <>
      <main className="container" style={{ maxWidth: 1180 }}>
        <button 
          className="orders-detail-back-link" 
          onClick={() => setView("orders_list")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Orders</span>
        </button>

        <div className="orders-detail-header-row">
          <div className="orders-detail-title-area">
            <h1>
              Order ORD-2026-{String(selectedOrder.id).padStart(3, "0")}
              <span className={`dashboard-badge ${status}`}>
                {selectedOrder.status || "Pending"}
              </span>
            </h1>
            <span>Placed on {formattedDate}</span>
          </div>
          <button 
            className="orders-btn-outline"
            onClick={() => handleDownloadInvoice(selectedOrder)}
          >
            <Download size={14} />
            <span>Download Invoice</span>
          </button>
        </div>

        <div className="orders-detail-grid">
          {/* Left Column: Items and Review CTA */}
          <div>
            <div className="orders-detail-card">
              <h2 className="orders-detail-card-title">Order Items</h2>
              <div>
                {items.map((item) => {
                  const product = item.product || {};
                  const img = getImageUrl(product) || product.image;
                  const itemPrice = Number(item.price || product.price || 0);
                  const itemQty = Number(item.quantity || 1);

                  return (
                    <div className="orders-detail-item-row" key={item.id}>
                      <div className="orders-detail-item-left">
                        <div className="orders-detail-item-thumb">
                          {img ? (
                            <img src={img} alt={product.name || "Product"} />
                          ) : (
                            "📦"
                          )}
                        </div>
                        <div className="orders-detail-item-info">
                          <h4>{product.name || "Product name"}</h4>
                          <span>Quantity: {itemQty}</span>
                        </div>
                      </div>
                      <div className="orders-detail-item-right">
                        <span className="orders-detail-item-price">{money(itemPrice)}</span>
                        <span className="orders-detail-item-total">{money(itemPrice * itemQty)} total</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="orders-detail-summary-block">
                <div className="orders-detail-summary-line">
                  <span>Subtotal</span>
                  <strong>{money(total)}</strong>
                </div>
                <div className="orders-detail-summary-line">
                  <span>Shipping</span>
                  <span style={{ color: "var(--success)", fontWeight: 700 }}>Free</span>
                </div>
                <div className="orders-detail-summary-total">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
              </div>
            </div>

            {/* Share experience card */}
            <div className="orders-detail-card" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <Star size={40} color="#f97316" strokeWidth={1.5} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Share your experience</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#64748b" }}>Help others by reviewing your purchase</p>
              <button 
                className="orders-btn-primary" 
                onClick={() => navigate(`/products/${items[0]?.product?.id || ""}`)}
              >
                <MessageSquare size={14} />
                <span>Write a Review</span>
              </button>
            </div>
          </div>

          {/* Right Column: Delivery Status (Stepper), Address, Payment */}
          <div>
            {/* Delivery Status Progress Stepper */}
            <div className="orders-detail-card">
              <h2 className="orders-detail-card-title">Delivery Status</h2>
              <div className="delivery-stepper">
                {/* Step 1: Order Placed */}
                <div className={`delivery-step ${getStepClass(1)} ${getStepClass(2) === "completed" ? "completed" : ""}`}>
                  <div className="delivery-step-icon-box">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="delivery-step-info">
                    <h4>Order Placed</h4>
                    <p>Order registered</p>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Step 2: Processing */}
                <div className={`delivery-step ${getStepClass(2)} ${getStepClass(3) === "completed" ? "completed" : ""}`}>
                  <div className="delivery-step-icon-box">
                    <Settings size={16} />
                  </div>
                  <div className="delivery-step-info">
                    {status === "cancelled" || status === "canceled" ? (
                      <>
                        <h4 style={{ color: "var(--danger)" }}>Order Cancelled</h4>
                        <p>Refund initiated</p>
                      </>
                    ) : (
                      <>
                        <h4>Processing</h4>
                        <p>Order confirmed</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Step 3: Shipped */}
                <div className={`delivery-step ${getStepClass(3)} ${getStepClass(4) === "completed" ? "completed" : ""}`}>
                  <div className="delivery-step-icon-box">
                    <Truck size={16} />
                  </div>
                  <div className="delivery-step-info">
                    <h4>Shipped</h4>
                    <p>On the way</p>
                  </div>
                </div>

                {/* Step 4: Delivered */}
                <div className={`delivery-step ${getStepClass(4)}`}>
                  <div className="delivery-step-icon-box">
                    <Check size={16} />
                  </div>
                  <div className="delivery-step-info">
                    <h4>Delivered</h4>
                    <p>Package delivered</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="orders-detail-card">
              <div className="orders-detail-card-icon-title">
                <MapPin size={16} className="orders-detail-card-icon" />
                <span>Shipping Address</span>
              </div>
              <p className="orders-detail-card-text">
                {selectedOrder.shipping_address || "123 Main St, New York, NY 10001"}
              </p>
            </div>

            {/* Payment Method */}
            <div className="orders-detail-card">
              <div className="orders-detail-card-icon-title">
                <CreditCard size={16} className="orders-detail-card-icon" />
                <span>Payment Method</span>
              </div>
              <p className="orders-detail-card-text">
                {selectedOrder.payment_method === "cash_on_delivery" ? "Cash on Delivery" : "Test Credit Card"}<br />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Paid on {formattedDate}</span>
              </p>
            </div>

            {/* Need Help? Card */}
            <div className="orders-detail-card">
              <div className="orders-detail-card-icon-title">
                <HelpCircle size={16} className="orders-detail-card-icon" />
                <span>Need Help?</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <button 
                  className="orders-btn-outline" 
                  style={{ width: "100%", justifyContent: "flex-start", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "none", cursor: "pointer", border: "1px solid #cbd5e1" }}
                  onClick={() => setShowChatModal(true)}
                >
                  <MessageSquare size={15} />
                  <span>Contact Seller</span>
                </button>
                <button 
                  className="orders-btn-outline" 
                  style={{ width: "100%", justifyContent: "flex-start", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "none", cursor: "pointer", border: "1px solid #cbd5e1" }}
                  onClick={() => alert("Return request initiated. Our support agent will contact you shortly.")}
                >
                  <RefreshCw size={15} />
                  <span>Return Order</span>
                </button>
                <button 
                  className="orders-btn-outline" 
                  style={{ width: "100%", justifyContent: "flex-start", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "none", cursor: "pointer", border: "1px solid #cbd5e1" }}
                  onClick={() => alert("Calling Customer Support: 1-800-MARKETAI")}
                >
                  <Phone size={15} />
                  <span>Customer Support</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer-Seller Chat Modal Overlay */}
        {showChatModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16
          }} onClick={() => setShowChatModal(false)}>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 480,
              height: 600,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
              border: "1px solid #e2e8f0"
            }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8fafc"
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Chat with Seller</h3>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Order ORD-2026-{String(selectedOrder.id).padStart(3, "0")}</span>
                </div>
                <button 
                  onClick={() => setShowChatModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "#94a3b8",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Message Area */}
              <div style={{
                flex: 1,
                padding: 20,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                backgroundColor: "#f8fafc"
              }}>
                {(chatMessages.length > 0 ? chatMessages : [
                  { sender: "seller", text: "Hello! Thank you for purchasing from our store. We're here to help you with any questions about your order." }
                ]).map((msg, idx) => {
                  const isCustomer = msg.sender === "customer";
                  return (
                    <div 
                      key={idx} 
                      style={{
                        alignSelf: isCustomer ? "flex-end" : "flex-start",
                        maxWidth: "80%",
                        backgroundColor: isCustomer ? "#2563eb" : "#ffffff",
                        color: isCustomer ? "#ffffff" : "#0f172a",
                        padding: "10px 14px",
                        borderRadius: isCustomer ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                        boxShadow: isCustomer ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        border: isCustomer ? "none" : "1px solid #e2e8f0",
                        fontSize: 14,
                        lineHeight: "1.4"
                      }}
                    >
                      {msg.text}
                    </div>
                  );
                })}
              </div>

              {/* Footer Input */}
              <div style={{
                padding: 16,
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                display: "flex",
                gap: 8
              }}>
                <input 
                  type="text" 
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage(selectedOrder.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none"
                  }}
                />
                <button 
                  onClick={() => handleSendMessage(selectedOrder.id)}
                  className="orders-btn-primary"
                  style={{ padding: "10px 16px", borderRadius: 8, height: "auto" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      {renderInvoiceModal()}
      </>
    );
  }

  // View 2: Searchable Orders List View
  if (view === "orders_list") {
    return (
      <>
      <main className="container" style={{ maxWidth: 1180 }}>
        <button className="dashboard-back-btn" onClick={() => setView("dashboard")}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="section-head" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">My Orders</h1>
            <p className="page-subtitle">Track and manage your order history</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Row in List View */}
        <div className="grid stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-info">
              <span>Total Orders</span>
              <strong>{metrics.totalOrders}</strong>
            </div>
            <div className="dashboard-stat-icon-wrapper blue">
              <Package size={20} />
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-info">
              <span>Active Orders</span>
              <strong>{metrics.active}</strong>
            </div>
            <div className="dashboard-stat-icon-wrapper orange">
              <Truck size={20} />
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-info">
              <span>Delivered</span>
              <strong>{metrics.delivered}</strong>
            </div>
            <div className="dashboard-stat-icon-wrapper green">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="dashboard-stat-card">
            <div className="dashboard-stat-info">
              <span>Total Spent</span>
              <strong>{money(metrics.totalSpent)}</strong>
            </div>
            <div className="dashboard-stat-icon-wrapper cyan">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Search & Tabs Row */}
        <div className="orders-filter-row">
          <div className="orders-search-wrapper">
            <Search size={16} className="orders-search-icon" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="orders-filter-pills">
            <button 
              className={`orders-filter-pill ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All ({orders.length})
            </button>
            <button 
              className={`orders-filter-pill ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              Pending
            </button>
            <button 
              className={`orders-filter-pill ${activeTab === "processing" ? "active" : ""}`}
              onClick={() => setActiveTab("processing")}
            >
              Processing
            </button>
            <button 
              className={`orders-filter-pill ${activeTab === "delivered" ? "active" : ""}`}
              onClick={() => setActiveTab("delivered")}
            >
              Delivered
            </button>
          </div>
        </div>

        {/* Orders List cards */}
        {filteredOrders.length === 0 ? (
          <div className="empty-state card" style={{ background: "white" }}>No orders found in this section.</div>
        ) : (
          <section className="table-list" style={{ display: "grid", gap: 20 }}>
            {filteredOrders.map((order) => {
              const total = order.total || order.total_price || order.grand_total || order.amount || 0;
              const items = order.items || order.order_items || [];
              const status = String(order.status || "pending").toLowerCase();
              const formattedDate = order.created_at 
                ? new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) 
                : "N/A";

              return (
                <article className="orders-list-card" key={order.id}>
                  <div className="orders-list-card-header">
                    <div className="orders-list-card-title-area">
                      <h3>
                        Order ORD-2026-{String(order.id).padStart(3, "0")}
                        <span className={`dashboard-badge ${status}`} style={{ marginLeft: 10 }}>
                          {order.status || "Pending"}
                        </span>
                      </h3>
                      <span>Placed on {formattedDate}</span>
                    </div>
                    <strong style={{ fontSize: 18, color: "var(--text)" }}>{money(total)}</strong>
                  </div>

                  {/* Purchased items inline summary box */}
                  <div className="orders-list-card-items-box">
                    <div style={{ display: "grid", gap: 12 }}>
                      {items.map((item) => {
                        const product = item.product || {};
                        const img = getImageUrl(product) || product.image;
                        return (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {img ? (
                              <img src={img} alt={product.name || "Product"} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: 44, height: 44, borderRadius: 6, background: "#eef2f6", display: "grid", placeItems: "center" }}>📦</div>
                            )}
                            <div>
                              <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{product.name || "Product name"}</p>
                              <span style={{ color: "var(--muted)", fontSize: 12 }}>Qty: {item.quantity} × {money(item.price || product.price)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="orders-list-card-actions">
                    <div className="orders-actions-left">
                      <button 
                        className="orders-btn-primary" 
                        onClick={() => showOrderDetails(order)}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                      <button 
                        className="orders-btn-outline"
                        onClick={() => navigate("/products")}
                      >
                        <RefreshCw size={14} />
                        <span>Return</span>
                      </button>
                      <button 
                        className="orders-btn-outline"
                        onClick={() => navigate(`/products/${items[0]?.product?.id || ""}`)}
                      >
                        <MessageSquare size={14} />
                        <span>Review</span>
                      </button>
                    </div>
                    <button 
                      className="orders-btn-outline"
                      onClick={() => handleDownloadInvoice(order)}
                    >
                      <Download size={14} />
                      <span>Invoice</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      {renderInvoiceModal()}
      </>
    );
  }

  // View 3: Dashboard View (Default)
  return (
    <main className="container" style={{ maxWidth: 1180 }}>
      <div className="section-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">My Dashboard</h1>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Counter Cards Grid */}
      <div className="grid stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-info">
            <span>Total Orders</span>
            <strong>{metrics.totalOrders}</strong>
          </div>
          <div className="dashboard-stat-icon-wrapper blue">
            <Package size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-info">
            <span>Wishlist Items</span>
            <strong>{wishlistCount}</strong>
          </div>
          <div className="dashboard-stat-icon-wrapper orange">
            <Heart size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-info">
            <span>Total Spent</span>
            <strong>{money(metrics.totalSpent)}</strong>
          </div>
          <div className="dashboard-stat-icon-wrapper green">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-info">
            <span>Cart Items</span>
            <strong>{cartCount}</strong>
          </div>
          <div className="dashboard-stat-icon-wrapper cyan">
            <ShoppingCart size={20} />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Orders & Quick Actions */}
      <div className="dashboard-grid">
        {/* Left Column: Recent Orders */}
        <section className="dashboard-card">
          <div className="dashboard-card-title-row">
            <h2 className="dashboard-card-title">Recent Orders</h2>
            {orders.length > 0 && (
              <button 
                className="dashboard-btn-view-all"
                onClick={() => setView("orders_list")}
              >
                View All
              </button>
            )}
          </div>

          <div className="dashboard-orders-list">
            {orders.length === 0 ? (
              <div style={{ color: "var(--muted)", padding: "20px 0", textAlign: "center" }}>
                You have not placed any orders yet.
              </div>
            ) : (
              orders.slice(0, 3).map((order) => {
                const total = order.total || order.total_price || order.grand_total || order.amount || 0;
                const items = order.items || order.order_items || [];
                const firstItem = items[0] || {};
                const product = firstItem.product || {};
                const img = getImageUrl(product) || product.image;
                const status = String(order.status || "pending").toLowerCase();

                return (
                  <div className="dashboard-order-row" key={order.id}>
                    <div className="dashboard-order-left">
                      <div className="dashboard-order-thumb">
                        {img ? (
                          <img src={img} alt={product.name || "Product"} />
                        ) : (
                          "📦"
                        )}
                      </div>
                      <div className="dashboard-order-info">
                        <h4>ORD-2026-{String(order.id).padStart(3, "0")}</h4>
                        <span>
                          {order.created_at 
                            ? new Date(order.created_at).toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' }) 
                            : "N/A"
                          }
                        </span>
                      </div>
                    </div>
                    <div className="dashboard-order-right">
                      <span className="dashboard-order-amount">{money(total)}</span>
                      <span className={`dashboard-badge ${status}`}>
                        {order.status || "Pending"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Quick Actions */}
        <aside className="dashboard-card" style={{ height: "fit-content" }}>
          <h2 className="dashboard-card-title" style={{ marginBottom: 20 }}>Quick Actions</h2>
          <div className="dashboard-actions-list">
            <button className="dashboard-action-item" onClick={() => navigate("/products")}>
              <Search size={16} className="dashboard-action-icon" style={{ marginRight: 4 }} />
              <span>Browse Products</span>
            </button>
            <button className="dashboard-action-item" onClick={() => setView("orders_list")}>
              <Package size={16} className="dashboard-action-icon" style={{ marginRight: 4 }} />
              <span>Track Orders</span>
            </button>
            <button className="dashboard-action-item" onClick={() => navigate("/wishlist")}>
              <Heart size={16} className="dashboard-action-icon" style={{ marginRight: 4 }} />
              <span>View Wishlist</span>
            </button>
            <button className="dashboard-action-item" onClick={() => navigate("/settings")}>
              <Settings size={16} className="dashboard-action-icon" style={{ marginRight: 4 }} />
              <span>Account Settings</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Seller Promo Banner */}
      <div className="dashboard-promo-banner">
        <div className="dashboard-promo-left">
          <div className="dashboard-promo-badge">
            <Store size={22} />
          </div>
          <div className="dashboard-promo-info">
            {isSeller ? (
              <>
                <h3>Manage Your Merchant Shop</h3>
                <p>Go to your seller dashboard to list products, fulfill orders, and check your performance insights.</p>
              </>
            ) : (
              <>
                <h3>Start Selling on MarketAI</h3>
                <p>Join thousands of sellers and grow your business. Keep 95% of your sales with our low 5% commission.</p>
              </>
            )}
          </div>
        </div>
        <Link 
          to={isSeller ? "/seller" : "/become-seller"} 
          className="dashboard-promo-btn"
        >
          {isSeller ? (
            <>
              <span>Seller Portal</span>
              <ChevronRight size={16} />
            </>
          ) : (
            <>
              <span>Become a Seller</span>
              <ChevronRight size={16} />
            </>
          )}
        </Link>
      </div>

      {/* Recommended for You Grid */}
      {recommendations.length > 0 && (
        <section className="dashboard-rec-section">
          <h2 className="dashboard-rec-title">Recommended for You</h2>
          <div className="dashboard-rec-grid">
            {recommendations.map((prod) => {
              const img = getImageUrl(prod);
              return (
                <div 
                  className="dashboard-rec-card" 
                  key={prod.id}
                  onClick={() => navigate(`/products/${prod.id}`)}
                >
                  <div className="dashboard-rec-media">
                    {img ? (
                      <img src={img} alt={prod.name} />
                    ) : (
                      <div className="empty-img" style={{ height: "100%" }}>No image</div>
                    )}
                  </div>
                  <div className="dashboard-rec-info">
                    <h3 className="dashboard-rec-name">{prod.name}</h3>
                    <span className="dashboard-rec-price">{money(prod.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Printable Invoice Modal Overlay */}
      {invoiceOrder && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 24,
          overflowY: "auto"
        }} className="no-print-overlay" onClick={() => setInvoiceOrder(null)}>
          
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .printable-invoice-modal-content, .printable-invoice-modal-content * {
                visibility: visible;
              }
              .printable-invoice-modal-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .no-print-overlay {
                background: none !important;
                backdrop-filter: none !important;
                padding: 0 !important;
              }
              .invoice-actions-print {
                display: none !important;
              }
            }
          `}</style>

          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            width: "100%",
            maxWidth: 680,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            border: "1px solid #e2e8f0",
            padding: 34,
            position: "relative",
            maxHeight: "90vh",
            overflowY: "auto"
          }} className="printable-invoice-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 28 }} className="invoice-actions-print" data-html2canvas-ignore="true">
              <button 
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="btn btn-primary"
                style={{ padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, opacity: downloading ? 0.7 : 1, cursor: downloading ? "not-allowed" : "pointer" }}
              >
                <Download size={15} />
                <span>{downloading ? "Generating PDF..." : "Download PDF"}</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="btn btn-ghost"
                style={{ padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}
              >
                <span>Print</span>
              </button>
              <button 
                onClick={() => setInvoiceOrder(null)}
                className="btn btn-ghost"
                style={{ padding: "8px 16px", borderRadius: 8 }}
              >
                Close
              </button>
            </div>

            {/* Invoice content wrapper — only this is captured for PDF */}
            <div style={{ backgroundColor: "#ffffff", padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #e2e8f0", paddingBottom: 20, marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, color: "var(--primary)", fontWeight: 900, letterSpacing: "-0.5px" }}>MarketAI Store</h2>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  123 Innovation Blvd, Suite 400<br />
                  Phnom Penh, Cambodia<br />
                  support@marketai.com
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a", fontWeight: 800 }}>INVOICE</h1>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                  Invoice No: <strong>INV-2026-{String(invoiceOrder.id).padStart(3, "0")}</strong><br />
                  Date: {invoiceOrder.created_at ? new Date(invoiceOrder.created_at).toLocaleDateString() : "N/A"}<br />
                  Status: <span style={{ textTransform: "uppercase", fontWeight: 700, color: invoiceOrder.status === 'delivered' ? '#059669' : '#d97706' }}>{invoiceOrder.status}</span>
                </p>
              </div>
            </div>

            {/* Invoice Info Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
              <div>
                <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px" }}>Bill To:</h4>
                <strong style={{ fontSize: 15, color: "#0f172a" }}>{invoiceOrder.user?.name || "Customer Name"}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  Email: {invoiceOrder.user?.email || "customer@example.com"}<br />
                  Phone: {invoiceOrder.phone || "N/A"}
                </p>
              </div>
              <div>
                <h4 style={{ margin: "0 0 6px 0", color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px" }}>Ship To:</h4>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, lineHeight: 1.4 }}>
                  {invoiceOrder.shipping_address || "Shipping Destination Address"}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 12, color: "#475569" }}>Product Description</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 12, color: "#475569", width: 80 }}>Qty</th>
                  <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#475569", width: 100 }}>Unit Price</th>
                  <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "#475569", width: 120 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoiceOrder.items || invoiceOrder.order_items || []).map((item) => {
                  const product = item.product || {};
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px", fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
                        {product.name || "Product Name"}
                      </td>
                      <td style={{ padding: "14px", fontSize: 14, color: "#475569", textAlign: "center" }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: "14px", fontSize: 14, color: "#475569", textAlign: "right" }}>
                        {money(item.price || product.price)}
                      </td>
                      <td style={{ padding: "14px", fontSize: 14, color: "#0f172a", textAlign: "right", fontWeight: 700 }}>
                        {money(Number(item.price || product.price) * Number(item.quantity))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Cost Breakdown & Barcode visual */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "flex-end", paddingTop: 12 }}>
              {/* Barcode visual using CSS gradients */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  height: 44,
                  width: "100%",
                  maxWidth: 240,
                  margin: "0 auto 6px",
                  background: "repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 8px, #000 8px, #000 12px, #fff 12px, #fff 14px, #000 14px, #000 18px)"
                }} />
                <span style={{ fontSize: 10, letterSpacing: 3, fontFamily: "monospace", color: "#64748b" }}>
                  *INV-{invoiceOrder.id}-{invoiceOrder.payment_reference || "REF"}*
                </span>
              </div>

              {/* Total calculations block */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Subtotal</span>
                  <span>{money(Number(invoiceOrder.total_price || invoiceOrder.total) - Number(invoiceOrder.tax || 0) - Number(invoiceOrder.shipping_fee || 0))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Tax (8%)</span>
                  <span>{money(invoiceOrder.tax || 0)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Shipping</span>
                  <span>{invoiceOrder.shipping_fee ? money(invoiceOrder.shipping_fee) : "Free"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #cbd5e1", paddingTop: 8, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  <span>Grand Total</span>
                  <span>{money(invoiceOrder.total_price || invoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 34, paddingTop: 16, textAlign: "center", color: "#94a3b8", fontSize: 11 }}>
              Thank you for your business! If you have any questions about this invoice, please contact support@marketai.com.
            </div>
            </div>{/* end invoice content wrapper */}

          </div>
        </div>
      )}
    </main>
  );
}

export default Orders;
