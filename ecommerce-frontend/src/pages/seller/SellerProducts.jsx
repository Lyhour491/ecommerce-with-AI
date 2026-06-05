import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money, getImageUrl, firstApiError } from "../../utils/store";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "", description: "", price: "", stock: "", category_id: "",
    image_urls: [""], replace_images: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadProducts();
    api.get("/categories").then((r) => {
      const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
      setCategories(list);
    });
  }, []);

  const loadProducts = () => {
    setLoading(true);
    api.get("/seller/products")
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : r.data?.data || [];
        setProducts(list);
      })
      .finally(() => setLoading(false));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFiles([]);
    setError("");
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      stock: product.stock || "",
      category_id: product.category_id || "",
      image_urls: product.image_urls?.length ? [...product.image_urls] : [""],
      replace_images: false,
    });
    setFiles([]);
    setError("");
    setShowModal(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleUrlChange = (idx, value) => {
    const urls = [...form.image_urls];
    urls[idx] = value;
    setForm({ ...form, image_urls: urls });
  };

  const addUrlField = () => setForm({ ...form, image_urls: [...form.image_urls, ""] });

  const removeUrlField = (idx) => {
    const urls = form.image_urls.filter((_, i) => i !== idx);
    setForm({ ...form, image_urls: urls.length ? urls : [""] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description || "");
    formData.append("price", form.price);
    formData.append("stock", form.stock);
    formData.append("category_id", form.category_id);

    if (editing && form.replace_images) {
      formData.append("replace_images", "1");
    }

    form.image_urls.forEach((url) => {
      if (url?.trim()) formData.append("image_urls[]", url.trim());
    });

    files.forEach((file) => formData.append("images[]", file));

    try {
      if (editing) {
        formData.append("_method", "PUT");
        await api.post(`/seller/products/${editing.id}`, formData);
      } else {
        await api.post("/seller/products", formData);
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      setError(firstApiError(err, "Failed to save product."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/seller/products/${id}`);
      loadProducts();
    } catch (err) {
      alert(firstApiError(err, "Delete failed."));
    }
  };

  return (
    <div className="seller-products-page">
      <div className="seller-page-header">
        <div>
          <h1>My Products</h1>
          <p>{products.length} product{products.length !== 1 ? "s" : ""} listed</p>
        </div>
        <button className="seller-btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="seller-loading">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="seller-empty">
          <Package size={48} />
          <h3>No products yet</h3>
          <p>Start by adding your first product.</p>
          <button className="seller-btn-primary" onClick={openCreate}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      ) : (
        <div className="seller-products-grid">
          {products.map((product) => (
            <div className="seller-product-card" key={product.id}>
              <div className="seller-product-image">
                {getImageUrl(product) ? (
                  <img src={getImageUrl(product)} alt={product.name} />
                ) : (
                  <div className="seller-product-placeholder">No Image</div>
                )}
              </div>
              <div className="seller-product-info">
                <h3>{product.name}</h3>
                <span className="seller-product-category">
                  {product.category?.name || "—"}
                </span>
                <div className="seller-product-meta">
                  <span className="seller-product-price">{money(product.price)}</span>
                  <span className="seller-product-stock">Stock: {product.stock}</span>
                </div>
              </div>
              <div className="seller-product-actions">
                <button className="seller-btn-icon" title="Edit" onClick={() => openEdit(product)}>
                  <Pencil size={16} />
                </button>
                <button className="seller-btn-icon danger" title="Delete" onClick={() => handleDelete(product.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────── */}
      {showModal && (
        <div className="seller-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="seller-modal" onClick={(e) => e.stopPropagation()}>
            <div className="seller-modal-header">
              <h2>{editing ? "Edit Product" : "New Product"}</h2>
              <button className="seller-btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form className="seller-form" onSubmit={handleSubmit}>
              <label>
                <span>Product Name</span>
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>

              <label>
                <span>Category</span>
                <select name="category_id" value={form.category_id} onChange={handleChange} required>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <div className="seller-form-row">
                <label>
                  <span>Price ($)</span>
                  <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} required />
                </label>
                <label>
                  <span>Stock</span>
                  <input type="number" name="stock" value={form.stock} onChange={handleChange} required />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
              </label>

              <label>
                <span>Upload Images</span>
                <input type="file" multiple accept="image/*" onChange={(e) => setFiles([...e.target.files])} />
              </label>

              <div className="seller-form-urls">
                <span>Image URLs</span>
                {form.image_urls.map((url, idx) => (
                  <div className="seller-url-row" key={idx}>
                    <input
                      value={url}
                      onChange={(e) => handleUrlChange(idx, e.target.value)}
                      placeholder="https://..."
                    />
                    <button type="button" className="seller-btn-icon danger" onClick={() => removeUrlField(idx)}>
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button type="button" className="seller-btn-text" onClick={addUrlField}>+ Add URL</button>
              </div>

              {editing && (
                <label className="seller-checkbox">
                  <input
                    type="checkbox"
                    checked={form.replace_images}
                    onChange={(e) => setForm({ ...form, replace_images: e.target.checked })}
                  />
                  <span>Replace all existing images</span>
                </label>
              )}

              <button className="seller-btn-primary seller-btn-full" type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Package(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}
