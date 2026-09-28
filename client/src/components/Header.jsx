import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, AlertTriangle, User, LogOut, UploadCloud, Radio, Activity, FileSpreadsheet } from 'lucide-react';

export default function Header({ onOpenUpload, activeMode, onSelectMode }) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-panel" style={{ margin: '12px 16px 0', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid rgba(42, 199, 207, 0.75)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(42, 199, 207, 0.22), 0 0 18px rgba(42, 199, 207, 0.18)', padding: '2px' }}>
          <img src="/logo.svg" alt="eRTMAC-NWIS logo" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(90deg, var(--accent-brand), var(--accent-brand))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              OffsetEye
            </h1>
            <span style={{ fontSize: '0.7rem', background: 'color-mix(in srgb, var(--accent-brand) 15%, transparent)', color: 'var(--accent-brand)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid color-mix(in srgb, var(--accent-brand) 30%, transparent)' }}>
              Oil India Limited
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Offset Well Intelligence & Drilling Risk Decision-Support
          </p>
        </div>
      </div>

      {/* Center Operational Mode Switcher */}
      <div style={{ display: 'flex', background: 'var(--bg-page)', padding: '4px', borderRadius: '10px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', gap: '4px' }}>
        <button
          onClick={() => onSelectMode('monitor')}
          className={`btn ${activeMode === 'monitor' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px' }}
        >
          <Activity size={14} />
          <span>Active drilling monitor</span>
        </button>

        <button
          onClick={() => onSelectMode('prognosis')}
          className={`btn ${activeMode === 'prognosis' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px' }}
        >
          <FileSpreadsheet size={14} />
          <span>New well planning & offset scan</span>
        </button>
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onOpenUpload}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '6px 10px' }}
          title="Upload historical PDF or DDR report"
        >
          <UploadCloud size={14} color="var(--accent-brand)" />
          <span>Upload WCR/DDR</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-panel)', padding: '5px 10px', borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)' }}>
          <User size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.username || 'Engineer'}</span>
          <span style={{ fontSize: '0.62rem', background: 'var(--border-subtle)', padding: '2px 5px', borderRadius: '4px', color: 'var(--text-muted)',  }}>
            {user?.role || 'field'}
          </span>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary"
          title="Sign out"
          style={{ padding: '6px 8px' }}
        >
          <LogOut size={14} color="var(--status-caution)" />
        </button>
      </div>
    </header>
  );
}
