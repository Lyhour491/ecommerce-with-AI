import { NavLink, Link, useNavigate } from "react-router-dom";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = getStoredUser();
  const role = String(user?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSeller = role === "seller";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="logo">M</span> MarketAI
        </Link>

        <nav className="nav-links">
          <NavLink className="nav-link" to="/products">Products</NavLink>
          <NavLink className="nav-link" to="/cart">Cart</NavLink>
          <NavLink className="nav-link" to="/orders">Orders</NavLink>

          {(!token || (!isAdmin && !isSeller)) && (
            <NavLink className="nav-link" to="/become-seller">Become a Seller</NavLink>
          )}

          {token && !isAdmin && !isSeller && (
            <NavLink className="nav-link" to="/settings">Settings</NavLink>
          )}

          {token && isSeller && (
            <NavLink className="nav-link seller-nav-link" to="/seller">
              🏪 Seller Hub
            </NavLink>
          )}

          {token && isAdmin && (
            <>
              <NavLink className="nav-link" to="/admin">Admin</NavLink>
              <NavLink className="nav-link" to="/admin/settings">Admin Settings</NavLink>
            </>
          )}

          {!token ? (
            <>
              <NavLink className="nav-link" to="/login">Login</NavLink>
              <Link className="btn btn-primary" to="/register">Register</Link>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
