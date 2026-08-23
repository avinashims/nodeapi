import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ChatPanel from "./ChatPanel";

export default function ChatWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("ai:open", onOpen);
    return () => window.removeEventListener("ai:open", onOpen);
  }, []);

  if (location.pathname === "/assistant") {
    return null;
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-widget__panel" aria-label="Shop assistant">
          <header className="chat-widget__header">
            <div>
              <strong>Shop assistant</strong>
              <p className="muted">Ask about products in this store</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <ChatPanel compact />
        </section>
      )}

      <button
        type="button"
        className="chat-widget__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Close chat" : "Ask AI"}
      </button>
    </div>
  );
}
