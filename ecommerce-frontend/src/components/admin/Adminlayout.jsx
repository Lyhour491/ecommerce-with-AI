import { useEffect, useState } from "react";
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
  Home,
} from "lucide-react";
import { authStore } from "../../store/authStore";
import api from "../../api/axios";
import { unwrapUser } from "../../utils/store";

function getAccountAvatar(user) {
  return (
    user?.avatar_url ||
    user?.profile_photo_url ||
    user?.avatar ||
    `https://i.pravatar.cc/96?u=${encodeURIComponent(user?.email || user?.id || "admin")}`
  );
}

function getAccountLabel(user) {
  const role = String(user?.role || "admin").toLowerCase();
  if (role === "admin") return "Enterprise Admin";
  if (role === "seller") return user?.shop_name || user?.store_name || "Seller Account";
  return "Customer Account";
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authStore.getUser() || { name: "Admin", role: "admin" });

  useEffect(() => {
    let isMounted = true;

    api.get("/user")
      .then((response) => {
        const account = unwrapUser(response.data);
        if (!isMounted || !account) return;
        authStore.setUser(account);
        setUser(account);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

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
            src={getAccountAvatar(user)}
            alt={user?.name || "Admin"}
          />
          <div>
            <p>{user?.name || "Admin"}</p>
            <span>{getAccountLabel(user)}</span>
          </div>
        </div>
        <button type="button" className="dashboard-home-btn" onClick={() => navigate("/")}>
          <Home size={18} />
          <span>Back to Store</span>
        </button>
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
