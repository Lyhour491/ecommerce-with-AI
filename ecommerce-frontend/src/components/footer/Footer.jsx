import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <h2>
            <Link to="/">MarketAI</Link>
          </h2>
          <p>© 2026 MarketAI. Built for efficiency.</p>
        </div>

        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/become-seller">Become a Seller</Link>
          <span>About Us</span>
          <span>Contact</span>
          <span>Shipping Policy</span>
          <span>Returns</span>
          <span>Privacy</span>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
