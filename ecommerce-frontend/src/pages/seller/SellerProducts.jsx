import { useState } from "react";
import api from "../../api/axios";
import { money, getImageUrl, firstApiError, unwrapList } from "../../utils/store";
import { Plus, Pencil, Trash2, X, FileEdit, Sparkles } from "lucide-react";
import { useAiProductDraft, useAiProductField } from "../../hooks/useAiProductTools";
import { useProductCategories, useSellerProducts } from "../../hooks/useSellerProducts";

const getSellerProductStatus = (product, stock) => {
  if (product?.moderation_status === "pending_review") return { label: "Pending Review", className: "pending" };
  if (product?.moderation_status === "rejected") return { label: "Rejected", className: "archived" };
  if (product?.is_active === false) return { label: "Not Public", className: "archived" };
  if (stock === 0) return { label: "Out of Stock", className: "out-of-stock" };
  if (stock <= 5) return { label: "Low Stock", className: "low-stock" };
  return { label: "Active", className: "published" };
};

export default function SellerProducts() {
  const productsQuery = useSellerProducts();
  const categoriesQuery = useProductCategories();
  const aiDraftMutation = useAiProductDraft();
  const aiFieldMutation = useAiProductField();
  const products = productsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const loading = productsQuery.isLoading || categoriesQuery.isLoading;
  const [viewMode, setViewMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    description: "",
    price: "",
    stock: "",
    category_id: "",
    image_urls: [""],
    replace_images: false,
    tags: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);

  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProductName, setAiProductName] = useState("");
  const [aiFeatures, setAiFeatures] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const buildAiPrompt = () => {
    const name = aiProductName.trim() || form.name.trim() || "Product";
    const features = aiFeatures.trim() || form.description.trim() || aiPrompt.trim();

    return `Product: ${name}\nFeatures:\n${features}\nExtra instructions: ${aiPrompt.trim()}`;
  };

  const generateAiContent = async (mode = "full") => {
    setGeneratingAi(true);
    setAiResult(null);
    try {
      const prompt = buildAiPrompt();
      const data = mode === "full"
        ? await aiDraftMutation.mutateAsync(prompt)
        : await aiFieldMutation.mutateAsync({ field: mode, prompt });
      setAiResult({ mode, ...data });
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
      name: aiResult.name || aiResult.title || form.name,
      price: aiResult.price || form.price,
      description: aiResult.description || form.description,
      category_id: matchedCatId || form.category_id,
      tags: aiResult.tags || (Array.isArray(aiResult.keywords) ? aiResult.keywords.join(", ") : form.tags),
    });

    setShowAiAssist(false);
    setAiPrompt("");
    setAiProductName("");
    setAiFeatures("");
    setAiResult(null);
  };


  const loadProducts = () => {
    productsQuery.refetch();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, tags: "" });
    setFiles([]);
    setError("");
    setMessage("");
    setViewMode("add");
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
      tags: product.tags || "",
    });
    setFiles([]);
    setError("");
    setMessage("");
    setViewMode("edit");
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
    setMessage("");
    setSaving(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description || "");
    formData.append("price", form.price);
    formData.append("stock", form.stock);
    formData.append("category_id", form.category_id);
    formData.append("tags", form.tags || "");

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
        const res = await api.post(`/seller/products/${editing.id}`, formData);
        setMessage(res.data?.message || "Product updated successfully.");
      } else {
        const res = await api.post("/seller/products", formData);
        setMessage(res.data?.message || "Product created successfully.");
      }
      setViewMode("list");
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
      {viewMode === "list" ? (
        <>
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
            {message && <div className="alert alert-success">{message}</div>}

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
                        const status = getSellerProductStatus(product, stock);

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
                              <span className={`status ${status.className}`}>{status.label}</span>
                              {product.moderation_reason && <span style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 6 }}>{product.moderation_reason}</span>}
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
          </div>
        </>
      ) : (
        /* Redesigned Full Page Add / Edit View */
        <div className="merchant-content add-product-page-view" style={{ maxWidth: 840, margin: "0 auto", padding: "24px 22px" }}>
          <div className="back-btn-row">
            <button type="button" className="back-btn" onClick={() => setViewMode("list")}>
              ← Back to Products
            </button>
          </div>

          <div className="page-title-row">
            <h1>{editing ? "Modify Product" : "Add New Product"}</h1>
            <p>{editing ? "Edit product specifications below." : "Create a new product listing"}</p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* AI Content Generator Card */}
          <div className="ai-content-generator-card">
            <div className="ai-content-generator-card-left">
              <div className="ai-generator-title-row">
                <h3><Sparkles size={18} style={{ color: "#4f46e5" }} /> AI Content Generator</h3>
                <span className="new-tag">New</span>
              </div>
              <p>
                Let AI help you create compelling product titles, descriptions, and SEO tags that convert browsers into buyers.
              </p>
            </div>
            <button type="button" className="btn-generate-content" onClick={() => {
              if (form.name) {
                setAiProductName(form.name);
                setAiFeatures(form.description || "");
              }
              setShowAiAssist(true);
            }}>
              Generate Content
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Card 1: Basic Information */}
            <div className="form-section-card">
              <h3>Basic Information</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <label>
                  <span>Product Name *</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter product name"
                  />
                </label>

                <div>
                  <div className="label-with-ai-btn">
                    <span style={{ fontWeight: 700, color: "#4b5563", fontSize: 14 }}>Description *</span>
                    <button
                      type="button"
                      className="btn-ai-generate-field"
                      onClick={() => {
                        if (!form.name.trim()) {
                          alert("Please enter a product name first to guide the description generation.");
                          return;
                        }
                        setAiProductName(form.name);
                        setAiFeatures(form.description || "");
                        setShowAiAssist(true);
                      }}
                    >
                      <Sparkles size={13} style={{ color: "#7c3aed" }} /> AI Generate
                    </button>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe your product..."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label>
                    <span>Category *</span>
                    <select name="category_id" value={form.category_id} onChange={handleChange} required>
                      <option value="" disabled hidden>Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Tags</span>
                    <input
                      name="tags"
                      value={form.tags}
                      onChange={handleChange}
                      placeholder="e.g., wireless, bluetooth, portable (comma-separated)"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Card 2: Pricing & Inventory */}
            <div className="form-section-card">
              <h3>Pricing & Inventory</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <label>
                  <span>Price ($) *</span>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                </label>
                <label>
                  <span>Stock *</span>
                  <input
                    type="number"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                    required
                    placeholder="0"
                  />
                </label>
              </div>
            </div>

            {/* Card 3: Product Media */}
            <div className="form-section-card">
              <h3>Product Media</h3>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <span style={{ display: "block", fontSize: 13, fontWeight: "bold", color: "#4b5563", marginBottom: 6 }}>
                    Image File Uploads
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFiles([...e.target.files])}
                    style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 10 }}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: "bold", color: "#4b5563" }}>External Image URLs</span>
                  {form.image_urls.map((url, idx) => (
                    <div style={{ display: "flex", gap: 8 }} key={idx}>
                      <input
                        value={url}
                        onChange={(e) => handleUrlChange(idx, e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                      />
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ minHeight: 44, padding: "0 12px", borderRadius: 10 }}
                        onClick={() => removeUrlField(idx)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ alignSelf: "start", minHeight: 36, padding: "0 14px", fontSize: 13 }}
                    onClick={addUrlField}
                  >
                    + Add Image URL
                  </button>
                </div>

                {editing && (
                  <label className="checkbox-line" style={{ cursor: "pointer", marginTop: 8 }}>
                    <input
                      type="checkbox"
                      checked={form.replace_images}
                      onChange={(e) => setForm({ ...form, replace_images: e.target.checked })}
                    />
                    <span>Replace all existing photos</span>
                  </label>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions-bar">
              <button type="button" className="btn-cancel-form" onClick={() => setViewMode("list")}>
                ✕ Cancel
              </button>
              <button type="submit" className="btn-save-form" disabled={saving}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                {saving ? "Saving Product..." : editing ? "Save Product" : "Create Product"}
              </button>
            </div>
          </form>
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
              Enter a product and features. Generate the full listing, or only the title, description, or SEO keywords.
            </p>

            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Product</span>
              <input
                placeholder="Gaming Mouse"
                value={aiProductName}
                onChange={(e) => setAiProductName(e.target.value)}
              />
            </label>

            <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Features</span>
              <textarea
                rows={4}
                placeholder={"- RGB\n- Wireless\n- 16000 DPI"}
                value={aiFeatures}
                onChange={(e) => setAiFeatures(e.target.value)}
                style={{ width: "100%", minHeight: 96 }}
              />
            </label>

            <textarea
              rows={3}
              placeholder="Optional extra instructions: premium tone, target gamers, include warranty..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              style={{ width: "100%", marginBottom: 14, minHeight: 70 }}
            />

            <button
              type="button"
              className="btn-add-product"
              style={{ width: "100%", height: 44, display: "grid", placeItems: "center" }}
              onClick={() => generateAiContent("full")}
              disabled={generatingAi}
            >
              {generatingAi ? "Generating listing..." : "✨ Generate Details"}
            </button>
            <div className="ai-field-actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn-ai-generate-field" onClick={() => generateAiContent("title")} disabled={generatingAi}>Title</button>
              <button type="button" className="btn-ai-generate-field" onClick={() => generateAiContent("description")} disabled={generatingAi}>Description</button>
              <button type="button" className="btn-ai-generate-field" onClick={() => generateAiContent("seo")} disabled={generatingAi}>SEO Keywords</button>
            </div>

            {aiResult && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                {(aiResult.name || aiResult.title) && (
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Suggested Title</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>{aiResult.name || aiResult.title}</span>
                  </div>
                )}
                {aiResult.price && (
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Suggested Price</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>${Number(aiResult.price || 0).toFixed(2)}</span>
                  </div>
                )}
                {aiResult.category_suggestion && (
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Recommended Category</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>{aiResult.category_suggestion}</span>
                  </div>
                )}
                {aiResult.tags && (
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>SEO Keywords</strong>
                    <span style={{ fontSize: 14, fontWeight: "600" }}>{aiResult.tags}</span>
                  </div>
                )}
                {aiResult.description && (
                  <div className="ai-suggested-field">
                    <strong style={{ display: "block", fontSize: 11, color: "#7c3aed", marginBottom: 2 }}>Generated Description</strong>
                    <div style={{ fontSize: 13, maxHeight: 120, overflowY: "auto", background: "white", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }} dangerouslySetInnerHTML={{ __html: aiResult.description }} />
                  </div>
                )}

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
  );
}
