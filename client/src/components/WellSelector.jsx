import React from 'react';
import { Target, Layers, MapPin, Activity } from 'lucide-react';

export default function WellSelector({ wells, activeWellId, onSelectWell, wellDetails }) {
  const activeWell = wells.find(w => w.id === activeWellId) || wells[0];

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={16} color="#06b6d4" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Active Monitoring Well
          </h2>
        </div>
        <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Active Rig</span>
      </div>

      {/* Well Select Dropdown */}
      <select
        value={activeWellId || ''}
        onChange={(e) => onSelectWell(Number(e.target.value))}
        className="select-input"
        style={{ fontWeight: 600, fontSize: '0.95rem' }}
      >
        {wells.map(w => (
          <option key={w.id} value={w.id}>
            {w.name} — {w.formation || 'Volve Sandstone'} ({w.current_depth || 0}m MD)
          </option>
        ))}
      </select>

      {/* Well Telemetry Details */}
      {activeWell && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem', background: '#0a0e17', padding: '10px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <div>
            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> Coordinates
            </div>
            <div className="mono" style={{ color: '#f3f4f6', marginTop: '2px', fontWeight: 500 }}>
              {activeWell.latitude?.toFixed(4)}°N, {activeWell.longitude?.toFixed(4)}°E
            </div>
          </div>

          <div>
            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={12} /> Target Formation
            </div>
            <div style={{ color: '#38bdf8', marginTop: '2px', fontWeight: 600 }}>
              {activeWell.formation || 'Hugin'}
            </div>
          </div>

          <div>
            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={12} /> Current Depth (MD)
            </div>
            <div className="mono" style={{ color: '#10b981', marginTop: '2px', fontWeight: 700 }}>
              {activeWell.current_depth || 0} m
            </div>
          </div>

          <div>
            <div style={{ color: '#6b7280' }}>Planned Total Depth</div>
            <div className="mono" style={{ color: '#9ca3af', marginTop: '2px', fontWeight: 500 }}>
              {activeWell.planned_depth || 3500} m
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
