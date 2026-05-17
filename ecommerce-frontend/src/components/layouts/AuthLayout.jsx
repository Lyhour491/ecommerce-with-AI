import { Outlet } from "react-router-dom";
import Footer from "../footer/Footer";

function AuthLayout() {
  return (
    <div className="app-shell">
      <div className="app-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default AuthLayout;
