import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Box,
  CircleHelp,
  Edit3,
  Filter,
  FolderPlus,
  MoreVertical,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
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
  const status = String(product?.status || "").toLowerCase();
  if (status) return status;
  return getStock(product) <= 0 ? "out of stock" : getStock(product) <= 15 ? "low stock" : "published";
};
const getSku = (product) => product?.sku || `PRD-${String(product?.id || "000").padStart(3, "0")}`;

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
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setError("");
    try {
      const [productRes, categoryRes, userRes] = await Promise.allSettled([api.get("/products"), api.get("/categories"), api.get("/user")]);
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
    const active = products.filter((product) => getStock(product) > 0).length;
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
      const matchesTab = tab === "all" || status === tab || (tab === "draft" && status === "draft") || (tab === "archived" && status === "archived");
      const searchable = [product?.name, product?.description, getSku(product), getCategoryName(product, categories), status].join(" ").toLowerCase();
      return matchesTab && (!search || searchable.includes(search));
    });
  }, [products, categories, query, tab]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pageProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setShowProductModal(true);
    setMessage("");
    setError("");
  };

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
    if (!window.confirm("Delete this product?")) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/products/${id}`);
      setProducts((items) => items.filter((item) => item.id !== id));
      setMessage("Product deleted successfully.");
    } catch (err) {
      setError(firstApiError(err, "Failed to delete product."));
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
          <button className="btn-add-product" onClick={openAddProduct}><Plus size={18} /> Add Product</button>
          <div className="merchant-top-actions"><Bell size={20} /><CircleHelp size={20} /><strong>{admin?.name || "Admin"}</strong></div>
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
              {[{ id: "all", label: "All Products" }, { id: "published", label: "Published" }, { id: "draft", label: "Drafts" }, { id: "archived", label: "Archived" }].map((item) => (
                <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
              ))}
            </div>
            <div className="table-tools"><Filter size={17} /><MoreVertical size={18} /></div>
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
                      <td>{getCategoryName(product, categories)}</td>
                      <td><strong>{money(product.price)}</strong></td>
                      <td><div className="inventory-cell"><span className={`inventory-bar ${stock <= 15 ? "low" : ""}`}><i style={{ width: `${stockPercent}%` }} /></span><b>{stock}</b></div></td>
                      <td><span className={`status ${status.replaceAll(" ", "-")}`}>{status}</span></td>
                      <td><div className="row-icon-actions"><button title="Edit" onClick={() => openEditProduct(product)}><Edit3 size={18} /></button><button title="Delete" onClick={() => handleDeleteProduct(product.id)}><Trash2 size={18} /></button></div></td>
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
            <div className="modal-header"><div><h2>{editingProduct ? "Edit Product" : "Add Product"}</h2><p>{editingProduct ? "Update product details, stock, price, or images." : "Create a new product for your store."}</p></div><button type="button" onClick={() => setShowProductModal(false)} aria-label="Close"><X size={18} /></button></div>
            <label>Category<select value={productForm.category_id} onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })} required><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
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
            <div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button><button type="submit" className="btn-add-product" disabled={saving}>{saving ? "Saving..." : editingProduct ? "Save Product" : "Create Product"}</button></div>
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
    </section>
  );
}
export default AdminProducts;
