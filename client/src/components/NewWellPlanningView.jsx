import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { 
  Compass, MapPin, Layers, AlertTriangle, ShieldCheck, 
  Clock, FileText, ChevronDown, ChevronUp, Zap, Printer, 
  CheckCircle2, Search, ArrowRight, ShieldAlert, Sparkles,
  Crosshair, Target, LocateFixed, HelpCircle, Activity, Info
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
  const [allFieldWells, setAllFieldWells] = useState([]);
  const [depthApplied, setDepthApplied] = useState(false);
  const [showCasingPoints, setShowCasingPoints] = useState(false);
  const [expandedFailureModes, setExpandedFailureModes] = useState({});

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const rigMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const offsetMarkersLayerRef = useRef(null);

  // Preset location buttons
  const presets = [
    { label: 'Volve Field Center', lat: 58.4419, lng: 1.8847, depth: 3500, name: 'Proposed Well OIL-X1 (Volve Central)' },
    { label: 'West Flank Exploration', lat: 58.4380, lng: 1.8650, depth: 3600, name: 'Proposed Exploration OIL-W2 (West Flank)' },
    { label: 'North Appraisal Step-Out', lat: 58.4750, lng: 1.9200, depth: 3800, name: 'Proposed Appraisal OIL-N3 (North Step-Out)' }
  ];

  // 1. Fetch all field wells once on mount for complete map context
  useEffect(() => {
    async function loadWells() {
      try {
        const res = await api.get('/wells');
        if (res.data?.wells) {
          setAllFieldWells(res.data.wells);
        }
      } catch (err) {
        console.error('Failed to load field wells:', err);
      }
    }
    loadWells();
  }, []);

  // 2. Run Offset Scan & Prognosis API
  const runPrognosisScan = useCallback(async (customLat, customLng, customDepth, customRadius) => {
    const lat = customLat !== undefined ? customLat : latitude;
    const lng = customLng !== undefined ? customLng : longitude;
    const depth = customDepth !== undefined ? customDepth : plannedDepth;
    const radius = customRadius !== undefined ? customRadius : radiusMeters;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/prognosis/scan', {
        latitude: Number(lat),
        longitude: Number(lng),
        planned_depth: Number(depth),
        radius_m: Number(radius),
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
  }, [latitude, longitude, plannedDepth, radiusMeters, wellName]);

  // Initial scan on mount
  useEffect(() => {
    runPrognosisScan(latitude, longitude, plannedDepth, radiusMeters);
  }, []);

  // 3. Initialize Interactive Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 12,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
      }).addTo(map);

      offsetMarkersLayerRef.current = L.layerGroup().addTo(map);

      // Create Draggable Proposed Rig Marker
      const rigIcon = L.divIcon({
        className: 'custom-proposed-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(245, 158, 11, 0.4); animation: rig-pulse 2s infinite;"></div>
            <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #f59e0b; border: 3px solid #ffffff; box-shadow: 0 0 15px #f59e0b; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 14px; line-height: 1;">📍</span>
            </div>
            <div style="position: absolute; bottom: -20px; white-space: nowrap; background: rgba(17, 24, 39, 0.95); border: 1px solid #f59e0b; color: #fbbf24; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,0.6);">
              PROPOSED RIG
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const rigMarker = L.marker([latitude, longitude], {
        icon: rigIcon,
        draggable: true,
        title: 'Proposed Rig Location (Drag to Move)'
      }).addTo(map);

      // Drag event on proposed rig
      rigMarker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        const roundLat = Number(lat.toFixed(5));
        const roundLng = Number(lng.toFixed(5));
        setLatitude(roundLat);
        setLongitude(roundLng);
        setDepthApplied(false);
      });

      rigMarkerRef.current = rigMarker;

      // Click event on map to reposition rig
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const roundLat = Number(lat.toFixed(5));
        const roundLng = Number(lng.toFixed(5));
        setLatitude(roundLat);
        setLongitude(roundLng);
        rigMarker.setLatLng([roundLat, roundLng]);
        setDepthApplied(false);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 4. Update Map when coordinates, radius, or proposed location changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const rigMarker = rigMarkerRef.current;
    if (!map || !rigMarker) return;

    const newPos = [Number(latitude), Number(longitude)];
    rigMarker.setLatLng(newPos);

    // Update radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    radiusCircleRef.current = L.circle(newPos, {
      radius: radiusMeters,
      color: '#f59e0b',
      weight: 1.5,
      fillColor: '#f59e0b',
      fillOpacity: 0.07,
      dashArray: '5, 8'
    }).addTo(map);

  }, [latitude, longitude, radiusMeters]);

  // 5. Update Offset Well Markers on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const offsetLayer = offsetMarkersLayerRef.current;
    if (!map || !offsetLayer) return;

    offsetLayer.clearLayers();

    // Use prognosis.offset_wells if available, fallback to allFieldWells
    const wellsToRender = (prognosis?.offset_wells && prognosis.offset_wells.length > 0)
      ? prognosis.offset_wells
      : allFieldWells;

    wellsToRender.forEach(well => {
      // Find full well coords if not in prognosis item
      const lat = well.latitude || allFieldWells.find(w => w.id === well.id)?.latitude;
      const lng = well.longitude || allFieldWells.find(w => w.id === well.id)?.longitude;
      if (!lat || !lng) return;

      const isInsideRadius = well.distance_m !== undefined ? well.distance_m <= radiusMeters : true;
      const distStr = well.distance_m ? `${(well.distance_m / 1000).toFixed(2)} km` : 'Offset';

      const offsetIcon = L.divIcon({
        className: 'custom-offset-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #111827; border: 2px solid ${isInsideRadius ? '#0ea5e9' : '#6b7280'}; box-shadow: 0 0 8px rgba(14, 165, 233, 0.4); display: flex; align-items: center; justify-content: center;">
              <div style="width: 7px; height: 7px; border-radius: 50%; background: ${isInsideRadius ? '#38bdf8' : '#9ca3af'};"></div>
            </div>
            <div style="position: absolute; top: -18px; white-space: nowrap; background: rgba(17, 24, 39, 0.85); border: 1px solid #1f2937; color: #e5e7eb; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; pointer-events: none;">
              ${well.name}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: offsetIcon });
      marker.bindPopup(`
        <div style="padding: 6px; font-family: sans-serif; min-width: 180px;">
          <div style="font-size: 0.7rem; color: #38bdf8; font-weight: 700; text-transform: uppercase;">Historical Offset Well</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-top: 2px;">${well.name}</div>
          <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 4px;">Target Formation: <strong style="color: #f3f4f6;">${well.formation || 'Hugin'}</strong></div>
          <div style="font-size: 0.75rem; color: #9ca3af;">Total Depth: <strong style="color: #34d399;">${well.current_depth || 'N/A'}m MD</strong></div>
          <div style="font-size: 0.75rem; color: #fbbf24; margin-top: 4px; border-top: 1px solid #374151; padding-top: 4px;">
            Distance to Rig: <strong>${distStr}</strong>
          </div>
        </div>
      `);
      offsetLayer.addLayer(marker);
    });
  }, [prognosis, allFieldWells, radiusMeters]);

  // Recenter map on proposed rig
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 13);
    }
  };

  // Fit bounds to include rig and all offset wells
  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    const points = [[latitude, longitude]];
    if (prognosis?.offset_wells) {
      prognosis.offset_wells.forEach(w => {
        if (w.latitude && w.longitude) points.push([w.latitude, w.longitude]);
      });
    }
    if (points.length > 1) {
      mapInstanceRef.current.fitBounds(points, { padding: [50, 50] });
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 12);
    }
  };

  // Apply preset location
  const handleApplyPreset = (p) => {
    setWellName(p.name);
    setLatitude(p.lat);
    setLongitude(p.lng);
    setPlannedDepth(p.depth);
    setDepthApplied(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([p.lat, p.lng], 13);
    }
    runPrognosisScan(p.lat, p.lng, p.depth, radiusMeters);
  };

  // One-click apply AI recommended depth
  const handleApplyRecommendedDepth = (recDepth) => {
    setPlannedDepth(recDepth);
    setDepthApplied(true);
    runPrognosisScan(latitude, longitude, recDepth, radiusMeters);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      
      {/* ── TOP CONTROL & QUICK ACTIONS PANEL ─────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)' }}>
              <Compass size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.01em' }}>
                New Well Planning & Pre-Spud Complications Prognosis
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                Pin a proposed drilling rig on the map or enter coordinates to correlate offset wells, forecast complications, and determine the optimal target depth.
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>Quick Presets:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handleApplyPreset(p)}
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>📍</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── INTERACTIVE MAP & RIG CONTROLLER SPLIT ────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '16px', alignItems: 'stretch' }}>
          
          {/* LEFT: Leaflet Map Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>
                <Crosshair size={14} />
                <span>INTERACTIVE RIG PINNING: Click anywhere on map or drag the amber pin</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleRecenter}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  title="Recenter on Proposed Rig"
                >
                  <LocateFixed size={12} />
                  <span>Recenter Rig</span>
                </button>
                <button
                  onClick={handleFitBounds}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                  title="Fit All Offsets in View"
                >
                  <Target size={12} />
                  <span>Fit All Offsets</span>
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', height: '360px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.4)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

              {/* Map Floating Legend */}
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 1000, background: 'rgba(17, 24, 39, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid #374151', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }}></div>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>Proposed Rig</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9' }}></div>
                  <span style={{ color: '#9ca3af' }}>Offset Well</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '12px', height: '0px', borderTop: '2px dashed #f59e0b' }}></div>
                  <span style={{ color: '#9ca3af' }}>{(radiusMeters / 1000).toFixed(0)}km Buffer</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Rig Location & Drilling Configuration Inputs */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="#f59e0b" />
                  Proposed Rig Coordinates & Target Parameters
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                  Syncs automatically with map pin movement
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Proposed Well / Rig Identifier
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={wellName}
                  onChange={(e) => setWellName(e.target.value)}
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Coordinates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Latitude (°N)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="input-text mono"
                    value={latitude}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLatitude(val);
                      setDepthApplied(false);
                    }}
                    style={{ color: '#38bdf8', fontWeight: 700 }}
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
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLongitude(val);
                      setDepthApplied(false);
                    }}
                    style={{ color: '#38bdf8', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Radius and Depth Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
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

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600 }}>
                      Planned Depth (m MD)
                    </label>
                    {prognosis?.depth_recommendation && (
                      <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 700 }}>
                        Rec: {prognosis.depth_recommendation.optimal_target_depth}m
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="50"
                    className="input-text mono"
                    value={plannedDepth}
                    onChange={(e) => {
                      setPlannedDepth(Number(e.target.value));
                      setDepthApplied(false);
                    }}
                    style={{ color: '#34d399', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Quick Depth Recommendation Alert Chip */}
              {prognosis?.depth_recommendation && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#34d399" />
                    <span style={{ fontSize: '0.74rem', color: '#a7f3d0' }}>
                      Optimal TD: <strong>{prognosis.depth_recommendation.optimal_target_depth}m MD</strong> ({prognosis.depth_recommendation.reservoir_sweet_spot.formation})
                    </span>
                  </div>
                  <button
                    onClick={() => handleApplyRecommendedDepth(prognosis.depth_recommendation.optimal_target_depth)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.68rem', padding: '3px 8px', borderColor: '#10b981', color: depthApplied ? '#34d399' : '#ffffff' }}
                  >
                    {depthApplied ? '✓ Applied' : 'Apply Depth'}
                  </button>
                </div>
              )}
            </div>

            {/* Run Analysis Button */}
            <button
              onClick={() => runPrognosisScan()}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderColor: '#fbbf24', boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)' }}
            >
              {loading ? <Sparkles size={18} className="animate-spin" /> : <Search size={18} />}
              <span>{loading ? 'Correlating Offset Wells...' : 'Run Offset Prognosis & Predict Hazards'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ── MODEL RESULTS & ENGINEERING DOSSIER ──────────────────────────── */}
      {prognosis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Executive Overview KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            
            {/* KPI 1: Offset Wells */}
            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Offset Wells Correlated</div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f3f4f6', marginTop: '2px' }}>
                {prognosis.offset_wells_found} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>wells</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '4px' }}>
                Within {(prognosis.proposed_well.radius_m / 1000).toFixed(0)} km radius buffer
              </div>
            </div>

            {/* KPI 2: AI Recommended Depth */}
            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Optimal Target Depth (TD)</span>
                <Sparkles size={14} color="#10b981" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                {prognosis.depth_recommendation?.optimal_target_depth || plannedDepth} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>m MD</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0', marginTop: '4px' }}>
                {prognosis.depth_recommendation?.reservoir_sweet_spot?.formation || 'Target'} Reservoir Sweet Spot
              </div>
            </div>

            {/* KPI 3: Historical Complications */}
            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Documented Complications</span>
                <AlertTriangle size={14} color="#ef4444" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                {prognosis.total_historical_complications} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>events</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '4px' }}>
                Mud losses, stuck pipe, kicks & torque spikes
              </div>
            </div>

            {/* KPI 4: Historical NPT Incurred */}
            <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase' }}>Offset NPT Incurred</span>
                <Clock size={14} color="#f59e0b" />
              </div>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                {prognosis.total_npt_hours_logged} <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>hrs</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#fde68a', marginTop: '4px' }}>
                Non-productive recovery time in offsets
              </div>
            </div>
          </div>

          {/* ── SECTION 1: OPTIMAL TARGET DEPTH & CASING PROGRAM RECOMMENDATION ── */}
          {prognosis.depth_recommendation && (
            <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', paddingBottom: '10px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target size={16} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f3f4f6' }}>
                      AI & Geological Target Depth Recommendation & Safe Drilling Window
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
                      Calculated from nearest offset well reservoir horizons, pay thickness, and sub-reservoir overpressure boundaries.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Current Planned: <strong style={{ color: '#fff' }}>{plannedDepth}m</strong></span>
                  <button
                    onClick={() => handleApplyRecommendedDepth(prognosis.depth_recommendation.optimal_target_depth)}
                    className="btn btn-primary"
                    style={{ background: '#10b981', borderColor: '#34d399', fontSize: '0.75rem', padding: '5px 12px' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Apply Optimal TD ({prognosis.depth_recommendation.optimal_target_depth}m)</span>
                  </button>
                </div>
              </div>

              {/* 4 Pillars of Depth Recommendation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Recommended Total Depth (TD)</div>
                  <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                    {prognosis.depth_recommendation.optimal_target_depth}m MD
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6ee7b7', marginTop: '2px' }}>
                    85% pay penetration sweet spot
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Target Reservoir Interval</div>
                  <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                    {prognosis.depth_recommendation.reservoir_sweet_spot.top_depth}m – {prognosis.depth_recommendation.reservoir_sweet_spot.bottom_depth}m
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#7dd3fc', marginTop: '2px' }}>
                    {prognosis.depth_recommendation.reservoir_sweet_spot.formation} ({prognosis.depth_recommendation.reservoir_sweet_spot.net_thickness_m}m thick)
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Intermediate Casing Seat</div>
                  <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                    2,480m MD
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fde68a', marginTop: '2px' }}>
                    Rogaland / Shetland boundary
                  </div>
                </div>

                <div style={{ background: '#111827', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 700 }}>Hazard Limit / Hard Stop</div>
                  <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                    {prognosis.depth_recommendation.hard_stop_depth}m MD
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '2px' }}>
                    Skagerrak 1.50 SG kick risk zone
                  </div>
                </div>
              </div>

              {/* Technical Rationale Description */}
              <div style={{ background: '#0a0e17', border: '1px solid #1f2937', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '0.8rem', color: '#d1d5db', lineHeight: 1.6 }}>
                <strong style={{ color: '#38bdf8' }}>Geological & Drilling Justification: </strong>
                {prognosis.depth_recommendation.rationale}
              </div>

              {/* Recommended Casing Points Table (Collapsible under button) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCasingPoints(!showCasingPoints)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.74rem', padding: '5px 10px', justifyContent: 'space-between', width: '100%', background: '#0a0e17', border: '1px solid #1f2937' }}
                >
                  <span style={{ fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af' }}>
                    Recommended Casing Program & Zonal Isolation Points ({prognosis.depth_recommendation.recommended_casing_points?.length || 3} Strings)
                  </span>
                  {showCasingPoints ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {showCasingPoints && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                    {prognosis.depth_recommendation.recommended_casing_points.map((cp, idx) => (
                      <div key={idx} style={{ background: '#111827', border: '1px solid #273549', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#f3f4f6' }}>{cp.section}</span>
                          <span className="mono" style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem' }}>@{cp.setting_depth_m}m</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '2px' }}>{cp.formation}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '4px', lineHeight: 1.4 }}>{cp.purpose}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SECTION 2: PREDICTED DRILLING HAZARDS & FAILURE MODES MATRIX ── */}
          {prognosis.predicted_failure_modes && (
            <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={16} color="#ffffff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f3f4f6' }}>
                      Predicted Drilling Complications & Failure Modes Matrix
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Quantitative risk probabilities and preventive protocols derived from offset incident frequencies.
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Correlated across <strong>{prognosis.offset_wells.length} offset wells</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                {prognosis.predicted_failure_modes.map((fm) => {
                  const isHigh = fm.probability === 'HIGH';
                  const isMod = fm.probability === 'MODERATE';
                  const badgeColor = isHigh ? '#ef4444' : isMod ? '#f59e0b' : '#10b981';
                  const isExpanded = !!expandedFailureModes[fm.id];

                  return (
                    <div
                      key={fm.id}
                      style={{
                        background: '#111827',
                        border: isHigh ? '1px solid rgba(239, 68, 68, 0.45)' : isMod ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #273549',
                        borderRadius: '10px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative'
                      }}
                    >
                      {/* Card Header (Always Front & Center) */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f3f4f6' }}>
                            {fm.name}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                            📍 {fm.critical_depth_window}
                          </span>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className={`badge ${isHigh ? 'badge-elevated' : isMod ? 'badge-simulated' : 'badge-normal'}`}>
                            {fm.probability} ({fm.probability_pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Probability Progress Bar (Always Front & Center) */}
                      <div style={{ width: '100%', height: '5px', background: '#1f2937', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${fm.probability_pct}%`, height: '100%', background: badgeColor, borderRadius: '3px' }} />
                      </div>

                      {/* Toggle Button for Side Info / Details */}
                      <button
                        type="button"
                        onClick={() => setExpandedFailureModes(prev => ({ ...prev, [fm.id]: !prev[fm.id] }))}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.68rem', padding: '3px 8px', justifyContent: 'space-between', width: '100%', background: '#0a0e17', marginTop: '2px' }}
                      >
                        <span>{isExpanded ? 'Hide Prevention Protocol' : 'Prevention Protocol & Offsets'}</span>
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>

                      {/* Collapsible Details */}
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                          <p style={{ fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.4 }}>
                            {fm.description}
                          </p>

                          {/* Offset Evidence Proof */}
                          <div style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <strong>Offset Record:</strong> {fm.offset_incidents_count} documented incidents in nearby wells.
                          </div>

                          {/* Prevention Protocol */}
                          <div style={{ fontSize: '0.72rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', lineHeight: 1.4 }}>
                            <strong>Required Mitigation:</strong> {fm.prevention_protocol}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {/* ── SECTION 3: STRATIGRAPHIC TIMELINE & PRE-SPUD CHECKLIST ───────── */}
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
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Click to inspect offset events</span>
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
