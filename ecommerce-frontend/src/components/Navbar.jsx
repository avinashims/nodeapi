import { Link, NavLink, useNavigate } from "react-router-dom";
import CategoryMenu from "./CategoryMenu";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSearch } from "../context/SearchContext";

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { search, setSearch } = useSearch();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function handleSearch(e) {
    e.preventDefault();
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          ShopVerse
        </Link>

        <form className="navbar__search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <nav className="navbar__links">
          <NavLink to="/" end>
            Shop
          </NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/orders">Orders</NavLink>
              <NavLink to="/cart">Cart ({itemCount})</NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink to="/admin" className="navbar__admin-link">
              Admin panel
            </NavLink>
          )}
        </nav>

        <div className="navbar__auth">
          {isAuthenticated ? (
            <>
              <span className="navbar__user">Hi, {user.name}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
      <CategoryMenu />
    </header>
  );
}
