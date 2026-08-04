import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatPaymentMethod, formatPrice, orderApi } from "../../api/client";

const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadOrder() {
    const res = await orderApi.get(id);
    setOrder(res.data);
  }

  useEffect(() => {
    loadOrder()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status) {
    setMessage("");
    setError("");
    try {
      const res = await orderApi.updateStatus(id, { status });
      setOrder(res.data);
      setMessage(`Order status updated to ${status}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading order...</p>;
  if (error && !order) return <p className="alert alert-error">{error}</p>;
  if (!order) return null;

  return (
    <div className="admin-page">
      <Link to="/admin/orders" className="back-link">
        ← Back to orders
      </Link>

      <div className="admin-page__header admin-page__header--row">
        <div>
          <h2>Order #{order.id}</h2>
          <p className="muted">
            {order.user?.name} · {order.user?.email}
          </p>
        </div>
        <label className="admin-filter">
          Order status
          <select value={order.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <div className="admin-detail-grid">
        <div className="card admin-card">
          <h3>Order info</h3>
          <dl className="admin-dl">
            <dt>Status</dt>
            <dd>
              <span className={`badge badge--${order.status.toLowerCase()}`}>{order.status}</span>
            </dd>
            <dt>Payment method</dt>
            <dd>{formatPaymentMethod(order.paymentMethod)}</dd>
            <dt>Payment status</dt>
            <dd>{order.paymentStatus}</dd>
            <dt>Total</dt>
            <dd>{formatPrice(order.total)}</dd>
            <dt>Placed</dt>
            <dd>{new Date(order.createdAt).toLocaleString()}</dd>
          </dl>
        </div>

        <div className="card admin-card">
          <h3>Shipping</h3>
          {order.shippingAddress ? (
            <p>
              {order.shippingAddress}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingZip}
              <br />
              Phone: {order.shippingPhone}
            </p>
          ) : (
            <p className="muted">No shipping address</p>
          )}
        </div>
      </div>

      <div className="card admin-card">
        <h3>Line items</h3>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item) => (
                <tr key={item.id}>
                  <td>{item.product?.name || `#${item.productId}`}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td>{formatPrice(Number(item.price) * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
