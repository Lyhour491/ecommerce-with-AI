import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Bell, Search, User, LogOut, LayoutDashboard, Settings, Package, Store } from "lucide-react";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
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
    };
    if (isMenuOpen) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [isMenuOpen]);

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
          <button className="nav-icon-btn" aria-label="Notifications" type="button">
            <Bell size={18} />
            <span className="notification-badge"></span>
          </button>

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
                onClick={() => setIsMenuOpen(!isMenuOpen)}
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
