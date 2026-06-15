import { useState, useEffect } from "react";
import api from "../../api/axios";
import { money, getImageUrl, firstApiError } from "../../utils/store";
import { Plus, Pencil, Trash2, X, FileEdit, Sparkles } from "lucide-react";

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_urls: [""],
    replace_images: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);

  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const generateAiContent = async () => {
    setGeneratingAi(true);
    setAiResult(null);
    try {
      const res = await api.post("/seller/ai/generate-product-content", {
        prompt: aiPrompt,
      });
      setAiResult(res.data);
    } catch (err) {
      alert("Failed to generate content: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingAi(false);
    }
  };

  const applyAiContent = () => {
    if (!aiResult) return;
    
    let matchedCatId = "";
    const nameMatch = aiResult.category_suggestion?.toLowerCase() || "";
    const matched = categories.find((c) => c.name.toLowerCase().includes(nameMatch) || nameMatch.includes(c.name.toLowerCase()));
    if (matched) {
      matchedCatId = matched.id;
    } else if (categories.length > 0) {
      matchedCatId = categories[0].id;
    }

    setForm({
      ...form,
      name: aiResult.name || form.name,
      price: aiResult.price || form.price,
      description: aiResult.description || form.description,
      category_id: matchedCatId || form.category_id,
    });

    setShowAiAssist(false);
    setAiPrompt("");
    setAiResult(null);
  };


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
    <div className="merchant-dashboard">
      {/* Top Bar */}
      <div className="merchant-topbar">
        <div className="product-like-topbar">
          <h1>Product Catalog</h1>
        </div>
        <div className="product-like-actions">
          <button className="btn-add-product" onClick={openCreate}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="merchant-content">
        <div className="merchant-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1>My Products</h1>
            <p>Manage and optimize your store listings.</p>
          </div>
          <span style={{ color: "var(--muted)", fontWeight: "bold" }}>Total: {products.length} products</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="seller-loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="card" style={{ padding: "80px 20px", textAlign: "center", background: "white", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b", fontSize: 32 }}>📦</div>
            <h3 style={{ margin: 0 }}>No products yet</h3>
            <p style={{ color: "var(--muted)", margin: 0, maxWidth: 320 }}>Start by listing your first product on the marketplace.</p>
            <button className="btn-add-product" onClick={openCreate}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        ) : (
          <div className="card product-like-table" style={{ background: "white", marginTop: 24 }}>
            <div className="product-like-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product Info</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock Level</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const img = getImageUrl(product);
                    const stock = Number(product.stock || 0);
                    const stockPercentage = Math.min(100, (stock / 100) * 100);
                    const isLow = stock <= 5;
                    const isOut = stock === 0;

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="product-name-cell">
                            {img ? (
                              <img src={img} alt={product.name} />
                            ) : (
                              <div className="product-empty-icon">📦</div>
                            )}
                            <div>
                              <strong>{product.name}</strong>
                              <span>SKU: PROD-{product.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 13, fontWeight: "bold" }}>
                            {product.category?.name || "General"}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: 15, color: "var(--primary)" }}>{money(product.price)}</strong>
                        </td>
                        <td>
                          <div className="inventory-cell">
                            <div className={`inventory-bar ${isLow ? "low" : ""}`}>
                              <i style={{ width: `${stockPercentage}%` }} />
                            </div>
                            <b>{stock}</b>
                          </div>
                        </td>
                        <td>
                          {isOut ? (
                            <span className="status out-of-stock">Out of Stock</span>
                          ) : isLow ? (
                            <span className="status low-stock">Low Stock</span>
                          ) : (
                            <span className="status published">Active</span>
                          )}
                        </td>
                        <td>
                          <div className="row-icon-actions">
                            <button title="Edit" onClick={() => openEdit(product)}>
                              <Pencil size={16} />
                            </button>
                            <button title="Delete" onClick={() => handleDelete(product.id)} style={{ color: "var(--danger)" }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="edit-user-modal wide-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{editing ? "Modify Listing" : "Add New Product"}</h2>
                  <p>{editing ? "Edit product specifications below." : "Fill out details to list a new item."}</p>
                </div>
                <button onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="stitch-form" style={{ display: "grid", gap: 14 }}>
                {/* AI Assist Trigger Banner */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", padding: "10px 14px", borderRadius: 12, border: "1px dashed #7c3aed" }}>
                  <span style={{ fontSize: 13, fontWeight: "600", color: "#5b21b6" }}>Want to save time? Generate details with AI.</span>
                  <button type="button" className="btn-ai-assist" onClick={() => setShowAiAssist(true)}>
                    <Sparkles size={14} /> AI Assist
                  </button>
                </div>

                <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
                  <label>
                    <span>Product Name *</span>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. ProSeries Earbuds" />
                  </label>
                  <label>
                    <span>Category *</span>
                    <select name="category_id" value={form.category_id} onChange={handleChange} required>
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="create-product-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label>
                    <span>Price ($) *</span>
                    <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} required placeholder="0.00" />
                  </label>
                  <label>
                    <span>Stock *</span>
                    <input type="number" name="stock" value={form.stock} onChange={handleChange} required placeholder="0" />
                  </label>
                </div>

                <label>
                  <span>Product Description</span>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe your product specs, features, and specs..." />
                </label>

                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#64748b" }}>Image File Uploads</span>
                  <input type="file" multiple accept="image/*" onChange={(e) => setFiles([...e.target.files])} style={{ padding: "8px 12px" }} />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#64748b" }}>External Image URLs</span>
                  {form.image_urls.map((url, idx) => (
                    <div style={{ display: "flex", gap: 8 }} key={idx}>
                      <input
                        value={url}
                        onChange={(e) => handleUrlChange(idx, e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                      />
                      <button type="button" className="btn btn-danger" style={{ minHeight: 44, padding: "0 12px", borderRadius: 10 }} onClick={() => removeUrlField(idx)}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost" style={{ alignSelf: "start", minHeight: 36, padding: "0 14px", fontSize: 13 }} onClick={addUrlField}>+ Add Image URL</button>
                </div>

                {editing && (
                  <label className="checkbox-line" style={{ cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.replace_images}
                      onChange={(e) => setForm({ ...form, replace_images: e.target.checked })}
                    />
                    <span>Replace all existing photos</span>
                  </label>
                )}

                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-add-product" disabled={saving}>
                    {saving ? "Saving Changes..." : editing ? "Save Product" : "Publish Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Assistant Modal */}
        {showAiAssist && (
          <div className="modal-backdrop" style={{ zIndex: 1001 }} onClick={() => setShowAiAssist(false)}>
            <div className="ai-assistant-modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#1e1b4b" }}>
                  <Sparkles size={18} style={{ color: "#7c3aed" }} /> AI Product Generator
                </h3>
                <button type="button" onClick={() => setShowAiAssist(false)} style={{ background: "transparent", color: "var(--muted)" }}>
                  <X size={18} />
                </button>
              </div>
              
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px 0" }}>
                Describe your product (name, key traits, category) and the AI will draft optimized name, price, category, and description.
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Ergonomic Office Chair, high back support, breathable mesh, adjustable armrests..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                style={{ width: "100%", marginBottom: 14, minHeight: 80 }}
              />

              <button
                type="button"
                className="btn-add-product"
                style={{ width: "100%", height: 44, display: "grid", placeItems: "center" }}
                onClick={generateAiContent}
                disabled={generatingAi || !aiPrompt.trim()}
              >
                {generatingAi ? "Generating listing..." : "✨ Generate Details"}
              </button>

              {aiResult && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Suggested Title</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>{aiResult.name}</span>
                  </div>
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Suggested Price</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>${Number(aiResult.price || 0).toFixed(2)}</span>
                  </div>
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Recommended Category</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>{aiResult.category_suggestion}</span>
                  </div>
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Generated Description</strong>
                    <div style={{ fontSize: 13, maxHeight: 120, overflowY: "auto", background: "white", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }} dangerouslySetInnerHTML={{ __html: aiResult.description }} />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={applyAiContent}
                  >
                    Apply AI Suggestions
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
