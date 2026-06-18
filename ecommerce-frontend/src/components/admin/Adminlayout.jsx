import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Store,
  DollarSign,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { authStore } from "../../store/authStore";

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    authStore.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell merchant-admin-shell">
      <aside className="merchant-sidebar">
        <div className="merchant-brand">
          <div className="merchant-brand-icon"><Store size={22} /></div>
          <div>
            <h1>MarketAI</h1>
            <p>Enterprise Admin</p>
          </div>
        </div>

        <nav className="merchant-nav" aria-label="Admin navigation">
          <AdminLink to="/admin" icon={<LayoutDashboard size={20} />} text="Dashboard" />
          <AdminLink to="/admin/products" icon={<Package size={20} />} text="Product Management" />
          <AdminLink to="/admin/orders" icon={<ShoppingCart size={20} />} text="Order Management" />
          <AdminLink to="/admin/customers" icon={<Users size={20} />} text="Customer Insights" />
          <AdminLink to="/admin/payouts" icon={<DollarSign size={20} />} text="Commission Payouts" />
          <AdminLink to="/admin/disputes" icon={<AlertTriangle size={20} />} text="Disputes" />
          <AdminLink to="/admin/settings" icon={<Settings size={20} />} text="Settings" />
        </nav>

        <div className="merchant-user-card">
          <img
            src="https://i.pravatar.cc/96?img=12"
            alt="Alex Merchant"
          />
          <div>
            <p>Alex Merchant</p>
            <span>Store Owner</span>
          </div>
        </div>
        <button type="button" className="admin-logout-btn" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <div className="merchant-main"><Outlet /></div>
    </div>
  );
}

function AdminLink({ to, icon, text }) {
  return (
    <NavLink to={to} end={to === "/admin"} className={({ isActive }) => `merchant-nav-link${isActive ? " active" : ""}`}>
      {icon}
      <span>{text}</span>
    </NavLink>
  );
}
