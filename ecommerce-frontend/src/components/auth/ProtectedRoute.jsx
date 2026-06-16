import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import { unwrapUser } from "../../utils/store";

function ProtectedRoute({ adminOnly = false, sellerOnly = false }) {
  const location = useLocation();

  // Initialize state based on cached localStorage values for instant loading
  const [state, setState] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return { loading: false, allowed: false };
    }

    try {
      const cachedUser = JSON.parse(localStorage.getItem("user"));
      if (cachedUser) {
        const role = String(cachedUser?.role || "").toLowerCase();
        const isAdmin = role === "admin";
        const isSeller = role === "seller";

        let allowed = true;
        if (adminOnly) allowed = isAdmin;
        else if (sellerOnly) allowed = isSeller;

        return { loading: false, allowed };
      }
    } catch (e) {
      // Ignore parsing errors and fallback to fetching
    }

    return { loading: true, allowed: false };
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setState({ loading: false, allowed: false });
      return;
    }

    let active = true;

    api
      .get("/user")
      .then((res) => {
        if (!active) return;
        const user = unwrapUser(res.data);
        localStorage.setItem("user", JSON.stringify(user));
        
        const role = String(user?.role || "").toLowerCase();
        const isAdmin = role === "admin";
        const isSeller = role === "seller";

        let allowed = true;
        if (adminOnly) allowed = isAdmin;
        else if (sellerOnly) allowed = isSeller;

        setState({ loading: false, allowed });
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setState({ loading: false, allowed: false });
      });

    return () => {
      active = false;
    };
  }, [adminOnly, sellerOnly]);

  if (state.loading) {
    return <div className="route-loader">Checking access...</div>;
  }

  if (!state.allowed) {
    const token = localStorage.getItem("token");
    const redirectTo = token && (adminOnly || sellerOnly) ? "/" : "/login";
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
