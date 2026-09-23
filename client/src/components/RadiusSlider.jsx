import React, { useState } from 'react';
import { CircleDot, ChevronDown, ChevronUp } from 'lucide-react';

export default function RadiusSlider({ radiusMeters, onChangeRadius, nearbyWellsCount }) {
  const [showPresets, setShowPresets] = useState(false);

  const presets = [
    { label: '500m', val: 500 },
    { label: '2 km', val: 2000 },
    { label: '5 km', val: 5000 },
    { label: '10 km', val: 10000 },
    { label: '25 km', val: 25000 }
  ];

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CircleDot size={16} color="#0ea5e9" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Offset Query Radius
          </h2>
        </div>
        <span className="mono" style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 800 }}>
          {radiusMeters >= 1000 ? `${(radiusMeters / 1000).toFixed(1)} km` : `${radiusMeters} m`}
        </span>
      </div>

      {/* Main Slider (Front & Center) */}
      <input
        type="range"
        min="200"
        max="30000"
        step="200"
        value={radiusMeters}
        onChange={(e) => onChangeRadius(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#0ea5e9', cursor: 'pointer' }}
      />

      {/* Front Buffer Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
        <span>PostGIS Spatial Buffer:</span>
        <span style={{ color: '#10b981', fontWeight: 700 }}>
          {nearbyWellsCount} offset well{nearbyWellsCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Button for Presets (Side Info) */}
      <button
        type="button"
        onClick={() => setShowPresets(!showPresets)}
        className="btn btn-secondary"
        style={{ padding: '4px 8px', fontSize: '0.7rem', justifyContent: 'space-between', width: '100%' }}
      >
        <span>Quick Presets</span>
        {showPresets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {/* Collapsible Presets */}
      {showPresets && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', paddingTop: '2px' }}>
          {presets.map(p => (
            <button
              key={p.val}
              onClick={() => onChangeRadius(p.val)}
              className={`btn ${radiusMeters === p.val ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '4px 4px', fontSize: '0.7rem' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

