import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  DollarSign,
  BrainCircuit,
  Settings,
  LogOut,
  HelpCircle,
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
          <SellerLink to="/seller/payouts" icon={<DollarSign size={20} />} text="Payouts" />
          <SellerLink to="/seller/ai-insights" icon={<BrainCircuit size={20} />} text="AI Insights" />
          <SellerLink to="/seller/disputes" icon={<HelpCircle size={20} />} text="Disputes" />
          <SellerLink to="/seller/settings" icon={<Settings size={20} />} text="Store Settings" />
        </nav>

        <div className="merchant-user-card">
          <div className="seller-avatar" style={{ minWidth: 42, minHeight: 42, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold" }}>
            {(user?.name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 900 }}>{user?.name || "Seller"}</p>
            <span style={{ fontSize: 12, color: "#64748b" }}>{user?.email || ""}</span>
          </div>
        </div>

        <button className="seller-logout-btn" onClick={logout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 30px", border: 0, background: "transparent", color: "#64748b", fontWeight: "bold", width: "100%", cursor: "pointer", textAlign: "left" }}>
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
