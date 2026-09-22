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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0a0e17 80%)', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px', border: '1px solid rgba(14, 165, 233, 0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.7)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(14, 165, 233, 0.6)' }}>
            <Compass size={32} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              eRTMAC-NWIS
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
              Oil India Limited • Institutional Memory & Offset Intelligence
            </p>
          </div>
        </div>

        {/* Notice */}
        <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#bae6fd', lineHeight: 1.4 }}>
          <strong>Prototype Notice:</strong> Standalone decision-support system alongside eRTMAC using public international analogues (Equinor Volve dataset).
        </div>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
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
            <label style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
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
            className="btn btn-primary"
            style={{ padding: '12px', fontSize: '0.95rem', marginTop: '6px' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
            <span>{loading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
          </button>
        </form>

        <div style={{ borderTop: '1px solid #1f2937', paddingTop: '12px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setUsername('testeng');
              setPassword('Drilling123');
            }}
            style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Fill Default Demo Credentials (testeng / Drilling123)
          </button>
        </div>
      </div>
    </div>
  );
}
