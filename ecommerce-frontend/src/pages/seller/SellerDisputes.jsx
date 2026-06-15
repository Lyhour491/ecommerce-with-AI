import { useState, useEffect, useMemo } from "react";
import api from "../../api/axios";
import { money, getImageUrl } from "../../utils/store";
import { 
  HelpCircle, MessageSquare, AlertTriangle, Clock, 
  CheckCircle2, DollarSign, Search, Filter, ArrowRight, X, Send 
} from "lucide-react";

export default function SellerDisputes() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedChatOrder, setSelectedChatOrder] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatTrigger, setChatTrigger] = useState(0);

  // Load seller orders to find active chats and details
  const loadData = () => {
    setLoading(true);
    api.get("/seller/orders")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setOrders(list);
      })
      .catch((err) => console.error("Failed to load seller orders", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const [chatMessages, setChatMessages] = useState([]);

  // Fetch messages dynamically when selected chat order changes
  useEffect(() => {
    if (selectedChatOrder && !selectedChatOrder.isMock) {
      api.get(`/orders/${selectedChatOrder.orderId}/messages`)
        .then((res) => {
          setChatMessages(res.data || []);
        })
        .catch((err) => console.error("Failed to load chat messages", err));
    } else {
      setChatMessages([]);
    }
  }, [selectedChatOrder, chatTrigger]);

  // Helper to send seller message
  const handleSendMessage = (orderId) => {
    if (!chatInput.trim()) return;
    
    api.post(`/orders/${orderId}/messages`, { text: chatInput })
      .then(() => {
        setChatInput("");
        setChatTrigger((t) => t + 1);
        loadData();
      })
      .catch((err) => console.error("Failed to send message", err));
  };

  // Build list of disputes/inquiries
  const disputesList = useMemo(() => {
    // 1. Mock disputes (fallbacks if no actual data or to show platform functionality)
    const mockDisputes = [
      {
        id: "DSP-301",
        orderId: 9991,
        customerName: "John Doe",
        orderNumber: "ORD-2026-991",
        reason: "Defective item screen",
        amount: 129.99,
        status: "pending",
        date: "06/12/2026",
        isMock: true,
        mockMessages: [
          { sender: "customer", text: "Hi, the watch screen is scratched." },
          { sender: "seller", text: "We are sorry to hear that. Could you send a photo?" }
        ]
      },
      {
        id: "DSP-302",
        orderId: 9992,
        customerName: "Jane Smith",
        orderNumber: "ORD-2026-992",
        reason: "Item not received",
        amount: 89.00,
        status: "resolved",
        date: "06/10/2026",
        isMock: true,
        mockMessages: [
          { sender: "customer", text: "Has this been shipped yet?" },
          { sender: "seller", text: "Yes, it was delivered yesterday." },
          { sender: "customer", text: "Ah, found it in the mailbox. Thank you!" }
        ]
      }
    ];

    // 2. Real orders with chats or marked as dispute
    const realDisputes = orders.map((order) => {
      const messages = order.messages || [];
      const hasChat = messages.length > 0;

      // Only return if it has a chat session (or we can return all as potential inquiries)
      if (!hasChat) return null;

      const items = order.order_items || [];
      const orderTotal = Number(order.total_price || 0);
      const formattedOrderNumber = `ORD-2026-${String(order.id).padStart(3, "0")}`;

      return {
        id: `DSP-REAL-${order.id}`,
        orderId: order.id,
        customerName: order.user?.name || "Customer",
        orderNumber: formattedOrderNumber,
        reason: items[0]?.product?.name ? `Inquiry about ${items[0].product.name}` : "General Inquiry",
        amount: orderTotal,
        status: order.status === "cancelled" ? "resolved" : "pending",
        date: new Date(order.created_at).toLocaleDateString(),
        isMock: false
      };
    }).filter(Boolean);

    // Combine them
    return [...realDisputes, ...mockDisputes];
  }, [orders, chatTrigger]);

  // Filters & searches
  const filteredDisputes = useMemo(() => {
    const search = query.trim().toLowerCase();
    return disputesList.filter((d) => {
      const matchesTab = 
        tab === "all" || 
        (tab === "pending" && d.status === "pending") || 
        (tab === "resolved" && d.status === "resolved");

      const matchesSearch = 
        d.customerName.toLowerCase().includes(search) ||
        d.orderNumber.toLowerCase().includes(search) ||
        d.reason.toLowerCase().includes(search);

      return matchesTab && matchesSearch;
    });
  }, [disputesList, query, tab]);

  // Statistics
  const stats = useMemo(() => {
    const total = disputesList.length;
    const pending = disputesList.filter((d) => d.status === "pending").length;
    const resolved = disputesList.filter((d) => d.status === "resolved").length;
    return { total, pending, resolved };
  }, [disputesList]);

  if (loading) {
    return <div className="seller-loading">Loading buyer inquiries...</div>;
  }

  // Active chat session messages
  const activeMessages = selectedChatOrder ? (
    selectedChatOrder.isMock 
      ? selectedChatOrder.mockMessages 
      : (chatMessages.length > 0 ? chatMessages : [
          { sender: "seller", text: "Hello! Thank you for purchasing from our store. We're here to help you with any questions about your order." }
        ])
  ) : [];

  return (
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Buyer Inquiries & Disputes</h1>
        </div>
        <div className="merchant-top-actions">
          <span>Active Inquiries: <b>{stats.pending}</b></span>
          <div className="mini-profile">S</div>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row" style={{ marginBottom: 24 }}>
          <h1>Disputes & Inquiries</h1>
          <p>Review customer questions, resolve disputes, and chat directly with buyers.</p>
        </div>

        {/* Stats Row */}
        <div className="merchant-metrics order-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
          <article className="merchant-metric-card product-stat-card">
            <div className="metric-icon blue"><MessageSquare size={21} /></div>
            <p>Total Inquiries</p>
            <h2>{stats.total}</h2>
          </article>
          <article className="merchant-metric-card product-stat-card">
            <div className="metric-icon orange"><AlertTriangle size={21} /></div>
            <p>Pending Action</p>
            <h2>{stats.pending}</h2>
          </article>
          <article className="merchant-metric-card product-stat-card">
            <div className="metric-icon green"><CheckCircle2 size={21} /></div>
            <p>Resolved Cases</p>
            <h2>{stats.resolved}</h2>
          </article>
        </div>

        {/* Main Panel */}
        <article className="merchant-panel product-like-table" style={{ background: "white", padding: 20, borderRadius: 12 }}>
          <div className="product-tabs-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div className="product-tabs" style={{ display: "flex", gap: 12 }}>
              <button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "none" }}>All</button>
              <button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "none" }}>Pending</button>
              <button className={tab === "resolved" ? "active" : ""} onClick={() => setTab("resolved")} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "none" }}>Resolved</button>
            </div>
            
            <label className="product-like-search" style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px" }}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search inquiries..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: 13 }}
              />
            </label>
          </div>

          <div className="product-like-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: 12 }}>ID</th>
                  <th style={{ padding: 12 }}>Order Reference</th>
                  <th style={{ padding: 12 }}>Customer</th>
                  <th style={{ padding: 12 }}>Topic / Reason</th>
                  <th style={{ padding: 12 }}>Order Value</th>
                  <th style={{ padding: 12 }}>Status</th>
                  <th style={{ padding: 12 }}>Date</th>
                  <th style={{ padding: 12 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.length > 0 ? (
                  filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: 12 }}><strong>{dispute.id}</strong></td>
                      <td style={{ padding: 12 }}><strong>{dispute.orderNumber}</strong></td>
                      <td style={{ padding: 12 }}>{dispute.customerName}</td>
                      <td style={{ padding: 12 }}>{dispute.reason}</td>
                      <td style={{ padding: 12 }}><strong>{money(dispute.amount)}</strong></td>
                      <td style={{ padding: 12 }}>
                        <span className={`status ${dispute.status === "resolved" ? "delivered" : "pending"}`}>
                          {dispute.status}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>{dispute.date}</td>
                      <td style={{ padding: 12 }}>
                        <button 
                          className="edit-user-btn" 
                          style={{ display: "flex", alignItems: "center", gap: 6 }}
                          onClick={() => setSelectedChatOrder(dispute)}
                        >
                          <MessageSquare size={14} />
                          <span>Chat with Buyer</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                      No inquiries or disputes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {/* Seller Chat Modal overlay */}
      {selectedChatOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedChatOrder(null)} style={{
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
        }}>
          <div className="edit-user-modal" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            width: "100%",
            maxWidth: 500,
            height: 600,
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            padding: 0
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#f8fafc"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chat with {selectedChatOrder.customerName}</h3>
                <span style={{ fontSize: 12, color: "#64748b" }}>Order {selectedChatOrder.orderNumber}</span>
              </div>
              <button onClick={() => setSelectedChatOrder(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Messages Area */}
            <div style={{
              flex: 1,
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              backgroundColor: "#f8fafc"
            }}>
              {activeMessages.map((msg, idx) => {
                const isSellerMsg = msg.sender === "seller";
                return (
                  <div 
                    key={idx} 
                    style={{
                      alignSelf: isSellerMsg ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      backgroundColor: isSellerMsg ? "#2563eb" : "#ffffff",
                      color: isSellerMsg ? "#ffffff" : "#0f172a",
                      padding: "10px 14px",
                      borderRadius: isSellerMsg ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                      boxShadow: isSellerMsg ? "none" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      border: isSellerMsg ? "none" : "1px solid #e2e8f0",
                      fontSize: 14,
                      lineHeight: "1.4"
                    }}
                  >
                    {msg.text}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Input */}
            <div style={{
              padding: 16,
              borderTop: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
              display: "flex",
              gap: 8
            }}>
              <input 
                type="text" 
                placeholder="Type your message to buyer..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (selectedChatOrder.isMock) {
                      selectedChatOrder.mockMessages.push({ sender: "seller", text: chatInput });
                      setChatInput("");
                      setChatTrigger(t => t + 1);
                    } else {
                      handleSendMessage(selectedChatOrder.orderId);
                    }
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
                onClick={() => {
                  if (selectedChatOrder.isMock) {
                    selectedChatOrder.mockMessages.push({ sender: "seller", text: chatInput });
                    setChatInput("");
                    setChatTrigger(t => t + 1);
                  } else {
                    handleSendMessage(selectedChatOrder.orderId);
                  }
                }}
                className="orders-btn-primary"
                style={{ padding: "10px 16px", borderRadius: 8, height: "auto", display: "flex", alignItems: "center", gap: 6 }}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
