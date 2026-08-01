import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Send user to login when refresh token is invalid. */
export default function AuthSessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function goLogin() {
      const path = location.pathname;
      if (path === "/login" || path === "/register") return;
      navigate("/login", { replace: true, state: { from: path, reason: "session_expired" } });
    }

    window.addEventListener("auth:expired", goLogin);
    return () => window.removeEventListener("auth:expired", goLogin);
  }, [navigate, location.pathname]);

  return null;
}
