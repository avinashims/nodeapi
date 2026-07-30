import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkoutApi, formatPrice, paymentApi } from "../api/client";
import PaymentMethodOptions from "../components/PaymentMethodOptions";
import { useCart } from "../context/CartContext";
import { openRazorpayCheckout } from "../lib/razorpayCheckout";

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingPhone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cart?.items.length) return;

    setLoading(true);
    setError("");
    try {
      const orderRes = await checkoutApi.createOrder({ ...form, paymentMethod });
      const order = orderRes.data;

      await refreshCart();

      if (paymentMethod === "COD") {
        navigate(`/orders/${order.id}`, {
          state: { message: "Order placed. Pay cash when your order is delivered." },
        });
        return;
      }

      try {
        await openRazorpayCheckout({
          orderId: order.id,
          paymentApi,
          onSuccess: () => navigate(`/orders/${order.id}`, { state: { paid: true } }),
          onError: (err) => setError(err.message),
        });
      } catch (payErr) {
        if (payErr.message !== "Payment cancelled") {
          navigate(`/orders/${order.id}`, {
            state: {
              message:
                "Order created. You can complete online payment from the order page when Razorpay is configured.",
            },
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!cart) {
    return <p className="muted">Loading...</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="empty-state">
        <h1>Nothing to checkout</h1>
        <Link to="/" className="btn btn-primary">
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="card form" onSubmit={handleSubmit}>
        <h1>Checkout</h1>
        <label>
          Address
          <input
            value={form.shippingAddress}
            onChange={(e) => updateField("shippingAddress", e.target.value)}
            required
          />
        </label>
        <div className="form-row">
          <label>
            City
            <input value={form.shippingCity} onChange={(e) => updateField("shippingCity", e.target.value)} required />
          </label>
          <label>
            State
            <input value={form.shippingState} onChange={(e) => updateField("shippingState", e.target.value)} required />
          </label>
        </div>
        <div className="form-row">
          <label>
            ZIP
            <input value={form.shippingZip} onChange={(e) => updateField("shippingZip", e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={form.shippingPhone} onChange={(e) => updateField("shippingPhone", e.target.value)} required />
          </label>
        </div>

        <PaymentMethodOptions
          value={paymentMethod}
          onChange={setPaymentMethod}
          totalLabel={formatPrice(cart.total)}
        />

        {error && <p className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Processing..." : paymentMethod === "COD" ? "Place order (COD)" : "Place order & pay online"}
        </button>
      </form>
      <aside className="card">
        <h2>Order summary</h2>
        <ul className="checkout-items">
          {cart.items.map((item) => (
            <li key={item.id}>
              {item.product.name} × {item.quantity} — {formatPrice(item.subtotal)}
            </li>
          ))}
        </ul>
        <p className="cart-summary__total">
          Total: <strong>{formatPrice(cart.total)}</strong>
        </p>
        {paymentMethod === "COD" && (
          <p className="cod-note">You will pay {formatPrice(cart.total)} in cash at delivery.</p>
        )}
      </aside>
    </div>
  );
}
