import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const PublicLayout = lazy(() => import("./components/layouts/PublicLayout"));
const AuthLayout = lazy(() => import("./components/layouts/AuthLayout"));
const AdminLayout = lazy(() => import("./components/admin/Adminlayout"));
const SellerLayout = lazy(() => import("./components/seller/SellerLayout"));

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const SocialCallback = lazy(() => import("./pages/SocialCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const SellerApplicationForm = lazy(() => import("./pages/SellerApplicationForm"));
const Wishlist = lazy(() => import("./pages/Wishlist"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminDisputes = lazy(() => import("./pages/admin/AdminDisputes"));

const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerPayouts = lazy(() => import("./pages/seller/SellerPayouts"));
const SellerAiInsights = lazy(() => import("./pages/seller/SellerAiInsights"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const SellerDisputes = lazy(() => import("./pages/seller/SellerDisputes"));

function App() {
  return (
    <Suspense fallback={<div className="route-loader">Loading...</div>}>
      <Routes>
        {/* Public/customer pages: navbar + footer */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/become-seller" element={<BecomeSeller />} />
          <Route path="/whitelist" element={<Wishlist />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/become-seller/apply" element={<SellerApplicationForm />} />
          </Route>
        </Route>

        {/* Auth pages: footer only, no navbar */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback/:provider" element={<SocialCallback />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Admin pages: admin layout only, no public footer */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Seller pages: seller layout */}
        <Route element={<ProtectedRoute sellerOnly />}>
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="payouts" element={<SellerPayouts />} />
            <Route path="ai-insights" element={<SellerAiInsights />} />
            <Route path="disputes" element={<SellerDisputes />} />
            <Route path="settings" element={<SellerSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
