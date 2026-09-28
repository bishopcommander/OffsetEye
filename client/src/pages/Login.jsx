import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, KeyRound, UserCheck, ShieldAlert, ChevronRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('testeng');
  const [password, setPassword] = useState('Drilling123');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await login(username, password);
    if (!res.success) {
      setError(res.error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid rgba(42, 199, 207, 0.8)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(42, 199, 207, 0.2), 0 0 22px rgba(42, 199, 207, 0.18)', padding: '4px' }}>
            <img src="/logo.svg" alt="eRTMAC-NWIS logo" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              eRTMAC-NWIS
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Oil India Limited • Institutional Memory & Offset Intelligence
            </p>
          </div>
        </div>

        {/* Notice */}
        <div style={{ background: 'var(--bg-page)', border: 'none', borderLeft: '3px solid var(--status-caution)', borderRadius: '6px', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Prototype notice:</strong> Standalone decision-support system alongside eRTMAC using public international analogues (Equinor Volve dataset).
        </div>

        {error && (
          <div style={{ padding: '10px', background: 'color-mix(in srgb, var(--status-caution) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--status-caution) 40%, transparent)', borderRadius: '8px', color: 'var(--status-caution)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <input
              type="text"
              className="input-text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              className="input-text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-submit"
            style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
            <span>{loading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--bg-panel)', paddingTop: '12px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setUsername('testeng');
              setPassword('Drilling123');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--status-caution)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Fill Default Demo Credentials (testeng / Drilling123)
          </button>
        </div>
      </div>
    </div>
  );
}
