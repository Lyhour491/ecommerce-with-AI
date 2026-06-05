import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import { unwrapUser } from "../../utils/store";

function ProtectedRoute({ adminOnly = false, sellerOnly = false }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, allowed: false });

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
        else if (sellerOnly) allowed = isSeller || isAdmin;

        setState({ loading: false, allowed });
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (active) setState({ loading: false, allowed: false });
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
