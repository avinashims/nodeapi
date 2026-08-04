import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice, productApi, resolveProductImageUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await productApi.get(id);
        if (!cancelled) setProduct(res.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product.id, quantity);
      setMessage("Added to cart");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading product...</p>;
  if (error && !product) return <p className="alert alert-error">{error}</p>;
  if (!product) return null;

  const imageSrc = resolveProductImageUrl(product.imageUrl);

  return (
    <div className="product-detail">
      <Link to="/" className="back-link">
        ← Back to shop
      </Link>
      <div className="product-detail__grid">
        <div className="product-detail__image">
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} />
          ) : (
            <span className="product-card__placeholder">No image</span>
          )}
        </div>
        <div>
          <h1>{product.name}</h1>
          {product.category?.name && (
            <p className="product-detail__category">Category: {product.category.name}</p>
          )}
          <p className="product-detail__price">{formatPrice(product.price)}</p>
          <p className="muted">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
          {product.description && <p>{product.description}</p>}

          {product.stock > 0 && (
            <div className="quantity-row">
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <button type="button" className="btn btn-primary" onClick={handleAddToCart}>
                Add to cart
              </button>
            </div>
          )}
          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
