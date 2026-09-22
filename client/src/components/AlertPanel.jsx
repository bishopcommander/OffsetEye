import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';

export default function AlertPanel({ alerts, onInspectEvidence, onUpdateAlertStatus, onLogFeedback, onJumpToHazard }) {
  const [filter, setFilter] = useState('open'); // 'open' | 'all'

  const displayedAlerts = filter === 'open' 
    ? alerts.filter(a => a.status === 'open')
    : alerts;

  const openCount = alerts.filter(a => a.status === 'open').length;

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={18} color="#ef4444" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3f4f6' }}>
            Active Proactive Alerts
          </h2>
        </div>
        <span className={`badge ${openCount > 0 ? 'badge-elevated' : 'badge-normal'}`}>
          {openCount} Open Hazard{openCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: '6px', background: '#0a0e17', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
        <button
          onClick={() => setFilter('open')}
          className={`btn ${filter === 'open' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.72rem' }}
        >
          Open Alerts ({openCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '4px 8px', fontSize: '0.72rem' }}
        >
          All Well Alerts ({alerts.length})
        </button>
      </div>

      {displayedAlerts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 10px', color: '#6b7280', textAlign: 'center', gap: '10px' }}>
          <CheckCircle size={32} color="#10b981" />
          <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
            {filter === 'open' ? 'No open alerts at current depth' : 'No alerts recorded for this well yet'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '280px' }}>
            Deterministic correlation evaluates offset wells within the active depth window.
          </div>
          {onJumpToHazard && (
            <button
              onClick={() => onJumpToHazard(2930)}
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '6px 12px', marginTop: '6px', border: '1px dashed #06b6d4' }}
            >
              <Zap size={13} color="#06b6d4" />
              <span>Jump to 2930m (Hugin Mud Loss Hazard)</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
          {displayedAlerts.map(alert => {
            const isOpen = alert.status === 'open';
            return (
              <div
                key={alert.id}
                style={{
                  background: isOpen ? 'rgba(239, 68, 68, 0.08)' : 'rgba(31, 41, 55, 0.5)',
                  border: isOpen ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #374151',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Alert Top Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge event-${alert.event_type || 'mud_loss'}`}>
                      {(alert.event_type || 'Risk').replace('_', ' ')}
                    </span>
                    {alert.needs_review && (
                      <span className="badge badge-review" title="Flagged low confidence / unverified excerpt">
                        ⚠️ Needs Review
                      </span>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    Trigger @ {alert.depth_at_trigger?.toFixed(0) || alert.event_depth || 0}m MD
                  </span>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.8rem', color: '#e5e7eb', lineHeight: 1.4 }}>
                  {alert.description || 'Historical offset well hazard identified within correlation window.'}
                </p>

                {/* Offset Source Tag */}
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Offset: <strong style={{ color: '#38bdf8' }}>{alert.offset_well_name || 'Offset Well'}</strong> ({alert.event_depth}m)</span>
                  <span>Formation: <strong style={{ color: '#f3f4f6' }}>{alert.formation || 'Hugin'}</strong></span>
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(75, 85, 99, 0.3)', paddingTop: '8px', marginTop: '2px' }}>
                  <button
                    onClick={() => onInspectEvidence(alert)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                  >
                    <Eye size={13} color="#06b6d4" />
                    <span>View Evidence</span>
                  </button>

                  {/* Engineer Feedback & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => onLogFeedback(alert.id, 'confirmed')}
                      className="btn btn-secondary"
                      title="Confirm this hazard applies to current operation"
                      style={{ padding: '4px 6px' }}
                    >
                      <ThumbsUp size={12} color="#10b981" />
                    </button>
                    <button
                      onClick={() => onLogFeedback(alert.id, 'overridden')}
                      className="btn btn-secondary"
                      title="Override: Hazard mitigated or not applicable"
                      style={{ padding: '4px 6px' }}
                    >
                      <ThumbsDown size={12} color="#f59e0b" />
                    </button>
                    <button
                      onClick={() => onUpdateAlertStatus(alert.id, isOpen ? 'acknowledged' : 'open')}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                    >
                      {isOpen ? 'Acknowledge' : 'Reopen'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
