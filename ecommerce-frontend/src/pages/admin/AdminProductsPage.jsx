import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/ProductCard";
import { productApi, categoryApi, resolveProductImageUrl } from "../../api/client";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: "0",
  categoryId: "",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadProducts() {
    const res = await productApi.list({ limit: 50 });
    setProducts(res.data.products);
  }

  useEffect(() => {
    Promise.all([loadProducts(), categoryApi.list()])
      .then(([, catRes]) => setCategories(catRes.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!imageFile) {
      if (!existingImageUrl) setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, existingImageUrl]);

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      categoryId: product.categoryId ? String(product.categoryId) : "",
    });
    setImageFile(null);
    setExistingImageUrl(product.imageUrl || null);
    setImagePreview(product.imageUrl ? resolveProductImageUrl(product.imageUrl) : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setExistingImageUrl(null);
    setImagePreview(null);
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    setImageFile(file || null);
    if (file) setExistingImageUrl(null);
  }

  function buildFormData() {
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("price", form.price);
    fd.append("stock", form.stock);
    fd.append("categoryId", form.categoryId);
    if (imageFile) {
      fd.append("image", imageFile);
    }
    return fd;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const fd = buildFormData();
      if (editingId) {
        await productApi.update(editingId, fd);
        setMessage("Product updated successfully");
      } else {
        await productApi.create(fd);
        setMessage("Product created successfully");
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    setMessage("");
    try {
      await productApi.remove(id);
      setMessage("Product deleted");
      if (editingId === id) resetForm();
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2>Products</h2>
        <p className="muted">{products.length} products in catalog</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="admin-split">
        <form className="card form admin-form" onSubmit={handleSubmit}>
          <h3>{editingId ? `Edit product #${editingId}` : "Add new product"}</h3>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </label>
          <div className="form-row">
            <label>
              Price (₹)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </label>
            <label>
              Stock
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            </label>
          </div>
          <label>
            Category
            {categories.length === 0 ? (
              <p className="muted file-hint">
                No categories. <Link to="/admin/categories">Add categories</Link> in admin first.
              </p>
            ) : (
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            Product image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
            />
            <span className="muted file-hint">JPEG, PNG, WebP, or GIF — max 5MB</span>
          </label>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Save changes" : "Add product"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="admin-split__main">
          <h3>Catalog</h3>
          {loading ? (
            <p className="muted">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="muted">No products yet. Add one using the form.</p>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAdminActions
                  onEdit={startEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
