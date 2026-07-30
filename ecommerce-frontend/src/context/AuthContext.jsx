import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi, ACCESS_TOKEN_KEY, USER_KEY, clearAuthStorage, persistSession } from "../api/client";
import { subscribeAuthBridge } from "../lib/authBridge";

const AuthContext = createContext(null);

function readStoredUser() {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const clearLocalSession = useCallback(() => {
    clearAuthStorage();
    setUser(null);
    setAccessToken(null);
  }, []);

  const applySession = useCallback((data) => {
    if (data?.user) setUser(data.user);
    if (data?.accessToken) setAccessToken(data.accessToken);
    persistSession(data);
  }, []);

  useEffect(() => {
    return subscribeAuthBridge({
      onSessionUpdate: (data) => {
        if (data?.user) setUser(data.user);
        if (data?.accessToken) setAccessToken(data.accessToken);
      },
      onSessionExpired: () => {
        clearLocalSession();
      },
    });
  }, [clearLocalSession]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        if (accessToken) {
          const res = await authApi.me();
          if (!cancelled) setUser(res.data.user);
          return;
        }
        const res = await authApi.refresh();
        if (!cancelled) applySession(res.data);
      } catch {
        if (!cancelled) clearLocalSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once on mount
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthLoading(true);
    try {
      const res = await authApi.login({ email, password });
      applySession(res.data);
      return res;
    } finally {
      setAuthLoading(false);
    }
  }, [applySession]);

  const register = useCallback(async (name, email, password) => {
    setAuthLoading(true);
    try {
      const res = await authApi.register({ name, email, password });
      applySession(res.data);
      return res;
    } finally {
      setAuthLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* refresh cookie may already be gone */
    }
    clearLocalSession();
  }, [clearLocalSession]);

  const value = useMemo(
    () => ({
      user,
      token: accessToken,
      accessToken,
      loading: initializing || authLoading,
      initializing,
      isAuthenticated: Boolean(accessToken && user),
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
    }),
    [user, accessToken, initializing, authLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
