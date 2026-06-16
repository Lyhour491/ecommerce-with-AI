import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 360,
        pointerEvents: "none"
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              backgroundColor: toast.type === "error" ? "#fee2e2" : toast.type === "warning" ? "#fffdbf" : "#ecfdf5",
              color: toast.type === "error" ? "#991b1b" : toast.type === "warning" ? "#854d0e" : "#065f46",
              border: `1px solid ${toast.type === "error" ? "#fecaca" : toast.type === "warning" ? "#fef08a" : "#a7f3d0"}`,
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              cursor: "pointer",
              pointerEvents: "auto",
              animation: "toast-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>
                {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
              </span>
              <span>{toast.message}</span>
            </div>
            <button
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                fontSize: 16,
                cursor: "pointer",
                padding: 0,
                opacity: 0.6
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Global CSS for Toast Animation */}
      <style>{`
        @keyframes toast-fade-in {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
