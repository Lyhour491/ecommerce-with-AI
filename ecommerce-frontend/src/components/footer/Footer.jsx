import { Link } from "react-router-dom";
import { ShieldCheck, Truck, Award, RotateCcw, Sparkles } from "lucide-react";

function Footer() {
  return (
    <footer className="global-footer">
      {/* Value Propositions Section */}
      <div className="footer-props-section">
        <div className="footer-props-inner">
          <div className="prop-item">
            <div className="prop-icon-wrapper">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3>Secure Payments</h3>
              <p>100% secure transaction with major providers</p>
            </div>
          </div>
          <div className="prop-item">
            <div className="prop-icon-wrapper">
              <Truck size={22} />
            </div>
            <div>
              <h3>Fast Delivery</h3>
              <p>Quick shipping to your local address</p>
            </div>
          </div>
          <div className="prop-item">
            <div className="prop-icon-wrapper">
              <Award size={22} />
            </div>
            <div>
              <h3>Quality Guarantee</h3>
              <p>Verified products from trusted sellers</p>
            </div>
          </div>
          <div className="prop-item">
            <div className="prop-icon-wrapper">
              <RotateCcw size={22} />
            </div>
            <div>
              <h3>Easy Returns</h3>
              <p>Hassle-free returns within 30 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Branding */}
      <div className="footer-links-section">
        <div className="footer-links-inner">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="logo-icon footer-logo-icon">
                <Sparkles size={14} color="white" fill="white" />
              </div>
              <h2>MarketAI</h2>
            </div>
            <p>AI-powered marketplace connecting buyers and sellers worldwide.</p>
          </div>

          {/* Buyers Column */}
          <div className="footer-links-col">
            <h3>For Buyers</h3>
            <nav className="footer-nav">
              <Link to="/products">Browse Products</Link>
              <Link to="/orders">Track Orders</Link>
              <Link to="/wishlist">Wishlist</Link>
              <span className="footer-static-link">Help Center</span>
            </nav>
          </div>

          {/* Sellers Column */}
          <div className="footer-links-col">
            <h3>For Sellers</h3>
            <nav className="footer-nav">
              <Link to="/seller">Seller Dashboard</Link>
              <Link to="/become-seller">Become a Seller</Link>
              <Link to="/seller/payouts">Earnings</Link>
              <span className="footer-static-link">Seller Guide</span>
            </nav>
          </div>

          {/* Company Column */}
          <div className="footer-links-col">
            <h3>Company</h3>
            <nav className="footer-nav">
              <span className="footer-static-link">About Us</span>
              <span className="footer-static-link">Contact</span>
              <span className="footer-static-link">FAQ</span>
              <span className="footer-static-link">Privacy Policy</span>
            </nav>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-inner">
          <p>© 2026 MarketAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
