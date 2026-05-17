import { useEffect, useMemo, useState } from "react";
import { Bell, CircleHelp, Edit3, Filter, MoreVertical, Search, ShieldCheck, ShoppingBag, UserCheck, Users, X } from "lucide-react";
import api from "../../api/axios";
import { firstApiError, unwrapList, unwrapUser } from "../../utils/store";

const getRole = (user) => String(user?.role || user?.user_role || "customer").toLowerCase();
const getName = (user) => user?.name || user?.username || `User #${user?.id || ""}`;
const getJoined = (user) => user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

const emptyForm = { name: "", email: "", role: "customer", password: "" };

function AdminCustomers() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [admin, setAdmin] = useState({ name: "Admin" });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, ordersRes, userRes] = await Promise.allSettled([api.get("/users"), api.get("/orders"), api.get("/user")]);
      if (usersRes.status === "fulfilled") setUsers(unwrapList(usersRes.value.data, ["users"]));
      else setError("Users API data could not be loaded. Add GET /api/users for admin customer insights.");
      if (ordersRes.status === "fulfilled") setOrders(unwrapList(ordersRes.value.data, ["orders"]));
      if (userRes.status === "fulfilled") setAdmin(unwrapUser(userRes.value?.data));
    } catch (err) {
      setError(firstApiError(err, "Failed to load customer insight data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const orderCountByUser = useMemo(() => orders.reduce((map, order) => {
    const id = String(order?.user_id || order?.user?.id || "");
    if (id) map[id] = (map[id] || 0) + 1;
    return map;
  }, {}), [orders]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      const role = getRole(user);
      const matchesTab = tab === "all" || role === tab;
      const searchable = [getName(user), user?.email, role, user?.phone].join(" ").toLowerCase();
      return matchesTab && (!search || searchable.includes(search));
    });
  }, [users, query, tab]);

  const stats = useMemo(() => {
    const admins = users.filter((user) => getRole(user) === "admin").length;
    const customers = users.filter((user) => getRole(user) !== "admin").length;
    const active = new Set(orders.map((order) => String(order?.user_id || order?.user?.id || "")).filter(Boolean)).size;
    return [
      { label: "Total Users", value: users.length.toLocaleString(), note: "+ Live API", icon: Users, tone: "blue" },
      { label: "Customers", value: customers.toLocaleString(), note: "Buyer role", icon: UserCheck, tone: "green" },
      { label: "Admins", value: admins.toLocaleString(), note: "Store staff", icon: ShieldCheck, tone: "purple" },
      { label: "Users With Orders", value: active.toLocaleString(), note: `${orders.length} orders`, icon: ShoppingBag, tone: "orange" },
    ];
  }, [users, orders]);

  const updateUserInList = (updatedUser) => {
    setUsers((items) => items.map((item) => item.id === updatedUser.id ? { ...item, ...updatedUser } : item));
  };

  const updateRole = async (user, role) => {
    setSavingId(user.id);
    setMessage("");
    setError("");
    try {
      const res = await api.patch(`/users/${user.id}/role`, { role });
      updateUserInList(res.data?.user || { ...user, role });
      setMessage(`${getName(user)} role updated to ${role}.`);
    } catch (err) {
      setError(firstApiError(err, "Failed to update role. Add PATCH /api/users/{id}/role or PUT /api/users/{id} in Laravel."));
    } finally {
      setSavingId(null);
    }
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setForm({ name: getName(user), email: user?.email || "", role: getRole(user), password: "" });
    setMessage("");
    setError("");
  };

  const closeEditUser = () => {
    setEditingUser(null);
    setForm(emptyForm);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingUser) return;

    setSavingId(editingUser.id);
    setMessage("");
    setError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
    };
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      const res = await api.put(`/users/${editingUser.id}`, payload);
      const updated = res.data?.user || { ...editingUser, ...payload };
      updateUserInList(updated);
      setMessage(`${getName(updated)} updated successfully.`);
      closeEditUser();
    } catch (err) {
      setError(firstApiError(err, "Failed to update user. Check name, unique email, role, and optional password."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="merchant-dashboard admin-customers-page">
      <header className="merchant-topbar product-like-topbar">
        <h1>Customer Insights</h1>
        <div className="product-like-actions">
          <label className="product-like-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." /></label>
          <div className="merchant-top-actions"><Bell size={20} /><CircleHelp size={20} /><strong>{admin?.name || "Admin"}</strong></div>
        </div>
      </header>

      <div className="merchant-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="page-subtitle">Loading customer insight data...</p>}

        <div className="merchant-metrics order-metrics">
          {stats.map(({ label, value, note, icon: Icon, tone }) => (
            <article className="merchant-metric-card product-stat-card" key={label}>
              <div className={`metric-icon ${tone}`}><Icon size={21} /></div>
              <span className={`metric-pill ${tone}`}>{note}</span>
              <p>{label}</p>
              <h2>{value}</h2>
            </article>
          ))}
        </div>

        <article className="merchant-panel product-like-table customers-card">
          <div className="product-tabs-row">
            <div className="product-tabs">
              {[{ id: "all", label: "All Users" }, { id: "customer", label: "Customers" }, { id: "admin", label: "Admins" }].map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
            </div>
            <div className="table-tools"><Filter size={17} /><MoreVertical size={18} /></div>
          </div>

          <div className="product-like-table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Orders</th><th>Joined</th><th>Update Role</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredUsers.length ? filteredUsers.map((user) => {
                  const role = getRole(user);
                  return (
                    <tr key={user.id}>
                      <td><strong>{getName(user)}</strong><span>User ID: {user.id}</span></td>
                      <td>{user.email || "N/A"}</td>
                      <td><span className={`status ${role}`}>{role}</span></td>
                      <td><strong>{user.orders_count ?? orderCountByUser[String(user.id)] ?? 0}</strong></td>
                      <td>{getJoined(user)}</td>
                      <td><div className="role-update-cell"><select value={role} disabled={savingId === user.id} onChange={(e) => updateRole(user, e.target.value)}><option value="customer">customer</option><option value="admin">admin</option></select></div></td>
                      <td><button className="edit-user-btn" type="button" onClick={() => openEditUser(user)} disabled={savingId === user.id}><Edit3 size={16} /> Edit</button></td>
                    </tr>
                  );
                }) : <tr><td colSpan="7" className="empty-orders">No users found from API.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {editingUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-user-modal" onSubmit={saveUser}>
            <div className="modal-header">
              <div><h2>Edit User</h2><p>Update name, email, password, or role.</p></div>
              <button type="button" onClick={closeEditUser} aria-label="Close"><X size={18} /></button>
            </div>
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="customer">customer</option><option value="admin">admin</option></select></label>
            <label>New Password <span>(optional)</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current password" minLength={6} /></label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEditUser}>Cancel</button>
              <button type="submit" className="btn-add-product" disabled={savingId === editingUser.id}>{savingId === editingUser.id ? "Saving..." : "Save User"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default AdminCustomers;
