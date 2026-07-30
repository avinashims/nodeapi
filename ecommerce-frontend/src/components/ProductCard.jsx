import { Link } from "react-router-dom";
import { formatPrice, resolveProductImageUrl } from "../api/client";

export default function ProductCard({ product, onAddToCart, showAdminActions, onEdit, onDelete }) {
  const imageSrc = resolveProductImageUrl(product.imageUrl);
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__image-link">
        <div className="product-card__image">
          {imageSrc ? (
            <img src={imageSrc} alt={product.name} loading="lazy" />
          ) : (
            <span className="product-card__placeholder">No image</span>
          )}
        </div>
      </Link>
      <div className="product-card__body">
        <Link to={`/products/${product.id}`} className="product-card__title">
          {product.name}
        </Link>
        <p className="product-card__price">{formatPrice(product.price)}</p>
        <p className="product-card__stock">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
        {product.category?.name && <p className="product-card__category">{product.category.name}</p>}
        <div className="product-card__actions">
          {onAddToCart && product.stock > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => onAddToCart(product.id)}>
              Add to cart
            </button>
          )}
          {showAdminActions && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => onEdit(product)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger" onClick={() => onDelete(product.id)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
