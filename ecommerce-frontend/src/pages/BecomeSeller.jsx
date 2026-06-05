import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { unwrapUser } from "../utils/store";
import { 
  Briefcase, DollarSign, Users, Shield, Headphones, BarChart2, 
  Settings, CheckCircle, ArrowRight, Star, ShoppingCart 
} from "lucide-react";

function BecomeSeller() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;

    api.get("/user")
      .then((res) => {
        setUser(unwrapUser(res.data));
      })
      .catch((err) => {
        console.error("Failed to fetch user state", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleApplyClick = () => {
    if (!token) {
      navigate("/login", { state: { from: "/become-seller/apply" } });
    } else {
      navigate("/become-seller/apply");
    }
  };

  if (loading) {
    return <div className="loading">Checking your application status...</div>;
  }

  const isAlreadySeller = user?.role === "seller";
  const isPending = user?.seller_status === "pending";
  const isRejected = user?.seller_status === "rejected";

  return (
    <main className="proshop-page become-seller-landing">
      <div className="container">
        {/* State Notice Banner if applicable */}
        {token && (
          <div className="status-banner-wrap">
            {isAlreadySeller ? (
              <div className="alert alert-success">
                🎉 <strong>You are already a registered Seller!</strong> You have access to the dashboard. 
                <Link to="/seller" className="btn btn-primary" style={{ marginLeft: "15px", minHeight: "36px", padding: "6px 14px" }}>Go to Seller Hub</Link>
              </div>
            ) : isPending ? (
              <div className="alert alert-error" style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                ⏳ <strong>Application Pending:</strong> Your application for <strong>"{user.shop_name}"</strong> is currently waiting for admin approval. Please check back in 1-2 business days.
              </div>
            ) : isRejected ? (
              <div className="alert alert-error">
                ❌ <strong>Application Rejected:</strong> Your previous seller application was not approved. You can review the details and submit a new application.
              </div>
            ) : null}
          </div>
        )}

        <div className="settings-kicker" style={{ marginTop: "10px" }}>Become a Seller</div>

        {/* 1. Hero Section */}
        <section className="become-seller-hero">
          <div className="hero-icon-wrapper">
            <div className="settings-avatar" style={{ margin: "0 auto 20px" }}>
              <ShoppingCart size={32} />
            </div>
          </div>
          <h1>Start Selling Today</h1>
          <p>
            Join thousands of successful sellers and grow your business with our AI-powered marketplace platform.
          </p>
          <div className="hero-ctas">
            {isAlreadySeller ? (
              <Link className="btn btn-primary" to="/seller">Go to Seller Hub</Link>
            ) : isPending ? (
              <button className="btn btn-primary" disabled>Application Pending Review</button>
            ) : (
              <button className="btn btn-primary" onClick={handleApplyClick}>Apply Now</button>
            )}
            <a className="btn btn-ghost" href="#why-sell">Learn More</a>
          </div>
        </section>

        {/* 2. Stats Section */}
        <section className="seller-stats-row">
          <div className="seller-stat-card">
            <h2>90%</h2>
            <p>You Keep From Sales</p>
          </div>
          <div className="seller-stat-card">
            <h2>24/7</h2>
            <p>Seller Support</p>
          </div>
          <div className="seller-stat-card">
            <h2>1000+</h2>
            <p>Active Sellers</p>
          </div>
        </section>

        {/* 3. Why Sell With Us? */}
        <section id="why-sell" className="why-sell-section" style={{ marginTop: "64px" }}>
          <h2 className="section-title-centered">Why Sell With Us?</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon green"><DollarSign size={20} /></div>
              <h3>Earn More</h3>
              <p>Keep 90% of your sales. Only 10% platform commission.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon blue"><Users size={20} /></div>
              <h3>Large Audience</h3>
              <p>Reach thousands of active buyers on our platform.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon orange"><Star size={20} /></div>
              <h3>AI-Powered Insights</h3>
              <p>Get smart recommendations to grow your business.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon blue"><BarChart2 size={20} /></div>
              <h3>Analytics Dashboard</h3>
              <p>Track sales, revenue, and customer behavior in real-time.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon purple"><Shield size={20} /></div>
              <h3>Secure Payments</h3>
              <p>Fast, reliable payouts with fraud protection.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon green"><Settings size={20} /></div>
              <h3>Easy Management</h3>
              <p>Simple tools to manage products, orders, and inventory.</p>
            </div>
          </div>
        </section>

        {/* 4. How It Works */}
        <section className="how-it-works-section" style={{ marginTop: "64px" }}>
          <h2 className="section-title-centered">How It Works</h2>
          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Apply</h3>
              <p>Fill out a simple application form</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Get Approved</h3>
              <p>Review takes 1-2 business days</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Setup Store</h3>
              <p>Add products and customize your store</p>
            </div>
            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Start Selling</h3>
              <p>Watch your business grow</p>
            </div>
          </div>
        </section>

        {/* 5. Pricing Card */}
        <section className="pricing-card-section" style={{ marginTop: "64px" }}>
          <div className="pricing-box">
            <span className="pricing-badge">Simple Pricing</span>
            <h2>Only 10% Commission</h2>
            <p className="pricing-desc">
              No monthly fees, no hidden charges. Just a simple 10% fee on each sale. You keep 90% of your revenue.
            </p>
            <div className="pricing-ticks">
              <span><CheckCircle size={16} className="tick-icon" /> Free to join</span>
              <span><CheckCircle size={16} className="tick-icon" /> No listing fees</span>
              <span><CheckCircle size={16} className="tick-icon" /> Fast payouts</span>
            </div>
            <button className="btn btn-primary pricing-btn" onClick={handleApplyClick} disabled={isAlreadySeller || isPending}>
              Get Started Now <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* 6. Bottom Call to Action */}
        <section className="ready-to-sell-cta" style={{ marginTop: "80px", textAlign: "center" }}>
          <h2>Ready to Start Selling?</h2>
          <p style={{ color: "var(--muted)", marginBottom: "20px" }}>Join our marketplace and start growing your business today</p>
          <button className="btn btn-primary" onClick={handleApplyClick} disabled={isAlreadySeller || isPending} style={{ padding: "12px 28px" }}>
            Apply to Become a Seller
          </button>
        </section>
      </div>
    </main>
  );
}

export default BecomeSeller;
