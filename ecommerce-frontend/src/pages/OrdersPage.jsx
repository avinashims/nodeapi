import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPaymentMethod, formatPrice, orderApi } from "../api/client";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await orderApi.myOrders();
        setOrders(res.data.orders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="muted">Loading orders...</p>;
  if (error) return <p className="alert alert-error">{error}</p>;

  return (
    <div>
      <h1>My orders</h1>
      {orders.length === 0 ? (
        <p className="muted">You have not placed any orders yet.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Method</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/orders/${order.id}`}>#{order.id}</Link>
                  </td>
                  <td>{order.status}</td>
                  <td>{formatPaymentMethod(order.paymentMethod)}</td>
                  <td>{order.paymentStatus || "—"}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
