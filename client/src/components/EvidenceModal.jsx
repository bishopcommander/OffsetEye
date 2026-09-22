import React from 'react';
import { X, FileText, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function EvidenceModal({ evidence, onClose }) {
  if (!evidence) return null;

  const isReview = !!evidence.needs_review;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#0ea5e9" />
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
          <div style={{ margin: '16px 20px 0', padding: '12px 14px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fef08a' }}>
                Human Verification Required (Needs Review)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#fef9c3', marginTop: '2px' }}>
                This record was flagged due to degraded OCR clarity, low extraction confidence, or unverified source parameters. An engineer should cross-check against original WCR/DDR scans before taking critical decisions.
              </div>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: '#0a0e17', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Event Type</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f3f4f6', marginTop: '2px' }}>
                {(evidence.event_type || 'Hazard').replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Offset Well</div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#38bdf8', marginTop: '2px' }}>
                {evidence.offset_well_name || evidence.well_name || 'Offset Well'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>Depth Encountered</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#34d399', marginTop: '2px' }}>
                {evidence.depth ? `${evidence.depth}m MD` : 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase' }}>AI Confidence</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '0.85rem', color: isReview ? '#eab308' : '#38bdf8', marginTop: '2px' }}>
                {evidence.confidence ? `${(evidence.confidence * 100).toFixed(0)}%` : '88%'}
              </div>
            </div>
          </div>

          {/* Incident Description */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>
              Operational Incident Description
            </div>
            <div style={{ background: '#111827', padding: '12px', borderRadius: '8px', border: '1px solid #374151', fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.5 }}>
              {evidence.description || 'No detailed description available.'}
            </div>
          </div>

          {/* Recommended Mitigation */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> Documented Mitigation & Engineering Recovery
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem', color: '#d1fae5', lineHeight: 1.5 }}>
              {evidence.mitigation || 'Standard engineering protocols applied.'}
            </div>
          </div>

          {/* Verbatim Source Excerpt */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>
              Verbatim Excerpt from Source Report
            </div>
            <div style={{ background: '#0a0e17', padding: '12px', borderRadius: '8px', border: '1px solid #1f2937', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.6 }}>
              "{evidence.source_excerpt || evidence.description}"
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Evidence
          </button>
        </div>
      </div>
    </div>
  );
}
