import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, ACCESS_TOKEN_KEY, USER_KEY, saveSession, clearSession } from "../api/client";

const AuthContext = createContext(null);

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function onUpdate(e) {
      const data = e.detail;
      if (data?.user) setUser(data.user);
      if (data?.accessToken) setAccessToken(data.accessToken);
    }

    function onExpired() {
      setUser(null);
      setAccessToken(null);
    }

    window.addEventListener("auth:update", onUpdate);
    window.addEventListener("auth:expired", onExpired);
    return () => {
      window.removeEventListener("auth:update", onUpdate);
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  useEffect(() => {
    async function init() {
      try {
        if (accessToken) {
          const res = await authApi.me();
          setUser(res.data.user);
        } else {
          const res = await authApi.refresh();
          saveSession(res.data);
          setUser(res.data.user);
          setAccessToken(res.data.accessToken);
        }
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const res = await authApi.login({ email, password });
    saveSession(res.data);
    setUser(res.data.user);
    setAccessToken(res.data.accessToken);
    return res;
  }

  async function register(name, email, password) {
    const res = await authApi.register({ name, email, password });
    saveSession(res.data);
    setUser(res.data.user);
    setAccessToken(res.data.accessToken);
    return res;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setAccessToken(null);
  }

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      isAuthenticated: Boolean(user && accessToken),
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
    }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
