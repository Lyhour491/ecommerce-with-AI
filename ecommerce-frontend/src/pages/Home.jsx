import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getImageUrl, money, unwrapList } from "../utils/store";
import { 
  Sparkles, Cpu, Shirt, Home as HomeIcon, Trophy, BookOpen, Rocket, 
  ArrowRight, Star, ShoppingCart, MessageSquare, Send, X, ShieldCheck, 
  Truck, Award, RotateCcw 
} from "lucide-react";

function Home() {
  const navigate = useNavigate();
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive Chatbot Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Hello! I am your AI Shopping Assistant. Tell me what kind of products you are looking for today, and I'll find the best matches!" }
  ]);
  const [userInput, setUserInput] = useState("");
  const [addingToCartId, setAddingToCartId] = useState(null);

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

  const handleAddToCart = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setAddingToCartId(productId);
    try {
      await api.post("/cart", { product_id: productId, quantity: 1 });
      alert("Product added to cart successfully!");
    } catch (err) {
      alert("Failed to add product to cart.");
    } finally {
      setAddingToCartId(null);
    }
  };

  const categoriesList = [
    { name: "Electronics", count: "12.5k Items", icon: <Cpu size={22} />, slug: "Electronics" },
    { name: "Fashion", count: "8.2k Items", icon: <Shirt size={22} />, slug: "Fashion" },
    { name: "Home & Garden", count: "5.4k Items", icon: <HomeIcon size={22} />, slug: "Home Office" },
    { name: "Sports", count: "4.1k Items", icon: <Trophy size={22} />, slug: "Footwear" },
    { name: "Books", count: "2.8k Items", icon: <BookOpen size={22} />, slug: "Books" },
    { name: "Toys", count: "1.5k Items", icon: <Rocket size={22} />, slug: "Toys" },
  ];

  // Simple chatbot recommendation rule engine
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const query = userInput.toLowerCase();
    const userMsg = { sender: "user", text: userInput };
    setChatMessages(prev => [...prev, userMsg]);
    setUserInput("");

    setTimeout(() => {
      let responseText = "I see! Browse our categories or search for specific terms. Is there anything in Electronics, Fashion, or Audio you are interested in?";
      
      if (query.includes("headphone") || query.includes("audio") || query.includes("sound") || query.includes("ear")) {
        responseText = "Based on our AI catalog analysis, we highly recommend the **ProSeries Wireless Headphones** ($349.00). It features 40-hour battery life and memory foam cushions, and has a 4.8★ user rating. [View Product](/products/1)";
      } else if (query.includes("watch") || query.includes("smartwatch") || query.includes("time")) {
        responseText = "For smart wearables, the **Pro Precision Smart Watch** ($249.00) is currently our top recommendation with premium health tracking. [View Product](/products/3)";
      } else if (query.includes("shoe") || query.includes("run") || query.includes("sport") || query.includes("sneaker")) {
        responseText = "Our top footwear choice is the **Sprint Runner Elite** ($129.00) built for comfortable running and high durability. [View Product](/products/4)";
      } else if (query.includes("case") || query.includes("bag") || query.includes("travel")) {
        responseText = "Consider checking out the **Carbon Fiber Travel Case** ($49.00) or our **Designer Backpack** ($89.99), perfect for accessories and daily commutes. [View Product](/products/6)";
      } else if (query.includes("hi") || query.includes("hello") || query.includes("hey")) {
        responseText = "Hi there! I can suggest products like Headphones, Smartwatches, Running Shoes, and Travel Cases. What are you looking to buy today?";
      }

      setChatMessages(prev => [...prev, { sender: "ai", text: responseText }]);
    }, 800);
  };

  // Static fallback values to ensure cards look exactly like mockups
  const getRating = (id) => (id % 5 === 0 ? 4.5 : (id % 5 === 1 ? 4.8 : (id % 5 === 2 ? 4.9 : 4.7)));
  const getReviews = (id) => (id * 17) % 150 + 20;
  const getSeller = (id) => (id % 2 === 0 ? "TechWorks" : "StyleCo");

  return (
    <main className="home-container">
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-banner-content">
          <div className="hero-badge">
            <Sparkles size={14} className="hero-badge-icon" />
            <span>AI-Powered Shopping</span>
          </div>
          <h1>Discover Amazing Products with AI Assistance</h1>
          <p>Shop smarter with personalized recommendations, verified sellers, and secure transactions.</p>
          <div className="hero-banner-actions">
            <Link className="btn-hero-primary" to="/products">
              <span>Start Shopping</span>
              <ArrowRight size={18} />
            </Link>
            <Link className="btn-hero-secondary" to="/become-seller">
              Become a Seller
            </Link>
          </div>
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="category-section">
        <div className="section-title-wrap">
          <h2>Browse by Category</h2>
          <p>Find exactly what you're looking for</p>
        </div>
        <div className="category-grid">
          {categoriesList.map((cat, idx) => (
            <Link 
              key={idx} 
              to={`/products?category=${encodeURIComponent(cat.slug)}`} 
              className="category-card"
            >
              <div className="category-icon-wrapper">
                {cat.icon}
              </div>
              <h3>{cat.name}</h3>
              <p>{cat.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="featured-section">
        <div className="featured-section-header">
          <div className="section-title-left">
            <h2>Featured Products</h2>
            <p>Handpicked by our AI for you</p>
          </div>
          <Link to="/products" className="view-all-link">
            <span>View All</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="home-loading">
            <div className="spinner"></div>
            <p>Loading featured products...</p>
          </div>
        ) : topProducts.length === 0 ? (
          <div className="home-empty">No featured products found. Check that Laravel and DB are seeded.</div>
        ) : (
          <div className="featured-products-grid">
            {topProducts.map((product) => {
              const imageUrl = getImageUrl(product);
              const rating = getRating(product.id);
              const reviews = getReviews(product.id);
              const seller = getSeller(product.id);
              return (
                <div key={product.id} className="featured-product-card">
                  <Link to={`/products/${product.id}`} className="product-card-link">
                    <div className="product-card-image-wrap">
                      <span className="featured-badge">Featured</span>
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} />
                      ) : (
                        <div className="product-empty-image">📦</div>
                      )}
                    </div>
                    <div className="product-card-details">
                      <div className="product-card-category-rating">
                        <span className="product-card-category">
                          {product.category?.name || "General"}
                        </span>
                        <div className="product-card-rating">
                          <Star size={14} className="star-icon" />
                          <span>{rating.toFixed(1)} ({reviews})</span>
                        </div>
                      </div>
                      <h3>{product.name}</h3>
                      <p className="product-card-desc">
                        {product.description || "Premium product curated with AI assistant integrations."}
                      </p>
                      <div className="product-card-footer">
                        <div>
                          <span className="product-card-price">{money(product.price)}</span>
                          <span className="product-card-seller">By {seller}</span>
                        </div>
                        <button 
                          className="btn-card-add-to-cart"
                          onClick={(e) => handleAddToCart(e, product.id)}
                          disabled={addingToCartId === product.id}
                          type="button"
                        >
                          <ShoppingCart size={16} />
                          <span>{addingToCartId === product.id ? "Adding..." : "Add to Cart"}</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI Assistant Section */}
      <section className="ai-assistant-section">
        <div className="ai-assistant-card">
          <div className="ai-assistant-left">
            <div className="assistant-tag">
              <Sparkles size={14} />
              <span>AI Shopping Assistant</span>
            </div>
            <h2>Shop Smarter with AI Recommendations</h2>
            <p>Get personalized product suggestions, price comparisons, and expert advice powered by advanced AI.</p>
            <button 
              className="btn-try-ai"
              onClick={() => setIsAiModalOpen(true)}
              type="button"
            >
              <Sparkles size={16} />
              <span>Try AI Assistant</span>
            </button>
          </div>

          <div className="ai-assistant-right">
            <div className="features-showcase-card">
              <div className="showcase-item">
                <div className="showcase-bullet-point"></div>
                <div>
                  <h4>Smart Recommendations</h4>
                  <p>Get product suggestions based on your preferences.</p>
                </div>
              </div>
              <div className="showcase-item">
                <div className="showcase-bullet-point"></div>
                <div>
                  <h4>Price Insights</h4>
                  <p>Find the best deals and the best price.</p>
                </div>
              </div>
              <div className="showcase-item">
                <div className="showcase-bullet-point"></div>
                <div>
                  <h4>Quality Verification</h4>
                  <p>AI-verified reviews and products.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot Modal */}
      {isAiModalOpen && (
        <div className="chatbot-modal-overlay" onClick={() => setIsAiModalOpen(false)}>
          <div className="chatbot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chatbot-header">
              <div className="chatbot-title">
                <Sparkles size={18} className="chatbot-header-icon" />
                <div>
                  <h3>AI Assistant</h3>
                  <span>Online • Powered by MarketAI</span>
                </div>
              </div>
              <button className="chatbot-close-btn" onClick={() => setIsAiModalOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="chatbot-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <div className="message-bubble">
                    {msg.text.includes("[View Product]") ? (
                      <div>
                        {msg.text.split("[")[0]}
                        <br />
                        <Link 
                          to={msg.text.match(/\(([^)]+)\)/)[1]} 
                          className="chat-product-link"
                          onClick={() => setIsAiModalOpen(false)}
                        >
                          View Recommendation <ArrowRight size={14} />
                        </Link>
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="chatbot-input-form">
              <input
                type="text"
                placeholder="Ask me for recommendations..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit" className="chatbot-send-btn">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
