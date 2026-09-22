import React, { useState, useEffect } from 'react';
import { 
  Compass, MapPin, Layers, AlertTriangle, ShieldCheck, 
  Clock, FileText, ChevronDown, ChevronUp, Zap, Printer, 
  CheckCircle2, Search, ArrowRight, ShieldAlert, Sparkles 
} from 'lucide-react';
import api from '../services/api';

export default function NewWellPlanningView({ onInspectEvidence }) {
  const [wellName, setWellName] = useState('Proposed Well OIL-X1 (Volve Appraisal)');
  const [latitude, setLatitude] = useState(58.445);
  const [longitude, setLongitude] = useState(1.890);
  const [plannedDepth, setPlannedDepth] = useState(3500);
  const [radiusMeters, setRadiusMeters] = useState(15000);
  
  const [loading, setLoading] = useState(false);
  const [prognosis, setPrognosis] = useState(null);
  const [error, setError] = useState(null);
  const [expandedZone, setExpandedZone] = useState(null);

  // Preset location buttons
  const presets = [
    { label: 'Volve Field Center', lat: 58.445, lng: 1.890, depth: 3500, name: 'Proposed Well OIL-X1 (Volve Central)' },
    { label: 'West Flank Exploration', lat: 58.440, lng: 1.870, depth: 3600, name: 'Proposed Exploration OIL-W2 (West Flank)' },
    { label: 'North Appraisal Step-Out', lat: 58.480, lng: 1.930, depth: 3800, name: 'Proposed Appraisal OIL-N3 (North Step-Out)' }
  ];

  const handleApplyPreset = (p) => {
    setWellName(p.name);
    setLatitude(p.lat);
    setLongitude(p.lng);
    setPlannedDepth(p.depth);
  };

  const runPrognosisScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/prognosis/scan', {
        latitude: Number(latitude),
        longitude: Number(longitude),
        planned_depth: Number(plannedDepth),
        radius_m: Number(radiusMeters),
        well_name: wellName
      });
      setPrognosis(res.data);
      // Auto-expand the highest risk zone
      if (res.data.stratigraphic_hazard_timeline) {
        const highRisk = res.data.stratigraphic_hazard_timeline.find(z => z.risk_level === 'HIGH');
        if (highRisk) setExpandedZone(highRisk.formation);
      }
    } catch (err) {
      console.error('Prognosis scan error:', err);
      setError(err.response?.data?.details || err.response?.data?.error || 'Failed to generate prognosis');
    } finally {
      setLoading(false);
    }
  };

  // Run initial scan on mount
  useEffect(() => {
    runPrognosisScan();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Top Configuration & Control Panel */}
      <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Compass size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                New Well Planning & Offset Complications Prognosis
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Pre-Spud Offset Intelligence: Scans surrounding wells to predict drilling hazards, NPT risks, and required mitigations.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handleApplyPreset(p)}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px 10px' }}
              >
                📍 {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Proposed Well Name
            </label>
            <input
              type="text"
              className="input-text"
              value={wellName}
              onChange={(e) => setWellName(e.target.value)}
              style={{ fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Latitude (°N)
            </label>
            <input
              type="number"
              step="0.0001"
              className="input-text mono"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Longitude (°E)
            </label>
            <input
              type="number"
              step="0.0001"
              className="input-text mono"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Target Depth (m MD)
            </label>
            <input
              type="number"
              step="50"
              className="input-text mono"
              value={plannedDepth}
              onChange={(e) => setPlannedDepth(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Offset Scan Radius
            </label>
            <select
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="select-input"
            >
              <option value="5000">5 km (Direct Offsets)</option>
              <option value="15000">15 km (Field-Wide)</option>
              <option value="25000">25 km (Regional Basin)</option>
              <option value="50000">50 km (Extended Analogues)</option>
            </select>
          </div>

          <button
            onClick={runPrognosisScan}
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '8px 18px', height: '38px', minWidth: '130px' }}
          >
            {loading ? <Sparkles size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{loading ? 'Scanning...' : 'Scan Offsets'}</span>
          </button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* Results Dossier */}
      {prognosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Executive Overview KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Offset Wells in Buffer</div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f3f4f6', marginTop: '2px' }}>
                {prognosis.offset_wells_found} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>wells</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '4px' }}>
                Within {(prognosis.proposed_well.radius_m / 1000).toFixed(0)} km search radius
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Historical Complications</span>
                <AlertTriangle size={14} color="#ef4444" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                {prognosis.total_historical_complications} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>events</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '4px' }}>
                Mud losses, stuck pipe, kicks & torque spikes
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Historical NPT Incurred</span>
                <Clock size={14} color="#f59e0b" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                {prognosis.total_npt_hours_logged} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>hrs</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fde68a', marginTop: '4px' }}>
                Rig non-productive recovery time in offsets
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Actionable Protocols</span>
                <ShieldCheck size={14} color="#10b981" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                {prognosis.lessons_learned?.length || 4} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>safeguards</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0', marginTop: '4px' }}>
                Engineering mitigations ready for pre-spud
              </div>
            </div>
          </div>

          {/* Executive Summary Callout */}
          <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> Executive Geological & Risk Forecast
            </div>
            <p style={{ fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.6 }}>
              {prognosis.summary}
            </p>
          </div>

          {/* Main 2-Column: Stratigraphic Hazard Timeline (Left) & Pre-Spud Checklist (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', alignItems: 'start' }}>
            
            {/* Stratigraphic Depth-by-Depth Hazard Column */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={18} color="#06b6d4" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    Stratigraphic Hazard Timeline (Surface to {prognosis.proposed_well.planned_depth}m TD)
                  </h3>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Click any section to inspect offset complications</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {prognosis.stratigraphic_hazard_timeline.map((zone, idx) => {
                  const isExpanded = expandedZone === zone.formation;
                  const isHigh = zone.risk_level === 'HIGH';
                  const isMod = zone.risk_level === 'MODERATE';

                  return (
                    <div
                      key={idx}
                      style={{
                        background: isExpanded ? 'rgba(31, 41, 55, 0.8)' : '#111827',
                        border: isHigh ? '1px solid rgba(239, 68, 68, 0.5)' : isMod ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1f2937',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Zone Header Bar */}
                      <div
                        onClick={() => setExpandedZone(isExpanded ? null : zone.formation)}
                        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, minWidth: '120px' }}>
                            {zone.interval}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6' }}>
                              {zone.formation}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                              {zone.lithology}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`badge ${isHigh ? 'badge-elevated' : isMod ? 'badge-simulated' : 'badge-normal'}`}>
                            {zone.risk_level} RISK
                          </span>

                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', background: '#0a0e17', padding: '3px 8px', borderRadius: '4px', border: '1px solid #1f2937' }}>
                            {zone.complications_count} event{zone.complications_count === 1 ? '' : 's'}
                          </span>

                          {isExpanded ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                        </div>
                      </div>

                      {/* Expanded Section Details */}
                      {isExpanded && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1f2937', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Primary Formation Hazards */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                              Primary Geological & Operational Hazards
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {zone.primary_hazards?.map((h, i) => (
                                <span key={i} style={{ fontSize: '0.72rem', background: '#0a0e17', color: '#e5e7eb', padding: '3px 8px', borderRadius: '4px', border: '1px solid #374151' }}>
                                  ⚠️ {h}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Historical Complications List */}
                          {zone.historical_complications?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                                Documented Incidents in Nearby Offset Wells ({zone.historical_complications.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {zone.historical_complications.map((c, i) => (
                                  <div
                                    key={i}
                                    style={{ background: '#0a0e17', border: '1px solid #273549', borderRadius: '8px', padding: '10px 12px', fontSize: '0.78rem' }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className={`badge event-${c.event_type}`}>
                                          {c.event_type.replace('_', ' ')}
                                        </span>
                                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                                          Well {c.well_name} ({c.distance_m ? `${Math.round(c.distance_m)}m offset` : 'Offset'})
                                        </span>
                                      </div>
                                      <span className="mono" style={{ color: '#34d399', fontWeight: 600 }}>
                                        @{c.depth}m MD
                                      </span>
                                    </div>

                                    <div style={{ color: '#d1d5db', lineHeight: 1.4, marginBottom: '6px' }}>
                                      {c.description}
                                    </div>

                                    {c.mitigation && (
                                      <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.72rem' }}>
                                        <strong>Offset Mitigation:</strong> {c.mitigation}
                                      </div>
                                    )}

                                    {c.source_excerpt && (
                                      <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '0.68rem', marginTop: '4px' }}>
                                        Report Log: "{c.source_excerpt}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recommended Section Mitigations */}
                          {zone.recommended_mitigations?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Synthesized Mitigations for this Section
                              </div>
                              <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: '#a7f3d0', lineHeight: 1.5 }}>
                                {zone.recommended_mitigations.map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pre-Spud Actionable Engineering Checklist (Right Column) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={18} color="#f59e0b" />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      Pre-Spud Safeguards & Lessons Learned
                    </h3>
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                    title="Print Dossier"
                  >
                    <Printer size={13} />
                    <span>Print Dossier</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {prognosis.lessons_learned?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#111827',
                        border: item.severity === 'CRITICAL' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #273549',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f3f4f6' }}>
                          {item.title}
                        </span>
                        <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-elevated' : 'badge-simulated'}`} style={{ fontSize: '0.6rem' }}>
                          {item.severity}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.4 }}>
                        <strong>Historical Finding:</strong> {item.finding}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(14, 165, 233, 0.08)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.25)', lineHeight: 1.4 }}>
                        <strong>Pre-Spud Action:</strong> {item.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Offset Wells Directory */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                  Nearby Offset Wells Correlated ({prognosis.offset_wells.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {prognosis.offset_wells.map(w => (
                    <div
                      key={w.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0a0e17', borderRadius: '6px', border: '1px solid #1f2937', fontSize: '0.75rem' }}
                    >
                      <div>
                        <strong style={{ color: '#f3f4f6' }}>{w.name}</strong>
                        <span style={{ color: '#6b7280', marginLeft: '6px' }}>({w.formation || 'Volve'})</span>
                      </div>
                      <div className="mono" style={{ color: '#0ea5e9', fontWeight: 600 }}>
                        {w.distance_m ? `${(w.distance_m / 1000).toFixed(2)} km offset` : 'Center'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
