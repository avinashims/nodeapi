import { Outlet } from "react-router-dom";
import ChatWidget from "./ChatWidget";
import Navbar from "./Navbar";
import { SearchProvider } from "../context/SearchContext";

export default function Layout() {
  return (
    <SearchProvider>
      <div className="app-shell">
        <Navbar />
        <main className="container main-content">
          <Outlet />
        </main>
        <footer className="footer">
          <div className="container">ShopVerse — React ecommerce demo</div>
        </footer>
        <ChatWidget />
      </div>
    </SearchProvider>
  );
}
