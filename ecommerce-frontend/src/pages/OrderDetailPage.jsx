import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { formatPaymentMethod, formatPrice, orderApi, paymentApi } from "../api/client";
import { openRazorpayCheckout } from "../lib/razorpayCheckout";

export default function OrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [message, setMessage] = useState(
    location.state?.message || (location.state?.paid ? "Payment successful!" : "")
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await orderApi.get(id);
        setOrder(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleCancel() {
    if (!window.confirm("Cancel this order?")) return;
    try {
      const res = await orderApi.cancel(id);
      setOrder(res.data);
      setMessage("Order cancelled");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePayOnline() {
    setPayLoading(true);
    setError("");
    try {
      const updated = await openRazorpayCheckout({
        orderId: order.id,
        paymentApi,
      });
      setOrder(updated);
      setMessage("Payment successful!");
    } catch (err) {
      if (err.message !== "Payment cancelled") {
        setError(err.message);
      }
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) return <p className="muted">Loading order...</p>;
  if (error && !order) return <p className="alert alert-error">{error}</p>;
  if (!order) return null;

  const canCancel = order.status === "PENDING" || order.status === "CONFIRMED";
  const isCod = order.paymentMethod === "COD";
  const canPayOnline =
    order.paymentMethod === "RAZORPAY" &&
    order.paymentStatus === "PENDING" &&
    order.status !== "CANCELLED";

  return (
    <div>
      <Link to="/orders" className="back-link">
        ← Back to orders
      </Link>
      <h1>Order #{order.id}</h1>
      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="card order-detail">
        <p>
          <strong>Status:</strong> {order.status}
        </p>
        <p>
          <strong>Payment method:</strong> {formatPaymentMethod(order.paymentMethod)}
        </p>
        <p>
          <strong>Payment status:</strong> {order.paymentStatus || "PENDING"}
        </p>
        {isCod && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
          <p className="cod-note">Pay {formatPrice(order.total)} in cash when your order is delivered.</p>
        )}
        <p>
          <strong>Total:</strong> {formatPrice(order.total)}
        </p>
        <p>
          <strong>Placed:</strong> {new Date(order.createdAt).toLocaleString()}
        </p>
        {order.shippingAddress && (
          <div>
            <strong>Shipping</strong>
            <p>
              {order.shippingAddress}, {order.shippingCity}, {order.shippingState} {order.shippingZip}
              <br />
              Phone: {order.shippingPhone}
            </p>
          </div>
        )}
        <h2>Items</h2>
        <ul className="checkout-items">
          {order.orderItems?.map((item) => (
            <li key={item.id}>
              {item.product?.name || `Product #${item.productId}`} × {item.quantity} —{" "}
              {formatPrice(item.price)}
            </li>
          ))}
        </ul>
        <div className="order-detail__actions">
          {canPayOnline && (
            <button type="button" className="btn btn-primary" onClick={handlePayOnline} disabled={payLoading}>
              {payLoading ? "Opening payment..." : "Pay now (Razorpay)"}
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn btn-danger" onClick={handleCancel}>
              Cancel order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
