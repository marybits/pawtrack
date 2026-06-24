import { createContext, useContext, useState } from "react";
import { loginUser, registerUser } from "../api/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("pawtrack_token"));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pawtrack_user"));
    } catch {
      return null;
    }
  });

  function persist(token, user) {
    localStorage.setItem("pawtrack_token", token);
    localStorage.setItem("pawtrack_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  async function login(username, password) {
    const data = await loginUser(username, password);
    persist(data.token, data.user);
  }

  async function register(username, email, password) {
    const data = await registerUser(username, email, password);
    // Auto-login on successful registration.
    persist(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem("pawtrack_token");
    localStorage.removeItem("pawtrack_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
