// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, usersAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Bootstrap — verify stored token on load ────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(res => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password, extra = {}) => {
    setError(null);
    const res = await authAPI.login({ email, password, ...extra });
    if (res.data.requires2FA) return res.data;
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setUser(user);
    return user;
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setError(null);
    const res = await authAPI.register(formData);
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setUser(user);
    return user;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  // ── Update local user state (after profile edit) ───────────────────────────
  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  const isAdmin       = user && ["SUPER_ADMIN","STATE_ADMIN","DEPT_ADMIN"].includes(user.role);
  const isSuperAdmin  = user?.role === "SUPER_ADMIN";
  const isStateAdmin  = user?.role === "STATE_ADMIN";
  const isDeptAdmin   = user?.role === "DEPT_ADMIN";

  return (
    <AuthContext.Provider value={{
      user, loading, error, setError,
      login, register, logout, updateUser,
      isAdmin, isSuperAdmin, isStateAdmin, isDeptAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
