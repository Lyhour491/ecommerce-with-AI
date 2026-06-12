import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, getProductImages, money, unwrapList } from "../utils/store";

const productCategory = (product) => product?.category?.name || product?.category_name || product?.category || "General";
const productImages = (product) => getProductImages(product);

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("wishlist") || "[]");
      setWishlist(stored);
    } catch {
      setWishlist([]);
    }
  }, []);

  const toggleWishlist = () => {
    if (!product) return;
    const nextIds = wishlist.includes(product.id)
      ? wishlist.filter((item) => item !== product.id)
      : [...wishlist, product.id];
    setWishlist(nextIds);
    localStorage.setItem("wishlist", JSON.stringify(nextIds));
  };

  const toggleWishlistId = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    const nextIds = wishlist.includes(targetId)
      ? wishlist.filter((item) => item !== targetId)
      : [...wishlist, targetId];
    setWishlist(nextIds);
    localStorage.setItem("wishlist", JSON.stringify(nextIds));
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([api.get(`/products/${id}`), api.get("/products")])
      .then(([detailRes, listRes]) => {
        if (detailRes.status === "fulfilled") {
          setProduct(detailRes.value.data.data || detailRes.value.data.product || detailRes.value.data);
        } else {
          setError("Product not found.");
        }
        if (listRes.status === "fulfilled") setProducts(unwrapList(listRes.value.data, ["products"]));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => setActiveImage(0), [id]);

  const images = useMemo(() => productImages(product), [product]);
  const related = useMemo(() => {
    if (!product) return [];
    const category = productCategory(product);
    return products.filter((item) => item.id !== product.id && productCategory(item) === category).slice(0, 4);
  }, [products, product]);

  const addToCart = async () => {
    setMessage("");
    setError("");
    if (!localStorage.getItem("token")) return navigate("/login");
    try {
      await api.post("/cart", { product_id: product.id, quantity });
      setMessage("Product added to cart successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to add to cart."));
    }
  };

  if (loading) {
    return (
      <main className="proshop-page detail-page">
        <section className="detail-shell">
          <div className="breadcrumbs skeleton-line short skeleton-shimmer" style={{ height: 20 }} />
          <div className="skeleton-detail-grid">
            <aside className="skeleton-detail-thumbs">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="skeleton-thumb skeleton-shimmer" />
              ))}
            </aside>
            <div className="skeleton-detail-image skeleton-shimmer" />
            <div className="skeleton-detail-info">
              <div className="skeleton-line title skeleton-shimmer" style={{ width: '40%' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ height: 40, width: '80%' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '30%' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ height: 24, width: '50%' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ height: 60, width: '100%' }} />
              <div className="skeleton-row" style={{ padding: 0, marginTop: 20 }}>
                <div className="skeleton-line skeleton-shimmer" style={{ height: 44, width: 120, borderRadius: 10 }} />
                <div className="skeleton-line skeleton-shimmer" style={{ height: 44, width: 160, borderRadius: 10 }} />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }
  if (!product) return <main className="container"><div className="alert alert-error">{error}</div></main>;

  const stock = Number(product.stock || 0);
  const oldPrice = Number(product.old_price || product.compare_at_price || product.price * 1.15);

  return (
    <main className="proshop-page detail-page">
      <section className="detail-shell">
        <div className="breadcrumbs"><Link to="/products">Shop</Link><span>›</span><span>{productCategory(product)}</span><span>›</span><strong>{product.name}</strong></div>
        <div className="detail-grid">
          <aside className="thumb-column">
            {(images.length ? images : [""]).slice(0, 5).map((image, index) => (
              <button className={activeImage === index ? "active" : ""} key={`${image}-${index}`} onClick={() => setActiveImage(index)}>
                {image ? <img src={image} alt={`${product.name} ${index + 1}`} /> : <span>No image</span>}
              </button>
            ))}
          </aside>

          <div className="detail-image-card">
            <button
              className="detail-wish"
              onClick={toggleWishlist}
              style={{ color: wishlist.includes(product.id) ? "var(--danger)" : "inherit" }}
            >
              {wishlist.includes(product.id) ? "♥" : "♡"}
            </button>
            {images[activeImage] ? <img src={images[activeImage]} alt={product.name} /> : <div className="empty-img">No image</div>}
          </div>

          <aside className="detail-info-card">
            <span className="best-seller">Best Seller</span>
            <h1>{product.name}</h1>
            <div className="stars">★★★★★ <span>4.8 (128 Reviews)</span></div>
            <div className="detail-price"><strong>{money(product.price)}</strong><span>{money(oldPrice)}</span></div>
            <p className="saving">Save {money(Math.max(0, oldPrice - Number(product.price || 0)))} ({stock > 0 ? "In stock" : "Out of stock"})</p>
            <div className="color-dots"><button></button><button></button><button></button></div>
            <div className="cart-row">
              <div className="qty-stepper"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity((value) => Math.min(stock || 99, value + 1))}>+</button></div>
              <button className="btn btn-primary" onClick={addToCart}>🛒 Add to Cart</button>
            </div>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <div className="promise-row"><span>🚚 Free Shipping<br /><small>On all orders over $100</small></span><span>🛡️ 2 Year Warranty<br /><small>Full coverage guaranteed</small></span></div>
          </aside>
        </div>

        <div className="detail-lower-grid">
          <section className="description-card">
            <h2>Product Description</h2>
            <p>{product.description || "Experience premium quality with a modern product built for everyday performance, comfort, and reliability."}</p>
            <div className="feature-grid"><span>✓ Premium build quality</span><span>✓ Fast checkout support</span><span>✓ Secure cart integration</span><span>✓ Reliable stock control</span></div>
          </section>
          <section className="charge-card"><h2>⚡</h2><h3>Quick Delivery</h3><p>Fast order processing with trusted store fulfillment.</p><button>Learn More</button></section>
        </div>

        <section className="related-section">
          <div className="section-title-row"><div><h2>Related Products</h2><p>You might also like these accessories</p></div><Link to="/products">View All →</Link></div>
          <div className="related-grid">
            {(related.length ? related : products.filter((item) => item.id !== product.id).slice(0, 4)).map((item) => {
              const image = getImageUrl(item);
              return (
                <Link className="related-card" to={`/products/${item.id}`} key={item.id}>
                  <div>
                    {image ? <img src={image} alt={item.name} /> : <div className="empty-img">No image</div>}
                    <button
                      onClick={(e) => toggleWishlistId(e, item.id)}
                      style={{ color: wishlist.includes(item.id) ? "var(--danger)" : "inherit" }}
                    >
                      {wishlist.includes(item.id) ? "♥" : "♡"}
                    </button>
                  </div>
                  <small>{productCategory(item)}</small>
                  <h3>{item.name}</h3>
                  <strong>{money(item.price)}</strong>
                </Link>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
export default ProductDetail;
