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
    <main className="container home-best-sellers">
      <section className="best-seller-hero">
        <div>
          <p className="page-subtitle">Top Product • Best Seller</p>
          <h1>Best-selling products customers love.</h1>
          <p>
            Discover the most ordered products from your store, ranked from real order items.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" to="/products">Shop best sellers</Link>
            <Link className="btn btn-ghost" to="/cart">View cart</Link>
          </div>
        </div>
        <div className="best-seller-card">
          <span>Live from order_items</span>
          <strong>Best Seller</strong>
          <small>Updated automatically after checkout</small>
        </div>
      </section>

      <section className="best-seller-section">
        <div className="section-head">
          <div>
            <p className="page-subtitle">Featured products</p>
            <h2>Top Product Best Seller</h2>
          </div>
          <Link className="btn btn-ghost" to="/products">View all products</Link>
        </div>

        {loading ? (
          <div className="loading card">Loading best sellers...</div>
        ) : topProducts.length === 0 ? (
          <div className="empty-state card">No best seller products yet.</div>
        ) : (
          <div className="best-seller-grid">
            {topProducts.map((product, index) => {
              const imageUrl = getImageUrl(product);
              const sold = Number(product.sold_count || product.orders_count || product.total_sold || 0);
              return (
                <Link className="best-seller-product" to={`/products/${product.id}`} key={product.id}>
                  <div className="best-seller-rank">#{index + 1}</div>
                  <div className="best-seller-media">
                    {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="empty-img">No image</div>}
                    <span>{index === 0 ? "Best Seller" : "Top Product"}</span>
                  </div>
                  <div className="best-seller-info">
                    <small>{product.category?.name || product.category_name || "Product"}</small>
                    <h3>{product.name}</h3>
                    <div className="best-seller-meta">
                      <strong>{money(product.price)}</strong>
                      <em>{sold > 0 ? `${sold} sold` : "New item"}</em>
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
