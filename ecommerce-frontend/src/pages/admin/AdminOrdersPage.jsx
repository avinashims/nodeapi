import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPaymentMethod, formatPrice, orderApi } from "../../api/client";

const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  async function loadOrders() {
    const params = { limit: 50 };
    if (statusFilter) params.status = statusFilter;
    const res = await orderApi.adminAll(params);
    setOrders(res.data.orders);
  }

  useEffect(() => {
    setLoading(true);
    loadOrders()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function updateStatus(orderId, status) {
    setMessage("");
    try {
      await orderApi.updateStatus(orderId, { status });
      setMessage(`Order #${orderId} updated to ${status}`);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header admin-page__header--row">
        <div>
          <h2>Orders</h2>
          <p className="muted">Manage customer orders and fulfillment</p>
        </div>
        <label className="admin-filter">
          Filter status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
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

      <div className="table-wrap card admin-card">
        {loading ? (
          <p className="muted" style={{ padding: "1rem" }}>
            Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <p className="muted" style={{ padding: "1rem" }}>
            No orders found.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Method</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Update status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>
                    {order.user?.name}
                    <br />
                    <span className="muted">{order.user?.email}</span>
                  </td>
                  <td>
                    <span className={`badge badge--${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>{formatPaymentMethod(order.paymentMethod)}</td>
                  <td>{order.paymentStatus || "—"}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <select
                      className="admin-select-sm"
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
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
