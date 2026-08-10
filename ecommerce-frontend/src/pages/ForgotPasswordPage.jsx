import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setResetUrl("");
    setLoading(true);

    try {
      const res = await authApi.forgotPassword({ email });
      setSuccess(res.message);
      if (res.data?.resetUrl) {
        setResetUrl(res.data.resetUrl);
      }
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Forgot password</h1>
      <p className="muted">Enter your email and we will send you a reset link.</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        {success && <p className="alert alert-success">{success}</p>}
        {resetUrl && (
          <p className="alert alert-success">
            Dev reset link:{" "}
            <a href={resetUrl} target="_blank" rel="noreferrer">
              Reset password
            </a>
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p>
        Remember your password? <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}
