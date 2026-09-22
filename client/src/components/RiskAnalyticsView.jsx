import React from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';

export default function RiskAnalyticsView({ riskAnalytics, depthWindow }) {
  if (!riskAnalytics || riskAnalytics.length === 0) {
    return null;
  }

  const categoryLabels = {
    mud_loss: 'Mud Loss',
    stuck_pipe: 'Stuck Pipe',
    overpressure: 'Overpressure',
    torque_spike: 'Torque Spikes',
    cementing: 'Cementing',
    kick: 'Well Kick',
    fishing: 'Fishing Ops',
    npt: 'NPT Events'
  };

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={16} color="#06b6d4" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>
            Risk Analytics Signal (Offset Frequency)
          </h2>
        </div>
        {depthWindow && (
          <span className="mono" style={{ fontSize: '0.72rem', color: '#6b7280' }}>
            Window: ±50m ({depthWindow.start?.toFixed(0)} - {depthWindow.end?.toFixed(0)}m MD)
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
        {riskAnalytics.map(item => {
          const isElevated = item.flag === 'elevated';
          const label = categoryLabels[item.risk_category] || item.risk_category;

          return (
            <div
              key={item.risk_category}
              style={{
                background: isElevated ? 'rgba(239, 68, 68, 0.1)' : '#111827',
                border: isElevated ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1f2937',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isElevated ? '#fca5a5' : '#9ca3af' }}>
                  {label}
                </span>
                <span className={`badge ${isElevated ? 'badge-elevated' : 'badge-normal'}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  {item.flag}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: isElevated ? '#f87171' : '#f3f4f6' }}>
                  {item.matched_count}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                  in {item.affected_wells_count || 0}/{item.total_nearby_wells || 0} wells
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
