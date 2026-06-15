import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList } from "../utils/store";
import { 
  Package, Heart, TrendingUp, ShoppingCart, 
  Search, Settings, ArrowLeft, Store, ChevronRight,
  Eye, RefreshCw, MessageSquare, Download, MapPin, 
  CreditCard, CheckCircle2, Truck, Check, Star, FileText, HelpCircle, Phone
} from "lucide-react";

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState("dashboard"); // "dashboard", "orders_list", or "order_details"
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  
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

  const handleDownloadInvoice = (order) => {
    window.print();
  };

  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setView("order_details");
  };

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
    );
  }

  // View 2: Searchable Orders List View
  if (view === "orders_list") {
    return (
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
    </main>
  );
}

export default Orders;
