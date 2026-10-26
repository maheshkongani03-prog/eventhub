import { createContext, useContext, useState } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth')) || null;
    } catch {
      return null;
    }
  });

  function save(data) {
    setAuth(data);
    if (data) localStorage.setItem('auth', JSON.stringify(data));
    else localStorage.removeItem('auth');
  }

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    save({ user: data.user, token: data.token });
  }

  async function register(name, email, password) {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    save({ user: data.user, token: data.token });
  }

  function logout() {
    save(null);
  }

  return (
    <AuthContext.Provider
      value={{ user: auth?.user ?? null, token: auth?.token ?? null, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}