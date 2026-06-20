import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Archive,
  CheckCircle,
  Edit3,
  FolderPlus,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TrendingUp,
  UserX,
  Users,
  X,
} from "lucide-react";
import api from "../api/axios";
import { firstApiError, getImageUrl, money, unwrapList, unwrapUser } from "../utils/store";

const emptyProduct = { category_id: "", name: "", description: "", price: "", stock: "", images: [], image_urls: "", replace_images: false };
const emptyCategory = { name: "", description: "" };

const getCategoryName = (product, categories) => {
  if (product?.category?.name) return product.category.name;
  const category = categories.find((item) => String(item.id) === String(product?.category_id));
  return category?.name || "Uncategorized";
};

const getStock = (product) => Number(product?.stock ?? product?.quantity ?? product?.inventory ?? 0);
const getStatus = (product) => {
  const moderationStatus = String(product?.moderation_status || "").toLowerCase();
  if (moderationStatus === "pending_review") return "pending review";
  if (moderationStatus === "rejected") return "rejected";
  const status = String(product?.status || "").toLowerCase();
  if (status) return status;
  return product?.is_active === false ? "archived" : "published";
};
const getSku = (product) => product?.sku || `PRD-${String(product?.id || "000").padStart(3, "0")}`;
const getSellerName = (product) => product?.seller?.shop_name || product?.seller?.name || "No seller attached";
const getRiskTone = (isRisk) => isRisk ? {
  bg: "#fef2f2",
  border: "#fecaca",
  color: "#991b1b",
  label: "Detected",
} : {
  bg: "#f0fdf4",
  border: "#bbf7d0",
  color: "#166534",
  label: "Clear",
};
const getVerdictTone = (verdict = "review") => {
  if (verdict === "approved") return { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", label: "Approved" };
  if (verdict === "rejected") return { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", label: "Rejected" };
  return { bg: "#fffbeb", border: "#fde68a", color: "#92400e", label: "Flagged for Review" };
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admin, setAdmin] = useState({ name: "Admin" });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkingProductId, setCheckingProductId] = useState(null);
  const [moderationResult, setModerationResult] = useState(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setError("");
    try {
      const [productRes, categoryRes, userRes] = await Promise.allSettled([api.get("/products", { params: { include_inactive: 1 } }), api.get("/categories"), api.get("/user")]);
      if (productRes.status === "fulfilled") setProducts(unwrapList(productRes.value.data, ["products"]));
      else setError("Products API data could not be loaded.");
      if (categoryRes.status === "fulfilled") setCategories(unwrapList(categoryRes.value.data, ["categories"]));
      if (userRes.status === "fulfilled") setAdmin(unwrapUser(userRes.value?.data));
    } catch (err) {
      setError(firstApiError(err, "Failed to load admin product data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setPage(1); }, [query, tab]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.is_active !== false).length;
    const inventoryValue = products.reduce((sum, product) => sum + Number(product.price || 0) * getStock(product), 0);
    const lowStock = products.filter((product) => getStock(product) > 0 && getStock(product) <= 15).length;
    return [
      { label: "Total Products", value: products.length.toLocaleString(), note: "+ Live API", icon: Package, tone: "blue" },
      { label: "Active Stock", value: active.toLocaleString(), note: "Published", icon: ShoppingCart, tone: "orange" },
      { label: "Inventory Value", value: money(inventoryValue), note: "+ API", icon: TrendingUp, tone: "purple" },
      { label: "Categories", value: categories.length.toLocaleString(), note: `${lowStock} low stock`, icon: Users, tone: "green" },
    ];
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      const status = getStatus(product);
      const matchesTab = tab === "all" || status === tab || (tab === "pending review" && status === "pending review") || (tab === "draft" && status === "draft") || (tab === "archived" && status === "archived");
      const searchable = [product?.name, product?.description, getSku(product), getCategoryName(product, categories), status].join(" ").toLowerCase();
      return matchesTab && (!search || searchable.includes(search));
    });
  }, [products, categories, query, tab]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      category_id: product?.category_id || product?.category?.id || "",
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price ?? "",
      stock: getStock(product),
      images: [],
      image_urls: "",
      replace_images: false,
    });
    setShowProductModal(true);
    setMessage("");
    setError("");
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const formData = new FormData();
    formData.append("category_id", productForm.category_id);
    formData.append("name", productForm.name);
    formData.append("description", productForm.description || "");
    formData.append("price", productForm.price);
    formData.append("stock", productForm.stock);
    productForm.images.forEach((image) => formData.append("images[]", image));
    String(productForm.image_urls || "").split("\n").map((url) => url.trim()).filter(Boolean).forEach((url) => formData.append("image_urls[]", url));
    formData.append("replace_images", productForm.replace_images ? "1" : "0");
    try {
      if (editingProduct) {
        formData.append("_method", "PUT");
        const res = await api.post(`/products/${editingProduct.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        const updated = res.data?.product || { ...editingProduct, ...productForm };
        setProducts((items) => items.map((item) => item.id === editingProduct.id ? { ...item, ...updated } : item));
        setMessage("Product updated successfully.");
      } else {
        const res = await api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } });
        const created = res.data?.product;
        if (created) setProducts((items) => [created, ...items]);
        setMessage("Product created successfully.");
      }
      setShowProductModal(false);
      setProductForm(emptyProduct);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      setError(firstApiError(err, editingProduct ? "Failed to update product." : "Failed to create product."));
    } finally {
      setSaving(false);
    }
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setShowCategoryModal(true);
    setMessage("");
    setError("");
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category?.name || "", description: category?.description || "" });
    setShowCategoryModal(true);
    setMessage("");
    setError("");
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory.id}`, categoryForm);
        const updated = res.data?.category || { ...editingCategory, ...categoryForm };
        setCategories((items) => items.map((item) => item.id === editingCategory.id ? { ...item, ...updated } : item));
        setMessage("Category updated successfully.");
      } else {
        const res = await api.post("/categories", categoryForm);
        const created = res.data?.category;
        if (created) setCategories((items) => [created, ...items]);
        setMessage("Category created successfully.");
      }
      setShowCategoryModal(false);
      setCategoryForm(emptyCategory);
      setEditingCategory(null);
      await loadData();
    } catch (err) {
      setError(firstApiError(err, editingCategory ? "Failed to update category." : "Failed to create category."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm("Delete this product image?")) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/product-images/${imageId}`);
      await loadData();
      setEditingProduct((product) => product ? {
        ...product,
        images: (product.images || []).filter((image) => image.id !== imageId),
      } : product);
      setMessage("Image deleted successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to delete image."));
    }
  };

  const handlePrimaryImage = async (imageId) => {
    setMessage("");
    setError("");
    try {
      await api.patch(`/product-images/${imageId}/primary`);
      await loadData();
      setMessage("Primary image updated.");
    } catch (err) {
      setError(firstApiError(err, "Failed to update primary image."));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Remove this product permanently?")) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/products/${id}`);
      setProducts((items) => items.filter((item) => item.id !== id));
      if (moderationResult?.product?.id === id) setModerationResult(null);
      setMessage("Product removed successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to remove product."));
    }
  };

  const handleBanSeller = async (product) => {
    const seller = product?.seller;
    if (!seller?.id) {
      setError("This product is not attached to a seller account.");
      return;
    }

    if (!window.confirm(`Ban seller "${getSellerName(product)}" and archive their products?`)) return;

    setMessage("");
    setError("");
    try {
      const res = await api.post(`/users/${seller.id}/ban-seller`);
      setProducts((items) => items.map((item) => (
        item?.seller?.id === seller.id
          ? { ...item, is_active: false, seller: { ...item.seller, role: "customer", seller_status: "rejected" } }
          : item
      )));
      setModerationResult(null);
      setMessage(res.data?.message || "Seller banned and products archived.");
      await loadData();
    } catch (err) {
      setError(firstApiError(err, "Failed to ban seller."));
    }
  };

  const updateProductState = (updatedProduct) => {
    setProducts((items) => items.map((item) => item.id === updatedProduct.id ? { ...item, ...updatedProduct } : item));
  };

  const handleProductApproval = async (product, action) => {
    setMessage("");
    setError("");
    try {
      const res = await api.post(`/products/${product.id}/${action}`);
      const updated = res.data?.product || { ...product, is_active: action === "approve" };
      updateProductState(updated);
      setMessage(res.data?.message || `Product ${action === "approve" ? "approved" : "archived"}.`);
    } catch (err) {
      setError(firstApiError(err, `Failed to ${action} product.`));
    }
  };

  const handleAiCheck = async (product) => {
    setCheckingProductId(product.id);
    setMessage("");
    setError("");
    try {
      const res = await api.get(`/products/${product.id}/ai-check`);
      setModerationResult({ product, result: res.data });
    } catch (err) {
      setError(firstApiError(err, "AI product check failed."));
    } finally {
      setCheckingProductId(null);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/categories/${category.id}`);
      setCategories((items) => items.filter((item) => item.id !== category.id));
      setMessage("Category deleted successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to delete category. Make sure no products are using this category."));
    }
  };

  return (
    <section className="merchant-dashboard admin-products-page">
      <header className="merchant-topbar product-like-topbar">
        <h1>Product Management</h1>
        <div className="product-like-actions">
          <label className="product-like-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search catalog..." /></label>
          <button className="btn-add-product" onClick={openAddCategory}><FolderPlus size={18} /> Add Category</button>
          <div className="merchant-top-actions"><strong>{admin?.name || "Admin"}</strong></div>
        </div>
      </header>

      <div className="merchant-content">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="page-subtitle">Loading products...</p>}

        <div className="merchant-metrics order-metrics">
          {stats.map(({ label, value, note, icon: Icon, tone }) => (
            <article className="merchant-metric-card product-stat-card" key={label}>
              <div className={`metric-icon ${tone}`}><Icon size={21} /></div>
              <span className={`metric-pill ${tone}`}>{note}</span>
              <p>{label}</p>
              <h2>{value}</h2>
            </article>
          ))}
        </div>

        <article className="merchant-panel product-like-table product-management-card">
          <div className="product-tabs-row">
            <div className="product-tabs">
              {[{ id: "all", label: "All Products" }, { id: "published", label: "Published" }, { id: "pending review", label: "Pending Review" }, { id: "rejected", label: "Rejected" }, { id: "archived", label: "Archived" }].map((item) => (
                <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
              ))}
            </div>
          </div>

          <div className="product-like-table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Inventory</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {pageProducts.length ? pageProducts.map((product) => {
                  const imageUrl = getImageUrl(product);
                  const stock = getStock(product);
                  const status = getStatus(product);
                  const stockPercent = Math.max(0, Math.min(100, stock));
                  return (
                    <tr key={product.id}>
                      <td><div className="product-name-cell">{imageUrl ? <img src={imageUrl} alt={product.name} /> : <div className="product-empty-icon"><Box size={22} /></div>}<div><strong>{product.name}</strong><span>SKU: {getSku(product)}</span></div></div></td>
                      <td>
                        <strong>{getCategoryName(product, categories)}</strong>
                        <span>{getSellerName(product)}</span>
                      </td>
                      <td><strong>{money(product.price)}</strong></td>
                      <td><div className="inventory-cell"><span className={`inventory-bar ${stock <= 15 ? "low" : ""}`}><i style={{ width: `${stockPercent}%` }} /></span><b>{stock}</b></div></td>
                      <td>
                        <span className={`status ${status.replaceAll(" ", "-")}`}>{status}</span>
                        {product.moderation_reason && <span>{product.moderation_reason}</span>}
                      </td>
                      <td>
                        <div className="row-icon-actions">
                          <button title="AI safety check" onClick={() => handleAiCheck(product)} disabled={checkingProductId === product.id}>
                            <ShieldCheck size={18} />
                          </button>
                          {product.is_active === false ? (
                            <button title="Approve product" onClick={() => handleProductApproval(product, "approve")}>
                              <CheckCircle size={18} />
                            </button>
                          ) : (
                            <button title="Archive product" onClick={() => handleProductApproval(product, "reject")}>
                              <Archive size={18} />
                            </button>
                          )}
                          <button title="Edit" onClick={() => openEditProduct(product)}><Edit3 size={18} /></button>
                          <button title="Ban seller" onClick={() => handleBanSeller(product)} disabled={!product?.seller?.id || product?.seller?.role === "admin"}><UserX size={18} /></button>
                          <button title="Remove product" onClick={() => handleDeleteProduct(product.id)}><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan="6" className="empty-orders">No products found from API.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="product-pagination-row">
            <p>Showing {filteredProducts.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filteredProducts.length)} of {filteredProducts.length} products</p>
            <div className="product-pagination"><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>{Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((number) => <button key={number} className={page === number ? "active" : ""} onClick={() => setPage(number)}>{number}</button>)}<button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button></div>
          </div>
        </article>

        <article className="merchant-panel product-like-table categories-management-card">
          <div className="product-tabs-row"><h2>Categories</h2><button className="btn-add-product" onClick={openAddCategory}><FolderPlus size={18} /> Add Category</button></div>
          <div className="product-like-table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Description</th><th>Products</th><th>Actions</th></tr></thead>
              <tbody>
                {categories.length ? categories.map((category) => {
                  const count = products.filter((product) => String(product.category_id || product.category?.id) === String(category.id)).length;
                  return <tr key={category.id}><td><strong>{category.name}</strong><span>ID: {category.id}</span></td><td>{category.description || "No description"}</td><td>{count}</td><td><div className="row-icon-actions"><button title="Edit" onClick={() => openEditCategory(category)}><Edit3 size={18} /></button><button title="Delete" onClick={() => handleDeleteCategory(category)}><Trash2 size={18} /></button></div></td></tr>;
                }) : <tr><td colSpan="4" className="empty-orders">No categories found from API.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {showProductModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-user-modal wide-modal" onSubmit={saveProduct} encType="multipart/form-data">
            <div className="modal-header"><div><h2>Edit Product</h2><p>Update product details, stock, price, or images.</p></div><button type="button" onClick={() => setShowProductModal(false)} aria-label="Close"><X size={18} /></button></div>
            <label>Category<select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })} required><option value="" disabled hidden>Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Name<input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required placeholder="Product name" /></label>
            <label>Price<input type="number" step="0.01" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required /></label>
            <label>Stock<input type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required /></label>
            <label>Description<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows="3" placeholder="Product description" /></label>
            {editingProduct?.images?.length ? (
              <div className="image-manager">
                <strong>Current Images</strong>
                <div className="image-manager-grid">
                  {editingProduct.images.map((image) => {
                    const url = image.image_url || getImageUrl({ images: [image] });
                    return (
                      <div className="image-manager-card" key={image.id}>
                        <img src={url} alt={image.alt_text || editingProduct.name} />
                        {image.is_primary && <span>Primary</span>}
                        <div>
                          {!image.is_primary && <button type="button" onClick={() => handlePrimaryImage(image.id)}>Set Primary</button>}
                          <button type="button" onClick={() => handleDeleteImage(image.id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <label className="checkbox-label"><input type="checkbox" checked={productForm.replace_images} onChange={(e) => setProductForm({ ...productForm, replace_images: e.target.checked })} /> Replace all existing images with new images</label>
            <label>Image URLs <span>one per line, optional</span><textarea value={productForm.image_urls} onChange={(e) => setProductForm({ ...productForm, image_urls: e.target.value })} rows="2" placeholder="https://example.com/product.png" /></label>
            <label>Upload Images <span>{editingProduct ? "optional, adds new images" : "optional"}</span><input type="file" multiple accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(e) => setProductForm({ ...productForm, images: Array.from(e.target.files || []) })} /></label>
            <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button><button type="submit" className="btn-add-product" disabled={saving}>{saving ? "Saving..." : "Save Product"}</button></div>
          </form>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="edit-user-modal" onSubmit={saveCategory}>
            <div className="modal-header"><div><h2>{editingCategory ? "Edit Category" : "Add Category"}</h2><p>{editingCategory ? "Update category name or description." : "Create a new category for products."}</p></div><button type="button" onClick={() => setShowCategoryModal(false)} aria-label="Close"><X size={18} /></button></div>
            <label>Name<input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required placeholder="Category name" /></label>
            <label>Description<textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} rows="3" placeholder="Category description" /></label>
            <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button><button type="submit" className="btn-add-product" disabled={saving}>{saving ? "Saving..." : editingCategory ? "Save Category" : "Create Category"}</button></div>
          </form>
        </div>
      )}

      {moderationResult && (
        <div className="modal-backdrop ai-review-backdrop" role="dialog" aria-modal="true">
          <div className="ai-review-modal">
            <div className="modal-header ai-review-header">
              <div>
                <h2>AI Product Safety Check</h2>
                <p>{moderationResult.product.name} - Seller: {getSellerName(moderationResult.product)}</p>
              </div>
              <button type="button" onClick={() => setModerationResult(null)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="ai-review-body">
              {(() => {
                const result = moderationResult.result || {};
                const verdictTone = getVerdictTone(result.verdict);
                const fakeTone = getRiskTone(Boolean(result.is_fake));
                const illegalTone = getRiskTone(Boolean(result.is_illegal));

                return (
                  <>
                    <div
                      className="ai-verdict-banner"
                      style={{
                        "--verdict-bg": verdictTone.bg,
                        "--verdict-border": verdictTone.border,
                        "--verdict-color": verdictTone.color,
                      }}
                    >
                      <div className="ai-verdict-content">
                        <div className="ai-summary-head">
                          <span>AI Verdict</span>
                          <strong>{verdictTone.label}</strong>
                        </div>
                        <p>
                          {result.is_illegal
                            ? "This product should stay private until an admin confirms whether it is illegal or restricted."
                            : result.is_fake
                              ? "This product should stay private until an admin confirms whether it is fake or counterfeit."
                              : "No fake/counterfeit or illegal product signal was detected."}
                        </p>
                      </div>
                      <ShieldCheck size={28} />
                    </div>

                    <div className="ai-risk-grid">
                      <article
                        className="ai-risk-card"
                        style={{
                          "--risk-bg": fakeTone.bg,
                          "--risk-border": fakeTone.border,
                          "--risk-color": fakeTone.color,
                        }}
                      >
                        <div className="ai-summary-head">
                          <span>Fake / Counterfeit</span>
                          <strong>{fakeTone.label}</strong>
                        </div>
                        <p>{result.fake_reason || "No counterfeit, replica, suspicious brand, or fake-product signal found."}</p>
                      </article>

                      <article
                        className="ai-risk-card"
                        style={{
                          "--risk-bg": illegalTone.bg,
                          "--risk-border": illegalTone.border,
                          "--risk-color": illegalTone.color,
                        }}
                      >
                        <div className="ai-summary-head">
                          <span>Illegal / Restricted</span>
                          <strong>{illegalTone.label}</strong>
                        </div>
                        <p>{result.illegal_reason || "No illegal, dangerous, restricted, or prohibited item signal found."}</p>
                      </article>
                    </div>
                  </>
                );
              })()}

              <section className="ai-checklist-panel">
                <h3>Quality Checklist</h3>
                <div className="ai-checklist-list">
                  {(moderationResult.result?.checklist || []).map((item) => (
                    <article className="ai-checklist-item" key={item.name}>
                      <div className="ai-checklist-item-head">
                        <strong>{item.name}</strong>
                        <b className={`status ${item.passed ? "published" : "archived"}`}>{item.passed ? "Passed" : "Needs review"}</b>
                      </div>
                      <p>{item.details}</p>
                    </article>
                  ))}
                </div>
              </section>

              {(moderationResult.result?.fake_reason || moderationResult.result?.illegal_reason) && (
                <div className="alert alert-error ai-review-alert">
                  {moderationResult.result.fake_reason || moderationResult.result.illegal_reason}
                </div>
              )}
            </div>

            <div className="modal-actions ai-review-actions">
              <button type="button" className="btn-secondary" onClick={() => setModerationResult(null)}>Close</button>
              <button
                type="button"
                className="btn-secondary danger-action"
                onClick={() => handleDeleteProduct(moderationResult.product.id)}
              >
                <Trash2 size={16} /> Remove Product
              </button>
              <button
                type="button"
                className="btn-secondary danger-action"
                disabled={!moderationResult.product?.seller?.id || moderationResult.product?.seller?.role === "admin"}
                onClick={() => handleBanSeller(moderationResult.product)}
              >
                <UserX size={16} /> Ban Seller
              </button>
              <button
                type="button"
                className="btn-add-product"
                onClick={() => {
                  handleProductApproval(moderationResult.product, "approve");
                  setModerationResult(null);
                }}
              >
                Approve Product
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  handleProductApproval(moderationResult.product, "reject");
                  setModerationResult(null);
                }}
              >
                Archive Product
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default AdminProducts;
