import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Bell, Search, User, LogOut, LayoutDashboard, Settings, Package, Store, ShieldAlert, CreditCard, MessageSquare } from "lucide-react";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function getNotifications({ isAdmin, isSeller }) {
  if (isAdmin) {
    return [
      { id: "admin-review", title: "Product review queue", text: "Check fake or restricted products before they go public.", time: "Now", to: "/admin/products", icon: ShieldAlert },
      { id: "admin-orders", title: "Orders need attention", text: "Review processing and pending marketplace orders.", time: "Today", to: "/admin/orders", icon: ShoppingCart },
      { id: "admin-sellers", title: "Seller applications", text: "Approve or reject pending seller registrations.", time: "Today", to: "/admin/customers", icon: Store },
    ];
  }

  if (isSeller) {
    return [
      { id: "seller-orders", title: "New store activity", text: "Review recent orders and fulfillment status.", time: "Now", to: "/seller/orders", icon: ShoppingCart },
      { id: "seller-stock", title: "Inventory watch", text: "Check low stock products before they run out.", time: "Today", to: "/seller/products", icon: Package },
      { id: "seller-payout", title: "Payout reminder", text: "Review available balance and payout requests.", time: "This week", to: "/seller/payouts", icon: CreditCard },
    ];
  }

  return [
    { id: "buyer-orders", title: "Track your orders", text: "See delivery progress and download invoices.", time: "Today", to: "/orders", icon: Package },
    { id: "buyer-cart", title: "Cart reminder", text: "Finish checkout before products sell out.", time: "Today", to: "/cart", icon: ShoppingCart },
    { id: "buyer-support", title: "Need help?", text: "Message sellers from your order details.", time: "Anytime", to: "/orders", icon: MessageSquare },
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
  const notifications = getNotifications({ isAdmin, isSeller });

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
              {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            </button>

            {isNotificationsOpen && (
              <div className="nav-notification-menu">
                <div className="notification-menu-header">
                  <div>
                    <h4>Notifications</h4>
                    <span>{notifications.length} store updates</span>
                  </div>
                  <button type="button" onClick={() => setIsNotificationsOpen(false)}>Close</button>
                </div>

                <div className="notification-list">
                  {notifications.map(({ id, title, text, time, to, icon: Icon }) => (
                    <Link
                      key={id}
                      to={to}
                      className="notification-item"
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      <span className="notification-item-icon"><Icon size={16} /></span>
                      <span className="notification-item-body">
                        <strong>{title}</strong>
                        <small>{text}</small>
                      </span>
                      <em>{time}</em>
                    </Link>
                  ))}
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
