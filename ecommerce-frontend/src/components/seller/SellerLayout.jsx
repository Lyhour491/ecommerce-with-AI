import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function SellerLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="admin-shell merchant-admin-shell seller-shell">
      <aside className="merchant-sidebar seller-sidebar">
        <div className="merchant-brand">
          <div className="merchant-brand-icon seller-brand-icon">
            <Store size={22} />
          </div>
          <div>
            <h1>Seller Hub</h1>
            <p>Manage Your Store</p>
          </div>
        </div>

        <nav className="merchant-nav" aria-label="Seller navigation">
          <SellerLink to="/seller" icon={<LayoutDashboard size={20} />} text="Dashboard" />
          <SellerLink to="/seller/products" icon={<Package size={20} />} text="My Products" />
          <SellerLink to="/seller/orders" icon={<ShoppingCart size={20} />} text="My Orders" />
        </nav>

        <div className="merchant-user-card">
          <div className="seller-avatar">
            {(user?.name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <p>{user?.name || "Seller"}</p>
            <span>{user?.email || ""}</span>
          </div>
        </div>

        <button className="seller-logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="merchant-main">
        <Outlet />
      </div>
    </div>
  );
}

function SellerLink({ to, icon, text }) {
  return (
    <NavLink
      to={to}
      end={to === "/seller"}
      className={({ isActive }) =>
        `merchant-nav-link${isActive ? " active" : ""}`
      }
    >
      {icon}
      <span>{text}</span>
    </NavLink>
  );
}
