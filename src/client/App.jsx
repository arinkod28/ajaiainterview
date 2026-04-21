import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = useCallback((user) => {
    setUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
