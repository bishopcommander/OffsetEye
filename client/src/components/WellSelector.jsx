import React, { useState } from 'react';
import { Target, Layers, MapPin, Activity, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export default function WellSelector({ wells, activeWellId, onSelectWell, wellDetails }) {
  const [showSwitchWell, setShowSwitchWell] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);

  const activeWell = wells.find(w => w.id === activeWellId) || wells[0];

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={16} color="#06b6d4" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Active Well
          </h2>
        </div>
        <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Active Rig</span>
      </div>

      {/* Primary Info (Always Front & Center) */}
      {activeWell && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0e17', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f3f4f6' }}>
              {activeWell.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Layers size={12} /> {activeWell.formation || 'Hugin'} Formation
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase' }}>Current Depth</span>
            <div className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
              {activeWell.current_depth || 0} <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>m</span>
            </div>
          </div>
        </div>
      )}

      {/* Button Controls for Side Info */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setShowSwitchWell(!showSwitchWell)}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.72rem', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RefreshCw size={11} color="#06b6d4" /> Switch Well
          </span>
          {showSwitchWell ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <button
          type="button"
          onClick={() => setShowTelemetry(!showTelemetry)}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.72rem', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MapPin size={11} color="#10b981" /> Coordinates & TD
          </span>
          {showTelemetry ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Collapsible Well Switch Dropdown */}
      {showSwitchWell && (
        <div style={{ background: '#0f172a', padding: '8px', borderRadius: '8px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Select Active Drilling Well:</label>
          <select
            value={activeWellId || ''}
            onChange={(e) => {
              onSelectWell(Number(e.target.value));
              setShowSwitchWell(false);
            }}
            className="select-input"
            style={{ fontWeight: 600, fontSize: '0.85rem', width: '100%' }}
          >
            {wells.map(w => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.formation || 'Volve Sandstone'} ({w.current_depth || 0}m MD)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Collapsible Telemetry / Coordinates */}
      {showTelemetry && activeWell && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', background: '#0a0e17', padding: '10px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <div>
            <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={11} /> Coordinates
            </div>
            <div className="mono" style={{ color: '#f3f4f6', marginTop: '2px', fontWeight: 500 }}>
              {activeWell.latitude?.toFixed(4)}°N, {activeWell.longitude?.toFixed(4)}°E
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

