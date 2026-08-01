import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/orders", label: "Orders" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Link to="/admin">ShopVerse Admin</Link>
        </div>
        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="admin-sidebar__store-link">
          ← Back to store
        </Link>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1 className="admin-topbar__title">Admin panel</h1>
          <div className="admin-topbar__actions">
            <span className="muted">{user?.name}</span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
