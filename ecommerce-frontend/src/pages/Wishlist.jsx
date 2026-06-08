import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { getImageUrl, money, unwrapList } from "../utils/store";

const productCategory = (product) => product.category?.name || product.category_name || product.category || "General";
const productStorage = (product) => product.sku || product.storage || product.stock_unit || `${product.stock ?? 0} units`;
const productRating = (product) => Number(product.rating || product.average_rating || 4.6);
const productReviews = (product) => Number(product.reviews_count || product.review_count || product.orders_count || 24);

function Wishlist() {
  const [wishlistIds, setWishlistIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load wishlist ids from local storage
    try {
      const stored = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWishlistIds(stored);
    } catch {
      setWishlistIds([]);
    }

    // Load all products to filter
    api.get("/products")
      .then((res) => {
        setProducts(unwrapList(res.data, ["products"]));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleWishlist = (id) => {
    const nextIds = wishlistIds.includes(id)
      ? wishlistIds.filter((item) => item !== id)
      : [...wishlistIds, id];
    
    setWishlistIds(nextIds);
    localStorage.setItem("wishlist", JSON.stringify(nextIds));
  };

  const wishlistedProducts = products.filter((product) => wishlistIds.includes(product.id));

  if (loading) return <div className="loading">Loading your whitelist...</div>;

  return (
    <main className="proshop-page">
      <div className="container" style={{ maxWidth: 1180, padding: "34px 22px 64px" }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>My whitelist</h1>
        <p className="page-subtitle" style={{ marginBottom: 34 }}>Manage the products you have whitelisted for future review.</p>

        {wishlistedProducts.length === 0 ? (
          <div className="card" style={{ padding: "64px 24px", textAlign: "center", background: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", background: "#fef2f2",
              display: "grid", placeItems: "center", color: "var(--danger)", fontSize: 36,
              border: "1px dashed var(--border)"
            }}>
              ♥
            </div>
            <h2 style={{ margin: 0, fontSize: 24, color: "var(--text)" }}>Your whitelist is empty</h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: 380, fontSize: 15 }}>
              Add items to your whitelist to keep track of them. You can view, compare, or buy them anytime.
            </p>
            <Link to="/products" className="btn btn-primary" style={{ marginTop: 8 }}>Browse Products</Link>
          </div>
        ) : (
          <div className="pro-product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {wishlistedProducts.map((product) => {
              const imageUrl = getImageUrl(product);
              const stock = Number(product.stock || 0);
              return (
                <div className="pro-product-card" key={product.id} style={{ position: "relative", background: "white" }}>
                  <div className="product-media">
                    <button
                      className="wish-btn"
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      style={{ color: "var(--danger)" }}
                    >
                      ♥
                    </button>
                    <Link to={`/products/${product.id}`} style={{ display: "block", width: "100%", height: "100%" }}>
                      {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="empty-img">No image</div>}
                    </Link>
                  </div>
                  <Link to={`/products/${product.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="pro-card-body">
                      <div>
                        <h2>{product.name}</h2>
                        <p>{productStorage(product)}</p>
                      </div>
                      <strong>{money(product.price)}</strong>
                    </div>
                    <div className="rating-row">
                      <span>★ {productRating(product).toFixed(1)}</span>
                      <small>({productReviews(product)} reviews)</small>
                      <small className={stock > 0 ? "stock-good" : "stock-out"}>{stock > 0 ? "In Stock" : "Sold out"}</small>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Wishlist;
