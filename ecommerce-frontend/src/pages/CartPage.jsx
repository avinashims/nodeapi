import { Link } from "react-router-dom";
import { formatPrice } from "../api/client";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem } = useCart();

  if (loading && !cart) {
    return <p className="muted">Loading cart...</p>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-state">
        <h1>Your cart is empty</h1>
        <Link to="/" className="btn btn-primary">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Shopping cart</h1>
      <div className="cart-layout">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-item">
              <div>
                <strong>{item.product.name}</strong>
                <p className="muted">{formatPrice(item.product.price)} each</p>
              </div>
              <div className="cart-item__controls">
                <input
                  type="number"
                  min={1}
                  max={item.product.stock}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                />
                <span>{formatPrice(item.subtotal)}</span>
                <button type="button" className="btn btn-ghost" onClick={() => removeItem(item.productId)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <aside className="cart-summary card">
          <h2>Summary</h2>
          <p className="cart-summary__total">
            Total: <strong>{formatPrice(cart.total)}</strong>
          </p>
          <Link to="/checkout" className="btn btn-primary btn-block">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
