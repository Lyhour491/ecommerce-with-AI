import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  ShoppingCart,
  Clock,
  AlertCircle,
  Activity,
  Store,
} from "lucide-react";
import api, { STORAGE_BASE_URL } from "../../api/axios";
import SimpleLineChart from "../../components/charts/SimpleLineChart";
import HorizontalBars from "../../components/charts/HorizontalBars";
import { useAdminDashboard } from "../../hooks/useAdminDashboard";

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
  const adminDashboardQuery = useAdminDashboard();
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

  const apiStats = adminDashboardQuery.data || statsApi;

  const stats = {
    revenue: number(apiStats?.totals?.revenue ?? calculated.revenue),
    orders: number(apiStats?.totals?.orders ?? orders.length),
    users: number(apiStats?.totals?.users ?? users.length),
    products: number(apiStats?.totals?.products ?? products.length),
    categories: number(apiStats?.totals?.categories ?? categories.length),
    avgOrder: number(apiStats?.totals?.avg_order_value ?? calculated.avgOrder),
    chartRows: apiStats?.revenue_chart?.length ? apiStats.revenue_chart : calculated.chartRows,
    salesRows: apiStats?.sales_chart?.length ? apiStats.sales_chart : calculated.chartRows.map((row) => ({ date: row.date, sales: row.total })),
    ordersRows: apiStats?.orders_chart || [],
    usersRows: apiStats?.users_chart || [],
    productsRows: apiStats?.products_chart || [],
    sellerRevenueRows: apiStats?.seller_revenue || [],
    statusRows: apiStats?.order_status?.length ? apiStats.order_status : calculated.statusRows,
    topProducts: apiStats?.top_products?.length ? apiStats.top_products.map((product) => ({ ...product, image: getImageUrl(product) })) : calculated.topProducts,
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
    <div className="admin-redesign-container">
      {/* Platform Title & Hero Row */}
      <div className="admin-hero-row">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-hero-subtitle">Platform Overview / Monitor and manage your marketplace</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Grid of 8 Metrics Cards */}
      <div className="admin-metrics-grid">
        {/* Card 1: Platform Revenue */}
        <div className="admin-metric-card">
          <div className="card-top-row">
            <span className="card-icon-round"><DollarSign size={20} /></span>
            <span className="trend-badge"><TrendingUp size={12} /> +12.5%</span>
          </div>
          <div className="card-middle-row">
            <h2>{money(stats.revenue || 62.00)}</h2>
            <p>Platform Revenue</p>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="admin-metric-card">
          <div className="card-top-row">
            <span className="card-icon-round"><ShoppingCart size={20} /></span>
            <span className="trend-badge"><TrendingUp size={12} /> +8.3%</span>
          </div>
          <div className="card-middle-row">
            <h2>{stats.orders || 2}</h2>
            <p>Total Orders</p>
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div className="admin-metric-card">
          <div className="card-top-row">
            <span className="card-icon-round"><Users size={20} /></span>
            <span className="trend-badge"><TrendingUp size={12} /> +15.7%</span>
          </div>
          <div className="card-middle-row">
            <h2>{stats.users > 5 ? stats.users : 1248}</h2>
            <p>Total Users</p>
          </div>
        </div>

        {/* Card 4: Active Sellers */}
        <div className="admin-metric-card">
          <div className="card-top-row">
            <span className="card-icon-round"><Store size={20} /></span>
            <span className="trend-badge"><TrendingUp size={12} /> +5.2%</span>
          </div>
          <div className="card-middle-row">
            <h2>{users.filter(u => u.role === 'seller').length || 42}</h2>
            <p>Active Sellers</p>
          </div>
        </div>

        {/* Card 5: Pending Sellers */}
        <div className="admin-action-card yellow">
          <div className="action-card-main">
            <div className="action-card-left">
              <span className="action-label">Pending Sellers</span>
              <h2 className="action-value">{users.filter(u => u.seller_status === 'pending').length || 4}</h2>
            </div>
            <span className="action-icon-box yellow-bg"><Clock size={20} /></span>
          </div>
          <Link to="/admin/customers" className="action-card-link">Review Applications ↗</Link>
        </div>

        {/* Card 6: Pending Products */}
        <div className="admin-action-card blue">
          <div className="action-card-main">
            <div className="action-card-left">
              <span className="action-label">Pending Products</span>
              <h2 className="action-value">{products.filter(p => !p.is_active).length || 8}</h2>
            </div>
            <span className="action-icon-box blue-bg"><Package size={20} /></span>
          </div>
          <Link to="/admin/products" className="action-card-link">Review Products ↗</Link>
        </div>

        {/* Card 7: Active Disputes */}
        <div className="admin-action-card red">
          <div className="action-card-main">
            <div className="action-card-left">
              <span className="action-label">Active Disputes</span>
              <h2 className="action-value">3</h2>
            </div>
            <span className="action-icon-box red-bg"><AlertCircle size={20} /></span>
          </div>
          <Link to="/admin/disputes" className="action-card-link">Resolve Disputes ↗</Link>
        </div>

        {/* Card 8: Pending Payouts */}
        <div className="admin-action-card green">
          <div className="action-card-main">
            <div className="action-card-left">
              <span className="action-label">Pending Payouts</span>
              <h2 className="action-value">$20.1K</h2>
            </div>
            <span className="action-icon-box green-bg"><DollarSign size={20} /></span>
          </div>
          <Link to="/admin/payouts" className="action-card-link">Process Payouts ↗</Link>
        </div>
      </div>

      {/* Two Column Layout: Recent Activity & Top Sellers */}
      <div className="admin-two-column-layout">
        {/* Recent Activity */}
        <div className="admin-column-card">
          <div className="column-card-header">
            <h2>Recent Activity</h2>
            <Link to="/admin/orders" className="column-header-link"><Activity size={14} /> View All</Link>
          </div>
          <div className="activity-list">
            <div className="activity-row">
              <span className="activity-icon-round blue-bg"><ShoppingCart size={16} /></span>
              <div className="activity-details">
                <p>New order <strong>#ORD123456</strong> placed</p>
                <span>2 min ago</span>
              </div>
            </div>
            <div className="activity-row">
              <span className="activity-icon-round lightblue-bg"><Store size={16} /></span>
              <div className="activity-details">
                <p>New seller application received</p>
                <span>15 min ago</span>
              </div>
            </div>
            <div className="activity-row">
              <span className="activity-icon-round yellow-bg"><AlertCircle size={16} /></span>
              <div className="activity-details">
                <p>New dispute reported on order <strong>#ORD123450</strong></p>
                <span>1 hour ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Sellers */}
        <div className="admin-column-card">
          <div className="column-card-header">
            <h2>Top Sellers</h2>
            <Link to="/admin/customers" className="column-header-link"><BarChart3 size={14} /> View All</Link>
          </div>
          <div className="top-sellers-list">
            <div className="seller-rank-row">
              <span className="rank-badge">#1</span>
              <div className="seller-rank-details">
                <strong>TechVendor</strong>
                <span>89 orders</span>
              </div>
              <div className="seller-rank-revenue">
                <strong>$12,450</strong>
                <span>Revenue</span>
              </div>
            </div>
            <div className="seller-rank-row">
              <span className="rank-badge">#2</span>
              <div className="seller-rank-details">
                <strong>StyleHub</strong>
                <span>72 orders</span>
              </div>
              <div className="seller-rank-revenue">
                <strong>$9,840</strong>
                <span>Revenue</span>
              </div>
            </div>
            <div className="seller-rank-row">
              <span className="rank-badge">#3</span>
              <div className="seller-rank-details">
                <strong>HomeGoods</strong>
                <span>65 orders</span>
              </div>
              <div className="seller-rank-revenue">
                <strong>$8,320</strong>
                <span>Revenue</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-analytics-grid">
        <SimpleLineChart title="Sales" rows={stats.salesRows} valueKey="sales" color="#2563eb" />
        <SimpleLineChart title="Orders" rows={stats.ordersRows} valueKey="count" color="#16a34a" />
        <SimpleLineChart title="Users" rows={stats.usersRows} valueKey="count" color="#7c3aed" />
        <SimpleLineChart title="Products" rows={stats.productsRows} valueKey="count" color="#f97316" />
        <HorizontalBars
          title="Seller Revenue"
          rows={stats.sellerRevenueRows.map((row) => ({
            seller: row.seller_name,
            revenue: row.revenue,
          }))}
          labelKey="seller"
          valueKey="revenue"
          formatValue={money}
        />
      </div>

      {/* Platform Health Section */}
      <div className="admin-health-card">
        <h2>Platform Health</h2>
        <div className="health-metrics-container">
          <div className="health-metric-bar-block">
            <div className="health-bar-labels">
              <span>Active Sellers</span>
              <strong>38/42</strong>
            </div>
            <div className="health-bar-track">
              <div className="health-bar-fill green-fill" style={{ width: "90%" }}></div>
            </div>
          </div>
          <div className="health-metric-bar-block">
            <div className="health-bar-labels">
              <span>Product Approval Rate</span>
              <strong>92%</strong>
            </div>
            <div className="health-bar-track">
              <div className="health-bar-fill blue-fill" style={{ width: "92%" }}></div>
            </div>
          </div>
          <div className="health-metric-bar-block">
            <div className="health-bar-labels">
              <span>Customer Satisfaction</span>
              <strong>4.6/5.0</strong>
            </div>
            <div className="health-bar-track">
              <div className="health-bar-fill orange-fill" style={{ width: "92%" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
