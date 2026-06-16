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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      // 1. Try to fetch wishlist from backend (authenticated)
      const res = await api.get("/wishlist");
      const dbProducts = res.data;
      
      // 2. Check if there are local wishlist items from guest session to sync
      const local = JSON.parse(localStorage.getItem("wishlist") || "[]");
      if (local.length > 0) {
        // Sync local items to DB
        await Promise.all(
          local.map(id => api.post("/wishlist", { product_id: id }).catch(() => null))
        );
        // Clear local storage since they are synced to DB
        localStorage.removeItem("wishlist");
        // Refetch updated wishlist
        const updatedRes = await api.get("/wishlist");
        setProducts(updatedRes.data);
        setWishlistIds(updatedRes.data.map(p => p.id));
      } else {
        setProducts(dbProducts);
        setWishlistIds(dbProducts.map(p => p.id));
      }
      setIsAuthenticated(true);
    } catch (err) {
      // 3. Fallback to local storage (guest)
      setIsAuthenticated(false);
      let localIds = [];
      try {
        localIds = JSON.parse(localStorage.getItem("wishlist") || "[]");
      } catch {
        localIds = [];
      }
      setWishlistIds(localIds);

      // Load all products to filter
      try {
        const prodRes = await api.get("/products");
        const allProducts = unwrapList(prodRes.data, ["products"]);
        setProducts(allProducts.filter(p => localIds.includes(p.id)));
      } catch (prodErr) {
        console.error("Failed to load products for guest wishlist:", prodErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const toggleWishlist = async (id) => {
    if (isAuthenticated) {
      try {
        const res = await api.post("/wishlist", { product_id: id });
        const { in_wishlist } = res.data;
        if (in_wishlist) {
          setWishlistIds(prev => [...prev, id]);
          // Add product to state by fetching details or reloading
          loadWishlist();
        } else {
          setWishlistIds(prev => prev.filter(item => item !== id));
          setProducts(prev => prev.filter(p => p.id !== id));
        }
      } catch (err) {
        console.error("Failed to toggle DB wishlist:", err);
      }
    } else {
      const nextIds = wishlistIds.includes(id)
        ? wishlistIds.filter((item) => item !== id)
        : [...wishlistIds, id];
      
      setWishlistIds(nextIds);
      localStorage.setItem("wishlist", JSON.stringify(nextIds));
      setProducts(prev => prev.filter(p => nextIds.includes(p.id)));
    }
  };

  if (loading) return <div className="loading">Loading your wishlist...</div>;

  return (
    <main className="proshop-page">
      <div className="container" style={{ maxWidth: 1180, padding: "34px 22px 64px" }}>
        <h1 className="page-title" style={{ marginBottom: 8 }}>My Wishlist</h1>
        <p className="page-subtitle" style={{ marginBottom: 34 }}>Manage the products you have whitelisted for future review.</p>

        {products.length === 0 ? (
          <div className="card" style={{ padding: "64px 24px", textAlign: "center", background: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", background: "#fef2f2",
              display: "grid", placeItems: "center", color: "var(--danger)", fontSize: 36,
              border: "1px dashed var(--border)"
            }}>
              ♥
            </div>
            <h2 style={{ margin: 0, fontSize: 24, color: "var(--text)" }}>Your wishlist is empty</h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: 380, fontSize: 15 }}>
              Add items to your wishlist to keep track of them. You can view, compare, or buy them anytime.
            </p>
            <Link to="/products" className="btn btn-primary" style={{ marginTop: 8 }}>Browse Products</Link>
          </div>
        ) : (
          <div className="pro-product-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
            {products.map((product) => {
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
