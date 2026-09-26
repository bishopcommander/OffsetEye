import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, ThumbsUp, ThumbsDown, Zap, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AlertPanel({ 
  alerts, 
  onInspectEvidence, 
  onUpdateAlertStatus, 
  onLogFeedback, 
  onJumpToHazard,
  isCollapsed = false,
  onToggleCollapse 
}) {
  const [filter, setFilter] = useState('open'); // 'open' | 'all'
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [compactCards, setCompactCards] = useState(false);

  const displayedAlerts = filter === 'open' 
    ? alerts.filter(a => a.status === 'open')
    : alerts;

  const openCount = alerts.filter(a => a.status === 'open').length;

  // Collapsed Sidebar Rail View
  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="glass-panel"
        style={{
          padding: '14px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          height: '100%',
          cursor: 'pointer',
          border: openCount > 0 ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border-subtle)',
          background: openCount > 0 ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-card)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          boxShadow: openCount > 0 ? '0 0 14px rgba(239, 68, 68, 0.2)' : 'none'
        }}
        title="Click to expand Active Alerts Panel"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCollapse && onToggleCollapse(); }}
          className="btn btn-secondary"
          style={{ padding: '6px', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Expand Active Alerts"
        >
          <ChevronLeft size={16} color="#06b6d4" />
        </button>

        <div style={{ position: 'relative', marginTop: '6px' }}>
          <AlertTriangle size={20} color={openCount > 0 ? '#ef4444' : '#9ca3af'} />
          {openCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-8px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '999px',
                lineHeight: 1
              }}
            >
              {openCount > 999 ? '999+' : openCount}
            </span>
          )}
        </div>

        {/* Vertical Text Label */}
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '0.74rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: openCount > 0 ? '#fca5a5' : '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <span>Active Alerts</span>
          <span style={{ color: '#06b6d4', fontWeight: 600 }}>({openCount})</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={18} color="#ef4444" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3f4f6' }}>
            Active Proactive Alerts
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`badge ${openCount > 0 ? 'badge-elevated' : 'badge-normal'}`}>
            {openCount} Open Hazard{openCount === 1 ? '' : 's'}
          </span>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="btn btn-secondary"
              style={{ padding: '4px 6px', borderRadius: '6px', color: '#9ca3af', border: '1px solid #374151' }}
              title="Collapse Alerts Panel"
            >
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Filter & Density Toggle */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1, gap: '4px', background: '#0a0e17', padding: '3px', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <button
            onClick={() => setFilter('open')}
            className={`btn ${filter === 'open' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
          >
            All ({alerts.length})
          </button>
        </div>
        <button
          onClick={() => setCompactCards(prev => !prev)}
          className={`btn ${compactCards ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '5px 8px', fontSize: '0.7rem', whiteSpace: 'nowrap' }}
          title={compactCards ? "Switch to detailed cards" : "Collapse card descriptions"}
        >
          {compactCards ? "Expanded" : "Compact"}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px' }}>
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

                {/* Description (collapsible via compact mode) */}
                {!compactCards && (
                  <p style={{ fontSize: '0.8rem', color: '#e5e7eb', lineHeight: 1.4 }}>
                    {alert.description || 'Historical offset well hazard identified within correlation window.'}
                  </p>
                )}

                {/* Offset Source Tag */}
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Offset: <strong style={{ color: '#38bdf8' }}>{alert.offset_well_name || 'Offset Well'}</strong> ({alert.event_depth}m)</span>
                  <span>Formation: <strong style={{ color: '#f3f4f6' }}>{alert.formation || 'Hugin'}</strong></span>
                </div>

                {/* Toggle Button for Side Info / Mitigation / Actions */}
                <button
                  type="button"
                  onClick={() => setExpandedAlerts(prev => ({ ...prev, [alert.id]: !prev[alert.id] }))}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', justifyContent: 'space-between', width: '100%', background: '#0a0e17' }}
                >
                  <span>{expandedAlerts[alert.id] ? 'Hide Technical Actions' : 'Technical Mitigation & Actions'}</span>
                  {expandedAlerts[alert.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Collapsible Section (Mitigation, Excerpt, Actions) */}
                {expandedAlerts[alert.id] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(75, 85, 99, 0.3)', paddingTop: '8px', marginTop: '2px' }}>
                    {alert.mitigation && (
                      <div style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', lineHeight: 1.4 }}>
                        <strong>Proven Mitigation:</strong> {alert.mitigation}
                      </div>
                    )}

                    {alert.source_excerpt && (
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', fontStyle: 'italic', background: '#0a0e17', padding: '5px 8px', borderRadius: '4px', border: '1px solid #1f2937', lineHeight: 1.4 }}>
                        "{alert.source_excerpt}"
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
                      <button
                        onClick={() => onInspectEvidence(alert)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                      >
                        <Eye size={12} color="#06b6d4" />
                        <span>View Evidence</span>
                      </button>

                      {/* Engineer Feedback & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => onLogFeedback(alert.id, 'confirmed')}
                          className="btn btn-secondary"
                          title="Confirm this hazard applies to current operation"
                          style={{ padding: '3px 6px' }}
                        >
                          <ThumbsUp size={11} color="#10b981" />
                        </button>
                        <button
                          onClick={() => onLogFeedback(alert.id, 'overridden')}
                          className="btn btn-secondary"
                          title="Override: Hazard mitigated or not applicable"
                          style={{ padding: '3px 6px' }}
                        >
                          <ThumbsDown size={11} color="#f59e0b" />
                        </button>
                        <button
                          onClick={() => onUpdateAlertStatus(alert.id, isOpen ? 'acknowledged' : 'open')}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                        >
                          {isOpen ? 'Acknowledge' : 'Reopen'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
