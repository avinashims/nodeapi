import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productApi } from "../api/client";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSearch } from "../context/SearchContext";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { search, categoryId } = useSearch();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const params = { page: 1, limit: 50 };
        if (search.trim()) {
          params.search = search.trim();
        }
        if (categoryId) {
          params.categoryId = categoryId;
        }
        const res = await productApi.list(params);
        setProducts(res.data.products);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [search, categoryId]);

  async function handleAddToCart(productId) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(productId, 1);
      setMessage("Added to cart");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <section className="hero">
        <h1>Discover products you will love</h1>
        <p>Browse the catalog, add items to your cart, and checkout securely.</p>
      </section>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p className="muted">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="muted">No products found.</p>
      ) : (
        <>
          <p className="muted products-count">{products.length} product(s) shown</p>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
