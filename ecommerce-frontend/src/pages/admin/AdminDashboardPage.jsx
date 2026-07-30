import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, formatPaymentMethod, formatPrice } from "../../api/client";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardApi.admin();
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

  const statusEntries = Object.entries(data.summary.ordersByStatus || {});

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h2>Overview</h2>
        <p className="muted">Store performance at a glance</p>
      </div>

      <div className="stats-grid admin-stats">
        <div className="stat-card card admin-stat">
          <span className="admin-stat__label">Users</span>
          <strong>{data.summary.totalUsers}</strong>
        </div>
        <div className="stat-card card admin-stat">
          <span className="admin-stat__label">Products</span>
          <strong>{data.summary.totalProducts}</strong>
          <Link to="/admin/products" className="admin-stat__link">
            Manage
          </Link>
        </div>
        <div className="stat-card card admin-stat">
          <span className="admin-stat__label">Orders</span>
          <strong>{data.summary.totalOrders}</strong>
          <Link to="/admin/orders" className="admin-stat__link">
            View all
          </Link>
        </div>
        <div className="stat-card card admin-stat">
          <span className="admin-stat__label">Revenue (paid)</span>
          <strong>{formatPrice(data.summary.totalRevenue)}</strong>
        </div>
      </div>

      {statusEntries.length > 0 && (
        <div className="card admin-card">
          <h3>Orders by status</h3>
          <div className="status-pills">
            {statusEntries.map(([status, count]) => (
              <span key={status} className="status-pill">
                {status}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card admin-card">
        <div className="section-header">
          <h3>Recent orders</h3>
          <Link to="/admin/orders">Manage orders</Link>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Method</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user?.name}</td>
                  <td>
                    <span className={`badge badge--${order.status.toLowerCase()}`}>{order.status}</span>
                  </td>
                  <td>{formatPaymentMethod(order.paymentMethod)}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
