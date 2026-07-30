import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { subscribeAuthBridge } from "../lib/authBridge";

/**
 * Redirects to /login when refresh fails (invalid/expired refresh token).
 * Must render inside BrowserRouter.
 */
export default function AuthSessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    return subscribeAuthBridge({
      onSessionExpired: () => {
        const path = locationRef.current.pathname;
        if (path === "/login" || path === "/register") return;
        navigate("/login", {
          replace: true,
          state: {
            from: path,
            reason: "session_expired",
          },
        });
      },
    });
  }, [navigate]);

  return null;
}
