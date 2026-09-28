import React, { useState } from 'react';
import { BarChart3, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

export default function RiskAnalyticsView({ riskAnalytics, depthWindow }) {
  const [showMethodology, setShowMethodology] = useState(false);

  if (!riskAnalytics || riskAnalytics.length === 0) {
    return null;
  }

  const categoryLabels = {
    mud_loss: 'Mud loss',
    stuck_pipe: 'Stuck pipe',
    overpressure: 'Overpressure',
    torque_spike: 'Torque spikes',
    cementing: 'Cementing',
    kick: 'Well kick',
    fishing: 'Fishing operations',
    npt: 'NPT events'
  };
  const elevatedRisks = riskAnalytics.filter(item => item.flag === 'elevated');
  const normalRisks = riskAnalytics.filter(item => item.flag !== 'elevated');
  const normalHistory = normalRisks.filter(item => item.matched_count === 0);
  const belowThreshold = normalRisks.filter(item => item.matched_count > 0);
  const normalSummary = [
    normalHistory.length > 0 && `No nearby history for ${normalHistory.map(item => (categoryLabels[item.risk_category] || item.risk_category).toLowerCase()).join(', ')}.`,
    ...belowThreshold.map(item => {
      const count = item.matched_count;
      const label = (categoryLabels[item.risk_category] || item.risk_category).toLowerCase();
      return `${count} ${label} event${count === 1 ? '' : 's'} recorded below the alert threshold.`;
    }),
    normalRisks.length > 0 && 'All other categories normal.'
  ].filter(Boolean).join(' ');
  const normalCounts = normalRisks.map(item => {
    const label = categoryLabels[item.risk_category] || item.risk_category;
    return `${label}: ${item.matched_count} events across ${item.affected_wells_count || 0}/${item.total_nearby_wells || 0} wells`;
  }).join('\n');

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={16} color="var(--accent-brand)" />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700,  color: 'var(--text-muted)' }}>
            Risk signals from nearby wells
          </h2>
        </div>
        {depthWindow && (
          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-brand)', fontWeight: 600 }}>
            Window: ±50m ({depthWindow.start?.toFixed(0)} - {depthWindow.end?.toFixed(0)}m MD)
          </span>
        )}
      </div>

      {elevatedRisks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
          {elevatedRisks.map(item => {
          const label = categoryLabels[item.risk_category] || item.risk_category;

          return (
            <div
              key={item.risk_category}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                borderLeft: '3px solid var(--status-caution)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span className="badge badge-elevated" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  {item.flag}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-caution)' }}>
                  {item.affected_wells_count || 0} of {item.total_nearby_wells || 0}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }} title={`${item.matched_count} matched events`}>
                  nearby wells
                </span>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {normalRisks.length > 0 && (
        <div title={normalCounts} style={{ background: 'var(--bg-page)', borderRadius: '6px', padding: '8px 10px', color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.5 }}>
          {normalSummary}
        </div>
      )}

      {/* Button for Side Info (Methodology & Logic) */}
      <button
        type="button"
        onClick={() => setShowMethodology(!showMethodology)}
        className="btn btn-secondary"
        style={{ padding: '3px 8px', fontSize: '0.68rem', justifyContent: 'space-between', width: 'fit-content' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={11} color="var(--accent-brand)" /> Correlation Logic & Rules
        </span>
        {showMethodology ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {/* Collapsible Methodology Panel */}
      {showMethodology && (
        <div style={{ background: 'var(--bg-page)', padding: '8px 10px', borderRadius: '6px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Deterministic Aggregation:</strong> Flags as <span style={{ color: 'var(--status-caution)' }}>elevated</span> if ≥1 offset well encountered the incident within the active correlation depth window (±50m) and matched lithology/formation synonym. No black-box model is used for alert gating.
        </div>
      )}
    </div>
  );
}

