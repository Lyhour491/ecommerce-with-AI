import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { getImageUrl, money, unwrapList } from "../utils/store";

const productCategory = (product) => product.category?.name || product.category_name || product.category || "General";
const productRating = (product) => Number(product.rating || product.average_rating || 4.6);
const productReviews = (product) => Number(product.reviews_count || product.review_count || product.orders_count || 24);
const productStorage = (product) => product.sku || product.storage || product.stock_unit || `${product.stock ?? 0} units`;

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategories, setActiveCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [maxPrice, setMaxPrice] = useState(2500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([api.get("/products"), api.get("/categories")])
      .then(([productsRes, categoriesRes]) => {
        if (productsRes.status === "fulfilled") {
          setProducts(unwrapList(productsRes.value.data, ["products"]));
        } else {
          setError("Failed to load products. Check that Laravel is running.");
        }
        if (categoriesRes.status === "fulfilled") {
          setCategories(unwrapList(categoriesRes.value.data, ["categories"]));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryNames = useMemo(() => {
    const fromApi = categories.map((category) => category.name).filter(Boolean);
    const fromProducts = products.map(productCategory).filter(Boolean);
    return [...new Set([...fromApi, ...fromProducts])].slice(0, 8);
  }, [categories, products]);

  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    let items = products.filter((product) => {
      const category = productCategory(product);
      const price = Number(product.price || 0);
      const stock = Number(product.stock || 0);
      const matchesText = !text || [product.name, product.description, category].join(" ").toLowerCase().includes(text);
      const matchesCategory = activeCategories.length === 0 || activeCategories.includes(category);
      const matchesPrice = price <= maxPrice;
      const matchesStock = !inStockOnly || stock > 0;
      return matchesText && matchesCategory && matchesPrice && matchesStock;
    });

    if (sort === "price-low") items = [...items].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === "price-high") items = [...items].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === "newest") items = [...items].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return items;
  }, [products, query, activeCategories, maxPrice, inStockOnly, sort]);

  const perPage = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visibleProducts = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => setPage(1), [query, activeCategories, maxPrice, inStockOnly, sort]);

  const toggleCategory = (category) => {
    setActiveCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  };

  if (loading) return <div className="loading">Loading products...</div>;

  return (
    <main className="proshop-page">
      <section className="shop-shell">
        <aside className="shop-sidebar">
          <h3>Categories</h3>
          <div className="filter-list">
            {categoryNames.map((category) => (
              <label className="check-row" key={category}>
                <input
                  type="checkbox"
                  checked={activeCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                <span>{category}</span>
              </label>
            ))}
          </div>

          <div className="filter-block">
            <h3>Price Range</h3>
            <input
              className="range-input"
              type="range"
              min="0"
              max="2500"
              step="50"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
            />
            <div className="price-fields">
              <span>$0</span>
              <span>{money(maxPrice)}</span>
            </div>
          </div>

          <div className="filter-block">
            <h3>Availability</h3>
            <label className="switch-row">
              <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        <section className="shop-content">
          <div className="shop-toolbar">
            <div>
              <p className="crumb">Shop</p>
              <h1>Shop All Products</h1>
              <p>Showing {visibleProducts.length ? (page - 1) * perPage + 1 : 0}-{Math.min(page * perPage, filtered.length)} of {filtered.length} products</p>
            </div>
            <div className="shop-actions">
              <div className="catalog-search">
                <span>⌕</span>
                <input placeholder="Search products..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="recommended">Sort by: Recommended</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {visibleProducts.length === 0 ? (
            <div className="empty-state card">No products found.</div>
          ) : (
            <div className="pro-product-grid">
              {visibleProducts.map((product, index) => {
                const imageUrl = getImageUrl(product);
                const stock = Number(product.stock || 0);
                return (
                  <Link className="pro-product-card" to={`/products/${product.id}`} key={product.id}>
                    <div className="product-media">
                      {index === 0 && <span className="product-badge">NEW</span>}
                      <button className="wish-btn" type="button">♡</button>
                      {imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="empty-img">No image</div>}
                    </div>
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
                      <small className={stock > 0 ? "stock-good" : "stock-out"}>{stock > 0 ? `${stock} left` : "Sold out"}</small>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pagination-row">
            <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((num) => (
              <button className={page === num ? "active" : ""} key={num} onClick={() => setPage(num)}>{num}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
          </div>
        </section>
      </section>
    </main>
  );
}
export default Products;
