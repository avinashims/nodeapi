export default function PaymentMethodOptions({ value, onChange, totalLabel }) {
  return (
    <div className="payment-options">
      <p className="payment-options__title">Payment method</p>
      <button
        type="button"
        className={`payment-option ${value === "RAZORPAY" ? "payment-option--active" : ""}`}
        onClick={() => onChange("RAZORPAY")}
      >
        <span className="payment-option__name">Pay online</span>
        <span className="payment-option__hint">Razorpay — UPI, card, netbanking</span>
      </button>
      <button
        type="button"
        className={`payment-option ${value === "COD" ? "payment-option--active" : ""}`}
        onClick={() => onChange("COD")}
      >
        <span className="payment-option__name">Cash on delivery</span>
        <span className="payment-option__hint">
          Pay {totalLabel} in cash when the order arrives
        </span>
      </button>
    </div>
  );
}
