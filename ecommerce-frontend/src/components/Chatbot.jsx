import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, X, Send, Sparkles, Bot, User, RefreshCw } from "lucide-react";
import { aiService } from "../services/aiService";
import { authStore } from "../store/authStore";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      text: "👋 Hi! I am your AI Shopping Assistant. I can help you search products, recommend trending deals, or check order status. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBodyRef = useRef(null);
  const navigate = useNavigate();

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("ai_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Scroll to bottom when messages or loading changes
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const saveHistory = (nextMessages) => {
    setMessages(nextMessages);
    sessionStorage.setItem("ai_chat_history", JSON.stringify(nextMessages));
  };

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!authStore.getToken()) {
      saveHistory([
        ...messages,
        {
          role: "model",
          text: "Please sign in to use the AI Shopping Assistant. I can then help with products, recommendations, and your order history.",
        },
      ]);
      navigate("/login");
      return;
    }

    if (!textToSend) setInput("");

    // Add user message to state
    const updatedMessages = [...messages, { role: "user", text: query }];
    saveHistory(updatedMessages);
    setLoading(true);

    try {
      // Format history in the format required by backend Controller
      const historyPayload = updatedMessages.slice(0, -1).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await aiService.chat({
        message: query,
        history: historyPayload,
      });

      const reply = response?.response || "I'm sorry, I encountered an error processing that request.";

      saveHistory([...updatedMessages, { role: "model", text: reply }]);
    } catch (err) {
      console.error("Chatbot request failed", err);
      saveHistory([
        ...updatedMessages,
        {
          role: "model",
          text: "⚠️ Sorry, I'm having trouble connecting to my brain right now. Please verify that the backend is running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const initial = [
      {
        role: "model",
        text: "👋 Chat reset! I am ready for new questions about our products and catalog. How can I help you?",
      },
    ];
    setMessages(initial);
    sessionStorage.removeItem("ai_chat_history");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // Quick reply options
  const quickReplies = [
    { label: "🔥 Hot Deals", text: "What are some hot deals or recommended products in the store?" },
    { label: "📦 Track Orders", text: "Can you help me check the status of my recent orders?" },
    { label: "💳 Payment & Shipping", text: "What payment methods do you support and what is the shipping policy?" },
  ];

  // Helper to parse basic markdown (**bold**, [label](url)) and return React components
  const parseMarkdownText = (rawText) => {
    if (!rawText) return "";

    const lines = rawText.split("\n");
    return lines.map((line, lineIdx) => {
      // Regular expressions for bold and links
      const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
      const parts = line.split(regex);

      const parsedElements = parts.map((part, partIdx) => {
        // Bold: **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
        }

        // Link: [label](url)
        if (part.startsWith("[") && part.includes("](")) {
          const match = part.match(/\[(.*?)\]\((.*?)\)/);
          if (match) {
            const [, label, url] = match;
            const isInternal = url.startsWith("/");

            // If internal route, use Router's Link
            if (isInternal) {
              return (
                <Link
                  key={partIdx}
                  to={url}
                  onClick={() => setIsOpen(false)}
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "600" }}
                >
                  {label}
                </Link>
              );
            }
            return (
              <a
                key={partIdx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "underline", fontWeight: "600" }}
              >
                {label}
              </a>
            );
          }
        }

        // Default text
        return part;
      });

      return (
        <div key={lineIdx} style={{ margin: "4px 0", minHeight: "18px" }}>
          {parsedElements}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        className={`ai-chat-trigger ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Shopping Assistant"
      >
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-header-logo">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="ai-chat-header-title">Store Assistant</h3>
                <p className="ai-chat-header-status">Online & Ready</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={clearChat}
                style={{ background: "transparent", color: "rgba(255, 255, 255, 0.7)", padding: 4 }}
                title="Clear Chat"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: "transparent", color: "rgba(255, 255, 255, 0.7)", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-chat-body" ref={chatBodyRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-msg ${msg.role === "user" ? "chat-msg-user" : "chat-msg-ai"}`}
              >
                {msg.role === "model" ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Bot size={16} style={{ color: "#7c3aed", marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>{parseMarkdownText(msg.text)}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "flex-end" }}>
                    <div style={{ flex: 1, textAlign: "right" }}>{msg.text}</div>
                    <User size={16} style={{ color: "white", marginTop: 4, flexShrink: 0 }} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-msg chat-msg-ai">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Bot size={16} style={{ color: "#7c3aed", flexShrink: 0 }} />
                  <div className="typing-bubble">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          {!loading && (
            <div className="chat-quick-replies">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  className="quick-reply-btn"
                  onClick={() => handleSend(reply.text)}
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="ai-chat-input-area">
            <input
              type="text"
              placeholder="Ask anything about our store..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <button
              className="ai-chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
