import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layouts/PublicLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import AdminLayout from "./components/admin/Adminlayout";
import SellerLayout from "./components/seller/SellerLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SocialCallback from "./pages/SocialCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminSettings from "./pages/admin/AdminSettings";
import UserSettings from "./pages/UserSettings";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerPayouts from "./pages/seller/SellerPayouts";
import SellerAiInsights from "./pages/seller/SellerAiInsights";
import SellerSettings from "./pages/seller/SellerSettings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import BecomeSeller from "./pages/BecomeSeller";
import SellerApplicationForm from "./pages/SellerApplicationForm";
import Wishlist from "./pages/Wishlist";

function App() {
  return (
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
          <Route path="settings" element={<SellerSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
