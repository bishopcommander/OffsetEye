import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem('nwis_token') || null);
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('nwis_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      setToken(receivedToken);
      setUser(receivedUser);
      sessionStorage.setItem('nwis_token', receivedToken);
      sessionStorage.setItem('nwis_user', JSON.stringify(receivedUser));
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.error || 'Invalid credentials or server offline';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('nwis_token');
    sessionStorage.removeItem('nwis_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
