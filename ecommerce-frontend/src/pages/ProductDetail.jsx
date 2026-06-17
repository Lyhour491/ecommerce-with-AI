import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { firstApiError, getImageUrl, getProductImages, money, unwrapList } from "../utils/store";
import { useDocumentTitle } from "../utils/seo";
import { aiService } from "../services/aiService";
import { authStore } from "../store/authStore";

const productCategory = (product) => product?.category?.name || product?.category_name || product?.category || "General";
const productImages = (product) => getProductImages(product);

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  useDocumentTitle(product ? `${product.name} - Buy Online` : "Loading Product...", product ? product.description : "View detailed features, descriptions, ratings and user feedback.");
  const [products, setProducts] = useState([]);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loadingAiRec, setLoadingAiRec] = useState(false);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const loadWishlist = async () => {
    const hasToken = !!localStorage.getItem("token");
    if (hasToken) {
      try {
        const res = await api.get("/wishlist");
        setWishlist(res.data.map(p => p.id));
      } catch (err) {
        console.error("Failed to load wishlist in product detail", err);
      }
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem("wishlist") || "[]");
        setWishlist(stored);
      } catch {
        setWishlist([]);
      }
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const toggleWishlist = async () => {
    if (!product) return;
    const hasToken = !!localStorage.getItem("token");
    if (hasToken) {
      try {
        const res = await api.post("/wishlist", { product_id: product.id });
        const { in_wishlist } = res.data;
        if (in_wishlist) {
          setWishlist(prev => [...prev, product.id]);
        } else {
          setWishlist(prev => prev.filter(item => item !== product.id));
        }
      } catch (err) {
        console.error("Failed to toggle DB wishlist:", err);
      }
    } else {
      const nextIds = wishlist.includes(product.id)
        ? wishlist.filter((item) => item !== product.id)
        : [...wishlist, product.id];
      setWishlist(nextIds);
      localStorage.setItem("wishlist", JSON.stringify(nextIds));
    }
  };

  const toggleWishlistId = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    const hasToken = !!localStorage.getItem("token");
    if (hasToken) {
      try {
        const res = await api.post("/wishlist", { product_id: targetId });
        const { in_wishlist } = res.data;
        if (in_wishlist) {
          setWishlist(prev => [...prev, targetId]);
        } else {
          setWishlist(prev => prev.filter(item => item !== targetId));
        }
      } catch (err) {
        console.error("Failed to toggle DB wishlist:", err);
      }
    } else {
      const nextIds = wishlist.includes(targetId)
        ? wishlist.filter((item) => item !== targetId)
        : [...wishlist, targetId];
      setWishlist(nextIds);
      localStorage.setItem("wishlist", JSON.stringify(nextIds));
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([api.get(`/products/${id}`), api.get("/products")])
      .then(([detailRes, listRes]) => {
        if (detailRes.status === "fulfilled") {
          const prodData = detailRes.value.data.data || detailRes.value.data.product || detailRes.value.data;
          setProduct(prodData);
          setReviews(prodData.reviews || []);
        } else {
          setError("Product not found.");
        }
        if (listRes.status === "fulfilled") setProducts(unwrapList(listRes.value.data, ["products"]));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => setActiveImage(0), [id]);

  useEffect(() => {
    if (!id || !authStore.getToken()) {
      setAiRecommendations([]);
      return;
    }
    setLoadingAiRec(true);
    aiService.recommendProducts(id)
      .then((data) => {
        setAiRecommendations(data || []);
      })
      .catch((err) => {
        console.error("Failed to load AI recommendations", err);
        setAiRecommendations([]);
      })
      .finally(() => setLoadingAiRec(false));
  }, [id]);


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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError("");
    setReviewSuccess("");
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product.id}/reviews`, {
        rating: newReviewRating,
        comment: newReviewComment,
      });
      setReviewSuccess("Review submitted successfully!");
      setNewReviewComment("");
      setReviews(prev => [res.data.review, ...prev]);
    } catch (err) {
      setReviewError(firstApiError(err, "Failed to submit review."));
    } finally {
      setSubmittingReview(false);
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
  const averageRating = Number(product.average_rating || 0);

  const renderStars = (rating) => {
    const rounded = Math.round(rating);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  };

  const ratingBreakdown = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
    counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };
  
  if (reviews.length > 0) {
    reviews.forEach(r => {
      const rVal = Math.min(5, Math.max(1, Math.round(r.rating)));
      ratingBreakdown.counts[rVal] = (ratingBreakdown.counts[rVal] || 0) + 1;
    });
    [5, 4, 3, 2, 1].forEach(stars => {
      ratingBreakdown[stars] = Math.round((ratingBreakdown.counts[stars] / reviews.length) * 100);
    });
  }

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
            <div className="stars">
              <span style={{ color: "#fbbf24", marginRight: 6 }}>{renderStars(averageRating)}</span>
              <span>{averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})</span>
            </div>
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

        {/* Reviews & Ratings Section */}
        <section className="reviews-section" style={{ marginTop: 48, paddingTop: 40, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, marginBottom: 40 }}>
            
            {/* Ratings Breakdown Summary */}
            <div style={{ background: "white", padding: 28, borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 800 }}>Customer Reviews</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <h1 style={{ fontSize: 56, margin: 0, fontWeight: 900, lineHeight: 1 }}>{averageRating.toFixed(1)}</h1>
                <div>
                  <div style={{ color: "#fbbf24", fontSize: 22, lineHeight: 1 }}>{renderStars(averageRating)}</div>
                  <small style={{ color: "var(--muted)", display: "block", marginTop: 4, fontSize: 13 }}>Based on {reviews.length} reviews</small>
                </div>
              </div>

              {/* Breakdown progress bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const pct = ratingBreakdown[stars];
                  return (
                    <div key={stars} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                      <span style={{ width: 14, fontWeight: 700 }}>{stars}</span>
                      <span style={{ color: "#fbbf24" }}>★</span>
                      <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#fbbf24", borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 30, textAlign: "right", color: "var(--muted)", fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a Review Form */}
            <div style={{ background: "white", padding: 28, borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 800 }}>Write a Review</h3>
              {localStorage.getItem("token") ? (
                <form onSubmit={handleReviewSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {reviewSuccess && <div className="alert alert-success">{reviewSuccess}</div>}
                  {reviewError && <div className="alert alert-error">{reviewError}</div>}
                  
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 750, fontSize: 13, color: "var(--text)" }}>Rating</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewReviewRating(star)}
                          style={{
                            background: "none", border: "none", fontSize: 28, cursor: "pointer",
                            color: star <= newReviewRating ? "#fbbf24" : "#e2e8f0",
                            padding: 0, transition: "transform 0.1s"
                          }}
                          onMouseEnter={(e) => e.target.style.transform = "scale(1.15)"}
                          onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-feedback" style={{ display: "block", marginBottom: 6, fontWeight: 750, fontSize: 13, color: "var(--text)" }}>Feedback</label>
                    <textarea
                      id="review-feedback"
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Share your thoughts on this product..."
                      required
                      rows={3}
                      style={{
                        width: "100%", padding: 12, borderRadius: 10, border: "1px solid var(--border)",
                        fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none",
                        transition: "border-color 0.15s"
                      }}
                      onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                      onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingReview}
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80%", textAlign: "center", padding: "20px 0" }}>
                  <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 14 }}>Please log in to share your thoughts and review this product.</p>
                  <Link to="/login" className="btn btn-primary">Log In</Link>
                </div>
              )}
            </div>
          </div>

          {/* Review List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 800 }}>Reviews ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <div style={{ background: "white", padding: "48px 24px", borderRadius: 16, border: "1px solid var(--border)", textAlign: "center" }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>No reviews yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} style={{ background: "white", padding: 24, borderRadius: 16, border: "1px solid var(--border)", boxShadow: "0 2px 4px rgb(0 0 0 / 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 15, color: "var(--text)" }}>{rev.user?.name || "Customer"}</strong>
                        {rev.verified_purchase && (
                          <span style={{
                            fontSize: 11, background: "#ecfdf5", color: "#059669",
                            padding: "2px 8px", borderRadius: 12, fontWeight: 800
                          }}>
                            ✓ Verified Purchase
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#fbbf24", fontSize: 14, marginTop: 4 }}>
                        {renderStars(rev.rating)}
                      </div>
                    </div>
                    <small style={{ color: "var(--muted)", fontSize: 12, fontWeight: 500 }}>
                      {new Date(rev.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </small>
                  </div>
                  <p style={{ margin: 0, color: "var(--text)", fontSize: 14.5, lineHeight: "1.6", whiteSpace: "pre-line" }}>{rev.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* AI Smart Recommendations */}
        {aiRecommendations.length > 0 && (
          <section className="ai-recommendations" style={{ marginBottom: 40 }}>
            <div className="ai-recommendations-header">
              <span className="ai-badge">AI Suggested Pairs</span>
              <h2 style={{ margin: "10px 0 0 0" }}>Recommended Accessories</h2>
            </div>
            <div className="ai-rec-grid" style={{ marginTop: 20 }}>
              {aiRecommendations.map((item) => {
                const recProduct = item.product;
                const reason = item.reason;
                return (
                  <div
                    key={recProduct.id}
                    className="ai-rec-card"
                    onClick={() => navigate(`/products/${recProduct.id}`)}
                  >
                    {recProduct.image ? (
                      <img src={recProduct.image} alt={recProduct.name} />
                    ) : (
                      <div className="empty-img" style={{ height: 160 }}>No image</div>
                    )}
                    <div className="ai-rec-card-info">
                      <small style={{ color: "var(--primary)", fontWeight: "bold", fontSize: 11 }}>
                        {recProduct.category_name || "General"}
                      </small>
                      <h4 style={{ margin: "4px 0", fontSize: 15, fontWeight: "750" }}>{recProduct.name}</h4>
                      <strong style={{ color: "var(--primary)", fontSize: 14 }}>{money(recProduct.price)}</strong>
                    </div>
                    <div className="ai-rec-reason">
                      ✨ {reason}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
