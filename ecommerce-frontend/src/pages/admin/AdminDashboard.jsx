import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import api, { STORAGE_BASE_URL } from "../../api/axios";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const unwrapList = (payload, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const imageFallback = (name = "P") => {
  const letter = encodeURIComponent(String(name || "P").trim().charAt(0).toUpperCase() || "P");
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><rect width='96' height='96' rx='20' fill='%23eef4ff'/><text x='50%' y='56%' text-anchor='middle' font-size='34' font-family='Arial' font-weight='700' fill='%232563eb'>${letter}</text></svg>`;
};

const normalizeImageUrl = (image) => {
  if (!image) return "";
  let value = String(image).trim();

  // Fix old broken API values like: http://localhost:8000/storage/https://images.unsplash.com/...
  const embeddedHttps = value.match(/https?:\/\/.+$/);
  if (value.includes('/storage/http') && embeddedHttps) {
    value = embeddedHttps[0];
  }

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  if (value.startsWith("/storage/")) return `${STORAGE_BASE_URL}${value}`;
  if (value.startsWith("storage/")) return `${STORAGE_BASE_URL}/${value}`;
  return `${STORAGE_BASE_URL}/storage/${value.replace(/^\/+/, "")}`;
};

const getImageUrl = (product) => {
  const image =
    product?.image_url ||
    product?.primary_image_url ||
    product?.images?.[0]?.image_url ||
    product?.images?.[0]?.image_path ||
    product?.images?.[0]?.image ||
    product?.images?.[0]?.path ||
    product?.images?.[0]?.url ||
    product?.image_path ||
    product?.image ||
    product?.thumbnail;

  return normalizeImageUrl(image);
};

const money = (value) => currency.format(Number(value || 0));
const number = (value) => Number(value || 0);
const orderItems = (order) => order?.order_items || order?.orderItems || order?.items || [];
const orderTotal = (order) => number(order?.total_price ?? order?.total ?? order?.total_amount ?? order?.grand_total);
const customerName = (order) => order?.user?.name || order?.customer?.name || order?.customer_name || `User #${order?.user_id || "-"}`;
const shortDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function EmptyAvatar({ name }) {
  return <span className="dash-avatar">{String(name || "U").trim().charAt(0).toUpperCase()}</span>;
}

function RevenueChart({ rows }) {
  const data = rows.length ? rows : [{ date: "No data", total: 0 }];
  const max = Math.max(...data.map((item) => number(item.total)), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 40 : 40 + (index * 620) / (data.length - 1);
    const y = 230 - (number(item.total) / max) * 170;
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `40,230 ${line} ${points[points.length - 1]?.x || 660},230`;

  return (
    <div className="analytics-chart-wrap">
      <svg className="analytics-line-chart" viewBox="0 0 720 280" role="img" aria-label="Revenue chart">
        <defs>
          <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => (
          <line key={tick} x1="40" x2="680" y1={60 + tick * 55} y2={60 + tick * 55} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        <polygon points={area} fill="url(#revenueGradient)" />
        <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" stroke="#2563eb" strokeWidth="4" />
            <text x={point.x} y="260" textAnchor="middle">{String(point.date).slice(5) || point.date}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatusBars({ rows }) {
  const max = Math.max(...rows.map((item) => item.count), 1);
  return (
    <div className="status-bars">
      {rows.map((item) => (
        <div className="status-bar-row" key={item.status}>
          <div className="status-bar-label"><span>{item.status}</span><b>{item.count}</b></div>
          <div className="status-bar-track"><span style={{ width: `${(item.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function AdminDashboard() {
  const [statsApi, setStatsApi] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [statsRes, ordersRes, productsRes, usersRes, categoriesRes] = await Promise.allSettled([
          api.get("/admin/stats"),
          api.get("/orders"),
          api.get("/products"),
          api.get("/users"),
          api.get("/categories"),
        ]);

        if (!active) return;
        if (statsRes.status === "fulfilled") setStatsApi(statsRes.value.data);
        if (ordersRes.status === "fulfilled") setOrders(unwrapList(ordersRes.value.data, ["orders"]));
        if (productsRes.status === "fulfilled") setProducts(unwrapList(productsRes.value.data, ["products"]));
        if (usersRes.status === "fulfilled") setUsers(unwrapList(usersRes.value.data, ["users"]));
        if (categoriesRes.status === "fulfilled") setCategories(unwrapList(categoriesRes.value.data, ["categories"]));

        const failedRequired = [statsRes, ordersRes].some((result) => result.status === "rejected");
        if (failedRequired) setError("Some dashboard data could not be loaded. Check your admin token and Laravel API.");
      } catch (err) {
        if (active) setError(err?.response?.data?.message || "Dashboard could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const calculated = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + orderTotal(order), 0);
    const avgOrder = orders.length ? revenue / orders.length : 0;
    const statusMap = orders.reduce((map, order) => {
      const status = order?.status || "pending";
      map[status] = (map[status] || 0) + 1;
      return map;
    }, {});

    const dailyMap = orders.reduce((map, order) => {
      const key = order?.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : "No date";
      map[key] = (map[key] || 0) + orderTotal(order);
      return map;
    }, {});

    const productMap = new Map();
    orders.forEach((order) => {
      orderItems(order).forEach((item) => {
        const product = item?.product || products.find((candidate) => String(candidate.id) === String(item.product_id)) || {};
        const id = product?.id || item?.product_id || item?.id;
        const existing = productMap.get(id) || {
          id,
          name: product?.name || item?.product_name || `Product #${id || "-"}`,
          image: getImageUrl(product),
          quantity: 0,
          revenue: 0,
        };
        const quantity = number(item?.quantity || item?.qty || 1);
        const price = number(item?.price || product?.price || 0);
        existing.quantity += quantity;
        existing.revenue += quantity * price;
        productMap.set(id, existing);
      });
    });

    return {
      revenue,
      avgOrder,
      statusRows: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
      chartRows: Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).slice(-10).map(([date, total]) => ({ date, total })),
      topProducts: [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    };
  }, [orders, products]);

  const stats = {
    revenue: number(statsApi?.totals?.revenue ?? calculated.revenue),
    orders: number(statsApi?.totals?.orders ?? orders.length),
    users: number(statsApi?.totals?.users ?? users.length),
    products: number(statsApi?.totals?.products ?? products.length),
    categories: number(statsApi?.totals?.categories ?? categories.length),
    avgOrder: number(statsApi?.totals?.avg_order_value ?? calculated.avgOrder),
    chartRows: statsApi?.revenue_chart?.length ? statsApi.revenue_chart : calculated.chartRows,
    statusRows: statsApi?.order_status?.length ? statsApi.order_status : calculated.statusRows,
    topProducts: statsApi?.top_products?.length ? statsApi.top_products.map((product) => ({ ...product, image: getImageUrl(product) })) : calculated.topProducts,
  };

  const cards = [
    { label: "Total Revenue", value: money(stats.revenue), note: `${stats.orders} orders`, icon: DollarSign, className: "blue" },
    { label: "Orders", value: stats.orders, note: `${money(stats.avgOrder)} average`, icon: ShoppingBag, className: "green" },
    { label: "Customers", value: stats.users, note: "Registered users", icon: Users, className: "purple" },
    { label: "Products", value: stats.products, note: `${stats.categories} categories`, icon: Package, className: "orange" },
  ];

  const recentOrders = orders.slice(0, 6);

  if (loading) return <section className="merchant-dashboard"><div className="loading">Loading pro dashboard...</div></section>;

  return (
    <section className="merchant-dashboard pro-dashboard-page">
      <div className="merchant-content pro-dashboard-content">
        <div className="dashboard-hero pro-dashboard-hero">
          <div>
            <p className="eyebrow"><BarChart3 size={16} /> Analytics Overview</p>
            <h1>Pro Admin Dashboard</h1>
            <p>Live sales, orders, users, products, and top products from your Laravel API.</p>
          </div>
          <div className="hero-date"><CalendarDays size={18} /> {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="pro-stats-grid">
          {cards.map(({ label, value, note, icon: Icon, className }) => (
            <article className={`pro-stat-card ${className}`} key={label}>
              <span className="pro-stat-icon"><Icon size={22} /></span>
              <div>
                <p>{label}</p>
                <h2>{value}</h2>
                <small>{note}</small>
              </div>
            </article>
          ))}
        </div>

        <div className="pro-dashboard-grid">
          <article className="pro-panel revenue-panel">
            <div className="panel-heading">
              <div><h2>Revenue Trend</h2><p>Last {Math.max(stats.chartRows.length, 1)} sales days</p></div>
              <span className="trend-pill"><TrendingUp size={16} /> {money(stats.revenue)}</span>
            </div>
            <RevenueChart rows={stats.chartRows} />
          </article>

          <article className="pro-panel">
            <div className="panel-heading"><div><h2>Order Status</h2><p>Current pipeline</p></div></div>
            <StatusBars rows={stats.statusRows.length ? stats.statusRows : [{ status: "No orders", count: 0 }]} />
          </article>
        </div>

        <div className="pro-dashboard-grid bottom-grid">
          <article className="pro-panel recent-orders-panel">
            <div className="panel-heading"><div><h2>Recent Orders</h2><p>Username only, no profile image</p></div></div>
            <div className="pro-table-wrap">
              <table className="pro-table">
                <thead><tr><th>Order</th><th>User</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {recentOrders.length ? recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{customerName(order)}</td>
                      <td>{money(orderTotal(order))}</td>
                      <td><span className={`status ${String(order.status || "pending").toLowerCase()}`}>{order.status || "pending"}</span></td>
                      <td>{shortDate(order.created_at)}</td>
                    </tr>
                  )) : <tr><td colSpan="5">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </article>

          <article className="pro-panel">
            <div className="panel-heading"><div><h2>Top Products</h2><p>Calculated from order_items</p></div></div>
            <div className="top-products pro-top-products">
              {stats.topProducts.length ? stats.topProducts.map((product) => (
                <div className="top-product" key={product.id || product.name}>
                  {product.image ? <img src={product.image} alt={product.name} onError={(event) => { event.currentTarget.src = imageFallback(product.name); }} /> : <img src={imageFallback(product.name)} alt={product.name} />}
                  <div><strong>{product.name}</strong><span>{number(product.quantity)} sold</span></div>
                  <b>{money(product.revenue)}</b>
                </div>
              )) : <div className="empty-state">No order_items found yet.</div>}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;
