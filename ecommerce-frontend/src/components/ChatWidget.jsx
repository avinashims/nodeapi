import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { aiApi, formatPrice, resolveProductImageUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ChatWidget() {
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    try {
      const history = next.slice(0, -1).map((item) => ({
        role: item.role,
        content: item.content,
      }));
      const res = await aiApi.chat({ message: text, history });
      setMessages([
        ...next,
        {
          role: "assistant",
          content: res.data.reply,
          products: res.data.products || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
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

          {loading ? (
            <p className="muted chat-widget__empty">Loading...</p>
          ) : !isAuthenticated ? (
            <div className="chat-widget__empty">
              <p>Login to chat with the shopping assistant.</p>
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            </div>
          ) : (
            <>
              <div className="chat-widget__messages" ref={listRef}>
                {messages.length === 0 && (
                  <p className="muted">Try “Show me headphones under ₹2000”.</p>
                )}
                {messages.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={`chat-bubble chat-bubble--${item.role}`}>
                    <p>{item.content}</p>
                    {item.products?.length > 0 && (
                      <div className="chat-products">
                        {item.products.map((product) => (
                          <Link key={product.id} to={`/products/${product.id}`} className="chat-product">
                            {resolveProductImageUrl(product.imageUrl) ? (
                              <img src={resolveProductImageUrl(product.imageUrl)} alt="" />
                            ) : (
                              <span className="chat-product__placeholder">No image</span>
                            )}
                            <span>
                              <strong>{product.name}</strong>
                              <em>{formatPrice(product.price)}</em>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {sending && <p className="muted">Thinking...</p>}
              </div>
              {error && <p className="alert alert-error">{error}</p>}
              <form className="chat-widget__form" onSubmit={handleSend}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about a product..."
                  maxLength={1000}
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
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
