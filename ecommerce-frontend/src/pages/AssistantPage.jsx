import ChatPanel from "../components/ChatPanel";

export default function AssistantPage() {
  return (
    <div className="assistant-page">
      <section className="hero">
        <h1>ShopVerse AI assistant</h1>
        <p>Ask about products, prices, and stock in this store. Suggested items open on the product page.</p>
      </section>
      <section className="card assistant-page__chat" aria-label="Shop assistant">
        <header className="assistant-page__header">
          <strong>Chat</strong>
          <p className="muted">Logged-in shoppers can send messages here.</p>
        </header>
        <ChatPanel />
      </section>
    </div>
  );
}
