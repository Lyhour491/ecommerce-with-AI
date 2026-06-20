import { useEffect, useMemo, useState } from "react";
import { 
  Edit3, Search, ShieldCheck, 
  ShoppingBag, UserCheck, Users, X, Mail, Phone, MapPin, Clock, 
  CreditCard, Eye, CheckCircle2, XCircle, Store
} from "lucide-react";
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
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [reviewApp, setReviewApp] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, ordersRes, userRes, appsRes] = await Promise.allSettled([
        api.get("/users"),
        api.get("/orders"),
        api.get("/user"),
        api.get("/admin/seller-applications")
      ]);
      if (usersRes.status === "fulfilled") setUsers(unwrapList(usersRes.value.data, ["users"]));
      else setError("Users API data could not be loaded. Add GET /api/users for admin customer insights.");
      if (ordersRes.status === "fulfilled") setOrders(unwrapList(ordersRes.value.data, ["orders"]));
      if (userRes.status === "fulfilled") setAdmin(unwrapUser(userRes.value?.data));
      if (appsRes.status === "fulfilled") setApplications(unwrapList(appsRes.value.data, ["users"]));
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

  const filteredApplications = useMemo(() => {
    const search = query.trim().toLowerCase();
    return applications.filter((app) => {
      const searchable = [
        getName(app),
        app?.email,
        app?.shop_name,
        app?.shop_category,
        app?.shop_description,
        app?.tax_id,
        app?.business_phone,
        app?.business_address,
        app?.business_city,
        app?.business_state,
        app?.business_zip,
        app?.business_country
      ].join(" ").toLowerCase();
      return !search || searchable.includes(search);
    });
  }, [applications, query]);

  const stats = useMemo(() => {
    const admins = users.filter((user) => getRole(user) === "admin").length;
    const sellers = users.filter((user) => getRole(user) === "seller").length;
    const customers = users.filter((user) => getRole(user) === "customer").length;
    const activeApps = applications.length;
    return [
      { label: "Total Users", value: users.length.toLocaleString(), note: "+ Live API", icon: Users, tone: "blue" },
      { label: "Customers", value: customers.toLocaleString(), note: "Buyer role", icon: UserCheck, tone: "green" },
      { label: "Sellers", value: sellers.toLocaleString(), note: "Merchant role", icon: ShieldCheck, tone: "purple" },
      { label: "Pending Applications", value: activeApps.toLocaleString(), note: "Review queue", icon: ShoppingBag, tone: "orange" },
    ];
  }, [users, applications]);

  const updateUserInList = (updatedUser) => {
    setUsers((items) => items.map((item) => item.id === updatedUser.id ? { ...item, ...updatedUser } : item));
  };

  const updateRole = async (user, role) => {
    setSavingId(user.id);
    setMessage("");
    setError("");
    try {
      const res = await api.patch(`/users/${user.id}/role`, { role });
      const updated = res.data?.user || { ...user, role };
      updateUserInList(updated);
      setMessage(`${getName(user)} role updated to ${role}.`);
    } catch (err) {
      setError(firstApiError(err, "Failed to update role."));
    } finally {
      setSavingId(null);
    }
  };

  const handleApproveSeller = async (user) => {
    setSavingId(user.id);
    setMessage("");
    setError("");
    try {
      const res = await api.post(`/admin/seller-applications/${user.id}/approve`);
      const updated = res.data?.user || { ...user, role: "seller", seller_status: "approved" };
      updateUserInList(updated);
      setApplications((prev) => prev.filter((app) => app.id !== user.id));
      setMessage(`Approved "${updated.shop_name || getName(user)}" to become a seller!`);
    } catch (err) {
      setError(firstApiError(err, "Failed to approve seller application."));
    } finally {
      setSavingId(null);
    }
  };

  const handleRejectSeller = async (user) => {
    setSavingId(user.id);
    setMessage("");
    setError("");
    try {
      const res = await api.post(`/admin/seller-applications/${user.id}/reject`);
      const updated = res.data?.user || { ...user, seller_status: "rejected" };
      updateUserInList(updated);
      setApplications((prev) => prev.filter((app) => app.id !== user.id));
      setMessage(`Rejected "${user.shop_name || getName(user)}" seller application.`);
    } catch (err) {
      setError(firstApiError(err, "Failed to reject seller application."));
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
        <h1>{tab === "applications" ? "Seller Approval" : "Customer Insights"}</h1>
        <div className="product-like-actions">
          <label className="product-like-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users/shops..." /></label>
          <div className="merchant-top-actions"><strong>{admin?.name || "Admin"}</strong></div>
        </div>
      </header>

      <div className="merchant-content">
        {tab === "applications" && (
          <div className="settings-header-row" style={{ marginBottom: 24 }}>
            <h1>Seller Applications</h1>
            <p>Review and approve new seller registrations</p>
          </div>
        )}

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="page-subtitle">Loading data...</p>}

        {tab === "applications" ? (
          <div className="admin-app-metrics-grid">
            <div className="admin-app-metric-card yellow">
              <div>
                <p>Pending Review</p>
                <h2>{applications.length}</h2>
              </div>
              <span className="app-metric-icon yellow-bg"><Clock size={20} /></span>
            </div>
            <div className="admin-app-metric-card green">
              <div>
                <p>Approved</p>
                <h2>{users.filter(u => u.role === 'seller').length}</h2>
              </div>
              <span className="app-metric-icon green-bg"><CheckCircle2 size={20} /></span>
            </div>
            <div className="admin-app-metric-card red">
              <div>
                <p>Rejected</p>
                <h2>0</h2>
              </div>
              <span className="app-metric-icon red-bg"><XCircle size={20} /></span>
            </div>
          </div>
        ) : (
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
        )}

        <article className="merchant-panel product-like-table customers-card">
          <div className="product-tabs-row">
            <div className="product-tabs">
              {[
                { id: "all", label: "All Users" },
                { id: "customer", label: "Customers" },
                { id: "seller", label: "Sellers" },
                { id: "admin", label: "Admins" },
                { id: "applications", label: `Applications (${applications.length})` }
              ].map((item) => (
                <button
                  key={item.id}
                  className={tab === item.id ? "active" : ""}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="product-like-table-wrap">
            {tab === "applications" ? (
              <div className="admin-app-cards-list">
                {filteredApplications.length ? filteredApplications.map((app) => {
                  const dateStr = app.created_at ? new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable";
                  const address = [app.business_address, app.business_city, app.business_state, app.business_zip].filter(Boolean).join(", ");
                  return (
                    <div className="admin-app-card" key={app.id}>
                      <div className="app-card-left">
                        <span className="app-card-icon-round"><Store size={22} /></span>
                        <div className="app-card-body">
                          <div className="app-card-title-row">
                            <h3>{app.shop_name || "Unnamed store"}</h3>
                            <span className="app-category-badge">{app.shop_category || "Not provided"}</span>
                            <span className="app-date-badge"><Clock size={12} /> {dateStr}</span>
                          </div>
                          <p className="app-desc">{app.shop_description || "No description provided."}</p>
                          <div className="app-details-grid">
                            <div className="app-detail-item">
                              <Mail size={14} /> <span>{app.email}</span>
                            </div>
                            <div className="app-detail-item">
                              <Phone size={14} /> <span>{app.business_phone || "Not provided"}</span>
                            </div>
                            <div className="app-detail-item">
                              <MapPin size={14} /> <span>{address || "Not provided"}</span>
                            </div>
                            <div className="app-detail-item">
                              <CreditCard size={14} /> <span>Tax ID: {app.tax_id || "Not provided"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="app-card-right">
                        <button className="btn-review-action" type="button" onClick={() => setReviewApp(app)}>
                          <Eye size={15} /> Review
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="empty-applications-state">No pending applications found.</div>
                )}
              </div>
            ) : (
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
                        <td>
                          <div className="role-update-cell">
                            <select
                              value={role}
                              disabled={savingId === user.id}
                              onChange={(e) => updateRole(user, e.target.value)}
                            >
                              <option value="customer">customer</option>
                              <option value="seller">seller</option>
                              <option value="admin">admin</option>
                            </select>
                          </div>
                        </td>
                        <td><button className="edit-user-btn" type="button" onClick={() => openEditUser(user)} disabled={savingId === user.id}><Edit3 size={16} /> Edit</button></td>
                      </tr>
                    );
                  }) : <tr><td colSpan="7" className="empty-orders">No users found from API.</td></tr>}
                </tbody>
              </table>
            )}
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
            <label>Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="customer">customer</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label>New Password <span>(optional)</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current password" minLength={6} /></label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeEditUser}>Cancel</button>
              <button type="submit" className="btn-add-product" disabled={savingId === editingUser.id}>{savingId === editingUser.id ? "Saving..." : "Save User"}</button>
            </div>
          </form>
        </div>
      )}

      {reviewApp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setReviewApp(null)}>
          <div className="edit-user-modal review-seller-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <div>
                <h2>Review Seller Application</h2>
                <p>Carefully review the application details before making a decision</p>
              </div>
              <button type="button" onClick={() => setReviewApp(null)}><X size={18} /></button>
            </div>

            <div className="modal-review-content">
              {/* Business Information Section */}
              <div className="review-section">
                <h3>Business Information</h3>
                <div className="review-table">
                  <div className="review-table-row">
                    <span className="row-label">Business Name:</span>
                    <strong className="row-value">{reviewApp.shop_name || "N/A"}</strong>
                  </div>
                  <div className="review-table-row">
                    <span className="row-label">Owner Name:</span>
                    <span className="row-value">{getName(reviewApp)}</span>
                  </div>
                  <div className="review-table-row">
                    <span className="row-label">Category:</span>
                    <span className="row-value">
                      <span className="app-category-badge" style={{ margin: 0 }}>{reviewApp.shop_category || "N/A"}</span>
                    </span>
                  </div>
                  <div className="review-table-row">
                    <span className="row-label">Tax ID:</span>
                    <span className="row-value">{reviewApp.tax_id || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="review-section">
                <h3>Contact Information</h3>
                <div className="review-table">
                  <div className="review-table-row">
                    <span className="row-label">Email:</span>
                    <span className="row-value">{reviewApp.email}</span>
                  </div>
                  <div className="review-table-row">
                    <span className="row-label">Phone:</span>
                    <span className="row-value">{reviewApp.business_phone || "N/A"}</span>
                  </div>
                  <div className="review-table-row">
                    <span className="row-label">Address:</span>
                    <span className="row-value">
                      {reviewApp.business_address || "N/A"}, {reviewApp.business_city || ""}, {reviewApp.business_state || ""} {reviewApp.business_zip || ""}, {reviewApp.business_country || ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Description Section */}
              <div className="review-section full-width" style={{ marginTop: 8 }}>
                <h3>Business Description</h3>
                <p className="description-text" style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, color: "#475569", lineHeight: 1.5, margin: 0 }}>
                  {reviewApp.shop_description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions" style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ height: 40, padding: "0 18px", fontSize: 13, fontWeight: "bold" }}
                onClick={() => setReviewApp(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-error" 
                style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff", height: 40, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "bold" }}
                onClick={() => {
                  handleRejectSeller(reviewApp);
                  setReviewApp(null);
                }}
                disabled={savingId === reviewApp.id}
              >
                <XCircle size={15} /> Reject
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff", height: 40, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: "bold" }}
                onClick={() => {
                  handleApproveSeller(reviewApp);
                  setReviewApp(null);
                }}
                disabled={savingId === reviewApp.id}
              >
                <CheckCircle2 size={15} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminCustomers;
