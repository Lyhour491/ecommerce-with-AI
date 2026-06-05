import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { getImageUrl, money, unwrapList } from "../utils/store";

function Home() {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBestSellers() {
      try {
        const res = await api.get("/top-products");
        if (active) setTopProducts(unwrapList(res.data, ["products", "top_products"]).slice(0, 4));
      } catch (error) {
        try {
          const fallback = await api.get("/products");
          if (active) setTopProducts(unwrapList(fallback.data, ["products"]).slice(0, 4));
        } catch {
          if (active) setTopProducts([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBestSellers();
    return () => { active = false; };
  }, []);

  return (
    <main className="container">
      {/* Premium Hero Section */}
      <section className="hero" style={{ marginBottom: "50px" }}>
        <div>
          <p className="page-subtitle">Next-Gen Marketplace • Powered by AI</p>
          <h1 style={{ marginTop: "12px" }}>Discover the Future of E-Commerce.</h1>
          <p style={{ margin: "18px 0 28px" }}>
            Experience a curated shopping journey driven by smart algorithms, real-time demand, and seamless seller onboarding.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/products">Shop best sellers</Link>
            <Link className="btn btn-ghost" to="/become-seller">Become a Seller</Link>
          </div>
        </div>
        <div className="hero-card">
          <span>Live from Platform Analytics</span>
          <strong>MarketAI</strong>
          <small>Smart Recommendations Engine Active</small>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="best-seller-section">
        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <p className="page-subtitle">Featured Products</p>
            <h2 style={{ fontSize: "32px", fontWeight: "800", margin: "8px 0 0" }}>Top Products & Best Sellers</h2>
          </div>
          <Link className="btn btn-ghost" to="/products">View all products</Link>
        </div>

        {loading ? (
          <div className="loading card" style={{ padding: "40px", textAlignment: "center" }}>Loading best sellers...</div>
        ) : topProducts.length === 0 ? (
          <div className="empty-state card" style={{ padding: "40px", textAlignment: "center" }}>No best seller products yet.</div>
        ) : (
          <div className="pro-product-grid">
            {topProducts.map((product, index) => {
              const imageUrl = getImageUrl(product);
              const sold = Number(product.sold_count || product.orders_count || product.total_sold || 0);
              return (
                <Link className="pro-product-card" to={`/products/${product.id}`} key={product.id}>
                  <div className="product-media">
                    {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="empty-img">No image</div>}
                    <span className="best-seller">#{index + 1} Best Seller</span>
                  </div>
                  <div className="pro-card-body">
                    <div>
                      <h2>{product.name}</h2>
                      <p>{product.category?.name || product.category_name || "Product"}</p>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <strong style={{ fontSize: "18px", fontWeight: "800" }}>{money(product.price)}</strong>
                      <span style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px", fontWeight: "600" }}>
                        {sold > 0 ? `${sold} sold` : "New item"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
export default Home;
