import { useEffect, useState } from "react";
import { categoryApi } from "../../api/client";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCategories() {
    const res = await categoryApi.list();
    setCategories(res.data);
  }

  useEffect(() => {
    loadCategories()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await categoryApi.create({ name });
      setName("");
      setMessage("Category added");
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(id) {
    setError("");
    try {
      await categoryApi.update(id, { name: editName });
      setMessage("Category updated");
      cancelEdit();
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this category?")) return;
    try {
      await categoryApi.remove(id);
      setMessage("Category deleted");
      await loadCategories();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2>Categories</h2>
        <p className="muted">Categories appear in the shop menu and on products</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <form className="card form admin-form" onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <h3>Add category</h3>
        <label>
          Category name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Electronics" />
        </label>
        <button type="submit" className="btn btn-primary">
          Add category
        </button>
      </form>

      <div className="card admin-card">
        <h3>All categories</h3>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="muted">No categories yet. Add one above.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.id}</td>
                  <td>
                    {editingId === cat.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="admin-inline-input"
                      />
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td>{cat._count?.products ?? 0}</td>
                  <td className="admin-table-actions">
                    {editingId === cat.id ? (
                      <>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEdit(cat.id)}>
                          Save
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(cat)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(cat.id)}>
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
