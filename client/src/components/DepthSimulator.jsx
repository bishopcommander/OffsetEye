import React, { useState, useEffect } from 'react';
import { Play, Pause, FastForward, ArrowDownCircle, AlertCircle, Zap } from 'lucide-react';

export default function DepthSimulator({ depth, onUpdateDepth, currentFormation, isSimulating, setIsSimulating, activeWell }) {
  const [localDepth, setLocalDepth] = useState(depth);

  useEffect(() => {
    setLocalDepth(depth);
  }, [depth]);

  // Calculate dynamic depth bounds based on the active well's actual operational depth
  const wellCurrent = activeWell?.current_depth || 2950;
  const wellPlanned = activeWell?.planned_depth || 3700;
  const minDepth = Math.max(1000, Math.floor(Math.min(wellCurrent - 800, 2000)));
  const maxDepth = Math.ceil(Math.max(wellPlanned + 100, wellCurrent + 100, 3600));

  // Auto-progression timer
  useEffect(() => {
    let interval = null;
    if (isSimulating) {
      interval = setInterval(() => {
        setLocalDepth(prev => {
          const next = Math.min(maxDepth, prev + 10);
          onUpdateDepth(next);
          if (next >= maxDepth) setIsSimulating(false);
          return next;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isSimulating, onUpdateDepth, setIsSimulating, maxDepth]);

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setLocalDepth(val);
  };

  const handleSliderCommit = () => {
    onUpdateDepth(localDepth);
  };

  const stepDepth = (delta) => {
    const next = Math.max(minDepth, Math.min(maxDepth, localDepth + delta));
    setLocalDepth(next);
    onUpdateDepth(next);
  };

  const jumpToHazard = (targetDepth) => {
    setLocalDepth(targetDepth);
    onUpdateDepth(targetDepth);
  };

  // Known high-risk hazard intervals
  const isHuginLossZone = localDepth >= 2900 && localDepth <= 2960;
  const isStuckPipeZone = localDepth >= 3100 && localDepth <= 3130;
  const isTorqueZone = localDepth >= 2670 && localDepth <= 2720;
  const isOverpressureZone = localDepth >= 3230 && localDepth <= 3260;
  const isInAnyHazardZone = isHuginLossZone || isStuckPipeZone || isTorqueZone || isOverpressureZone;

  let hazardLabel = 'SAFE OPERATIONAL WINDOW';
  if (isHuginLossZone) hazardLabel = 'HAZARD: HUGIN MUD LOSS ZONE';
  else if (isStuckPipeZone) hazardLabel = 'HAZARD: STUCK PIPE RECOVERY ZONE';
  else if (isTorqueZone) hazardLabel = 'HAZARD: SHETLAND TORQUE SPIKES';
  else if (isOverpressureZone) hazardLabel = 'HAZARD: SKAGERRAK KICK & OVERPRESSURE';

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', border: isInAnyHazardZone ? '1px solid rgba(239, 68, 68, 0.5)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowDownCircle size={16} color="#10b981" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Live Depth Simulator
          </h2>
        </div>
        <span className={`badge ${isInAnyHazardZone ? 'badge-elevated' : 'badge-simulated'}`} style={{ fontSize: '0.62rem' }}>
          {hazardLabel}
        </span>
      </div>

      {/* Depth & Formation Banner */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', background: '#0a0e17', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1f2937' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Bit Depth (MD)</span>
          <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: isInAnyHazardZone ? '#f87171' : '#34d399' }}>
            {localDepth.toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#9ca3af' }}>m</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Active Formation</span>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
            {currentFormation || 'Hugin'}
          </div>
        </div>
      </div>

      {/* Interactive Slider */}
      <div>
        <input
          type="range"
          min={minDepth}
          max={maxDepth}
          step="5"
          value={localDepth}
          onChange={handleSliderChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          style={{ width: '100%', accentColor: isInAnyHazardZone ? '#ef4444' : '#10b981', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#6b7280', marginTop: '2px' }}>
          <span>{minDepth}m</span>
          <span style={{ color: isInAnyHazardZone ? '#f87171' : '#f59e0b' }}>{hazardLabel}</span>
          <span>{maxDepth}m</span>
        </div>
      </div>

      {/* Quick Hazard Jump Buttons for Testing */}
      <div>
        <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={12} color="#06b6d4" /> Jump to Known Offset Hazard Depth:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            type="button"
            onClick={() => jumpToHazard(2690)}
            className="btn btn-secondary"
            style={{ fontSize: '0.68rem', padding: '4px 6px', justifyContent: 'flex-start' }}
          >
            ⚡ 2690m (Shetland Torque)
          </button>
          <button
            type="button"
            onClick={() => jumpToHazard(2930)}
            className="btn btn-secondary"
            style={{ fontSize: '0.68rem', padding: '4px 6px', justifyContent: 'flex-start' }}
          >
            ⚡ 2930m (Hugin Mud Loss)
          </button>
          <button
            type="button"
            onClick={() => jumpToHazard(3110)}
            className="btn btn-secondary"
            style={{ fontSize: '0.68rem', padding: '4px 6px', justifyContent: 'flex-start' }}
          >
            ⚡ 3110m (Hugin Stuck Pipe)
          </button>
          <button
            type="button"
            onClick={() => jumpToHazard(3250)}
            className="btn btn-secondary"
            style={{ fontSize: '0.68rem', padding: '4px 6px', justifyContent: 'flex-start' }}
          >
            ⚡ 3250m (Skagerrak Kick)
          </button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`btn ${isSimulating ? 'btn-danger' : 'btn-primary'}`}
          style={{ flex: 1.2, padding: '6px 10px', fontSize: '0.75rem' }}
        >
          {isSimulating ? <Pause size={14} /> : <Play size={14} />}
          <span>{isSimulating ? 'Pause Stream' : 'Auto Drill'}</span>
        </button>

        <button
          onClick={() => stepDepth(10)}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem' }}
          title="Simulate drilling forward 10 metres"
        >
          <span>+10m</span>
        </button>

        <button
          onClick={() => stepDepth(25)}
          className="btn btn-secondary"
          style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem' }}
          title="Simulate drilling forward 25 metres"
        >
          <FastForward size={13} />
          <span>+25m</span>
        </button>
      </div>
    </div>
  );
}
