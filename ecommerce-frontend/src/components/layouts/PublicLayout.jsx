import { Outlet } from "react-router-dom";
import Navbar from "../Navbar";
import Footer from "../footer/Footer";

function PublicLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default PublicLayout;
