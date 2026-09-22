import React from 'react';
import { CircleDot } from 'lucide-react';

export default function RadiusSlider({ radiusMeters, onChangeRadius, nearbyWellsCount }) {
  const presets = [
    { label: '500m', val: 500 },
    { label: '2 km', val: 2000 },
    { label: '5 km', val: 5000 },
    { label: '25 km', val: 25000 }
  ];

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CircleDot size={16} color="#0ea5e9" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Offset Query Radius
          </h2>
        </div>
        <span className="mono" style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 700 }}>
          {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(1)} km` : `${radiusMeters} m`}
        </span>
      </div>

      <input
        type="range"
        min="200"
        max="30000"
        step="200"
        value={radiusMeters}
        onChange={(e) => onChangeRadius(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#0ea5e9', cursor: 'pointer' }}
      />

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
        {presets.map(p => (
          <button
            key={p.val}
            onClick={() => onChangeRadius(p.val)}
            className={`btn ${radiusMeters === p.val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1f2937', paddingTop: '8px' }}>
        <span>Geospatial filter (PostGIS):</span>
        <span style={{ color: '#f3f4f6', fontWeight: 600 }}>
          {nearbyWellsCount} offset well{nearbyWellsCount === 1 ? '' : 's'} in buffer
        </span>
      </div>
    </div>
  );
}
