import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, AlertTriangle, User, LogOut, UploadCloud, Radio, Activity, FileSpreadsheet } from 'lucide-react';

export default function Header({ onOpenUpload, activeMode, onSelectMode }) {
  const { user, logout } = useAuth();

  return (
    <header className="glass-panel" style={{ margin: '12px 16px 0', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100 }}>
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(14, 165, 233, 0.5)' }}>
          <Compass size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              eRTMAC-NWIS
            </h1>
            <span style={{ fontSize: '0.7rem', background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(14, 165, 233, 0.3)' }}>
              OIL INDIA LIMITED
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Nearby Wells Intelligence System & Drilling Risk Decision-Support
          </p>
        </div>
      </div>

      {/* Center Operational Mode Switcher */}
      <div style={{ display: 'flex', background: '#0a0e17', padding: '4px', borderRadius: '10px', border: '1px solid #1f2937', gap: '4px' }}>
        <button
          onClick={() => onSelectMode('monitor')}
          className={`btn ${activeMode === 'monitor' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px' }}
        >
          <Activity size={14} />
          <span>Active Drilling Monitor</span>
        </button>

        <button
          onClick={() => onSelectMode('prognosis')}
          className={`btn ${activeMode === 'prognosis' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '6px' }}
        >
          <FileSpreadsheet size={14} />
          <span>New Well Planning & Offset Scan</span>
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
          <UploadCloud size={14} color="#38bdf8" />
          <span>Upload WCR/DDR</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1f2937', padding: '5px 10px', borderRadius: '8px', border: '1px solid #374151' }}>
          <User size={14} color="#9ca3af" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f3f4f6' }}>{user?.username || 'Engineer'}</span>
          <span style={{ fontSize: '0.62rem', background: '#374151', padding: '2px 5px', borderRadius: '4px', color: '#9ca3af', textTransform: 'uppercase' }}>
            {user?.role || 'field'}
          </span>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary"
          title="Sign out"
          style={{ padding: '6px 8px' }}
        >
          <LogOut size={14} color="#ef4444" />
        </button>
      </div>
    </header>
  );
}
