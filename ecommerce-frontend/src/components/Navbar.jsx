import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Bell, Search, User, LogOut, LayoutDashboard, Settings, Package, Store, ShieldAlert, CreditCard, MessageSquare, Sparkles } from "lucide-react";
import { useMarkNotificationsRead, useNotifications } from "../hooks/useNotifications";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

const notificationIcons = {
  ai: Sparkles,
  cart: ShoppingCart,
  inventory: Package,
  order: ShoppingCart,
  payment: CreditCard,
  seller: Store,
  warning: ShieldAlert,
  info: MessageSquare,
};

function guestNotifications() {
  return [
    { id: "guest-login", title: "Sign in for alerts", text: "Log in to see order, seller, and admin notifications.", time: "Now", to: "/login", type: "info", read: true },
    { id: "guest-shopping", title: "AI shopping assistant", text: "Create an account to use personalized AI shopping help.", time: "Anytime", to: "/register", type: "ai", read: true },
  ];
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSeller = role === "seller";
  
  const [searchValue, setSearchValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { data: notificationData, isLoading: isNotificationsLoading } = useNotifications();
  const markNotificationsRead = useMarkNotificationsRead();
  const notifications = token ? (notificationData?.notifications || []) : guestNotifications();
  const unreadCount = token ? (notificationData?.unread_count || 0) : 0;
  const storedUnreadCount = token ? (notificationData?.stored_unread_count || 0) : 0;

  // Sync search input with URL search param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get("search") || "");
  }, [location.search]);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".nav-user-dropdown-container")) {
        setIsMenuOpen(false);
      }
      if (!e.target.closest(".nav-notification-container")) {
        setIsNotificationsOpen(false);
      }
    };
    if (isMenuOpen || isNotificationsOpen) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [isMenuOpen, isNotificationsOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      navigate("/products");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Brand Logo */}
        <Link to="/" className="brand">
          <div className="logo-icon">
            <ShoppingCart size={16} color="white" fill="white" />
          </div>
          <span className="brand-text">Market<span className="brand-ai">AI</span></span>
        </Link>

        {/* Centered Search Bar */}
        <form onSubmit={handleSearchSubmit} className="nav-search-form">
          <div className="nav-search-wrapper">
            <Search size={16} className="nav-search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </form>

        {/* Right side navigation and actions */}
        <nav className="nav-actions">
          {(!token || (!isAdmin && !isSeller)) && (
            <Link className="btn-become-seller" to="/become-seller">
              <Store size={15} />
              <span>Become a Seller</span>
            </Link>
          )}

          {/* Cart Icon */}
          <Link to="/cart" className="nav-icon-btn" aria-label="Shopping Cart">
            <ShoppingCart size={18} />
          </Link>

          {/* Notification Icon */}
          <div className="nav-notification-container">
            <button
              className={`nav-icon-btn ${isNotificationsOpen ? "active" : ""}`}
              aria-label="Notifications"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsNotificationsOpen((open) => !open);
                setIsMenuOpen(false);
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isNotificationsOpen && (
              <div className="nav-notification-menu">
                <div className="notification-menu-header">
                  <div>
                    <h4>Notifications</h4>
                    <span>{isNotificationsLoading ? "Loading updates..." : `${notifications.length} updates`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (token && storedUnreadCount > 0) {
                        markNotificationsRead.mutate("all");
                      }
                      setIsNotificationsOpen(false);
                    }}
                  >
                    {token && storedUnreadCount > 0 ? "Mark read" : "Close"}
                  </button>
                </div>

                <div className="notification-list">
                  {notifications.length === 0 && (
                    <div className="notification-empty">
                      <strong>No new notifications</strong>
                      <small>Important account updates will appear here.</small>
                    </div>
                  )}

                  {notifications.map(({ id, title, text, time, to, type, read }) => {
                    const Icon = notificationIcons[type] || Bell;

                    return (
                      <Link
                        key={id}
                        to={to}
                        className={`notification-item ${read ? "read" : "unread"}`}
                        onClick={() => {
                          if (token && !read && typeof id === "string" && id.length > 20) {
                            markNotificationsRead.mutate(id);
                          }
                          setIsNotificationsOpen(false);
                        }}
                      >
                        <span className="notification-item-icon"><Icon size={16} /></span>
                        <span className="notification-item-body">
                          <strong>{title}</strong>
                          <small>{text}</small>
                        </span>
                        <em>{time}</em>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Auth buttons */}
          {!token ? (
            <div className="nav-auth-buttons">
              <Link className="btn-login" to="/login">Login</Link>
              <Link className="btn-signup" to="/register">Sign up</Link>
            </div>
          ) : (
            <div className="nav-user-dropdown-container">
              <button 
                className={`nav-user-trigger ${isMenuOpen ? "active" : ""}`}
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                type="button"
              >
                <User size={15} className="user-icon-left" />
                <span>{user?.name || "Account"}</span>
              </button>

              {isMenuOpen && (
                <div className="nav-dropdown-menu">
                  <div className="dropdown-header">
                    <h4>{user?.name || "Account"}</h4>
                    <span className="dropdown-email">{user?.email || ""}</span>
                    <span className="dropdown-role">
                      {isAdmin ? "Admin" : isSeller ? "Seller" : "Buyer"}
                    </span>
                    <span className="dropdown-account-label">Account</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-links">
                    <Link 
                      to={isAdmin ? "/admin" : isSeller ? "/seller" : "/orders"} 
                      className="dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard size={15} className="item-icon" />
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/orders" 
                      className="dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package size={15} className="item-icon" />
                      <span>My Orders</span>
                    </Link>
                    <Link 
                      to="/settings" 
                      className="dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings size={15} className="item-icon" />
                      <span>Settings</span>
                    </Link>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-logout-wrapper">
                    <button 
                      onClick={() => { setIsMenuOpen(false); logout(); }} 
                      className="dropdown-item logout-item"
                      type="button"
                    >
                      <LogOut size={15} className="item-icon" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
