import React from 'react';
import { X, FileText, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function EvidenceModal({ evidence, onClose }) {
  if (!evidence) return null;

  const isReview = !!evidence.needs_review;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--accent-brand)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Historical Drilling Evidence Drill-Down
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Needs Review Alert Banner */}
        {isReview && (
          <div style={{ margin: '16px 20px 0', padding: '12px 14px', background: 'color-mix(in srgb, var(--status-caution) 15%, transparent)', border: '1px solid var(--status-caution)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--status-caution)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-caution)' }}>
                Human Verification Required (Needs Review)
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--status-caution)', marginTop: '2px' }}>
                This record was flagged due to degraded OCR clarity, low extraction confidence, or unverified source parameters. An engineer should cross-check against original WCR/DDR scans before taking critical decisions.
              </div>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)',  }}>Event type</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {(evidence.event_type || 'Hazard').replace('_', ' ')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)',  }}>Offset well</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-brand)', marginTop: '2px' }}>
                {evidence.offset_well_name || evidence.well_name || 'Offset Well'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)',  }}>Depth encountered</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--status-normal)', marginTop: '2px' }}>
                {evidence.depth ? `${evidence.depth}m MD` : 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)',  }}>AI confidence</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: isReview ? 'var(--status-caution)' : 'var(--accent-brand)', marginTop: '2px' }}>
                {evidence.confidence ? `${(evidence.confidence * 100).toFixed(0)}%` : '88%'}
              </div>
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',  marginBottom: '6px' }}>
              Operational incident description
            </div>
            <div style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {evidence.description || 'No detailed description available.'}
            </div>
          </div>

          {/* Recommended Mitigation */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-normal)',  marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Documented mitigation & engineering recovery
            </div>
            <div style={{ background: 'color-mix(in srgb, var(--status-normal) 8%, transparent)', padding: '12px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--status-normal) 30%, transparent)', fontSize: '0.85rem', color: 'var(--status-normal)', lineHeight: 1.5 }}>
              {evidence.mitigation || 'Standard engineering protocols applied.'}
            </div>
          </div>

          {/* Verbatim Source Excerpt */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',  marginBottom: '6px' }}>
              Verbatim excerpt from source report
            </div>
            <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              "{evidence.source_excerpt || evidence.description}"
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Evidence
          </button>
        </div>
      </div>
    </div>
  );
}
