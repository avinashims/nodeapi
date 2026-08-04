import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, formatPrice } from "../api/client";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardApi.customer();
        setData(res.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="muted">Loading dashboard...</p>;
  if (error) return <p className="alert alert-error">{error}</p>;
  if (!data) return null;

  return (
    <div>
      <h1>My dashboard</h1>
      <p className="muted">
        Welcome back, {data.user.name} ({data.user.email})
      </p>

      <div className="stats-grid">
        <div className="stat-card card">
          <span>Total orders</span>
          <strong>{data.summary.totalOrders}</strong>
        </div>
        <div className="stat-card card">
          <span>Total spent</span>
          <strong>{formatPrice(data.summary.totalSpent)}</strong>
        </div>
      </div>

      {Object.keys(data.summary.ordersByStatus || {}).length > 0 && (
        <div className="card">
          <h2>Orders by status</h2>
          <ul className="status-list">
            {Object.entries(data.summary.ordersByStatus).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="section-header">
          <h2>Recent orders</h2>
          <Link to="/orders">View all</Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`}>#{order.id}</Link>
                    </td>
                    <td>{order.status}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
