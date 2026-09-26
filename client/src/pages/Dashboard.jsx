import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Header from '../components/Header';
import WellSelector from '../components/WellSelector';
import RadiusSlider from '../components/RadiusSlider';
import DepthSimulator from '../components/DepthSimulator';
import MapView from '../components/MapView';
import AlertPanel from '../components/AlertPanel';
import RiskAnalyticsView from '../components/RiskAnalyticsView';
import SearchBox from '../components/SearchBox';
import EvidenceModal from '../components/EvidenceModal';
import DocumentUploadModal from '../components/DocumentUploadModal';
import NewWellPlanningView from '../components/NewWellPlanningView';

export default function Dashboard() {
  const [activeMode, setActiveMode] = useState('monitor'); // 'monitor' | 'prognosis'
  const [wells, setWells] = useState([]);
  const [activeWellId, setActiveWellId] = useState(1);
  const [activeWell, setActiveWell] = useState(null);
  const [nearbyWells, setNearbyWells] = useState([]);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [alerts, setAlerts] = useState([]);
  const [riskAnalytics, setRiskAnalytics] = useState([]);
  const [currentFormation, setCurrentFormation] = useState('Hugin');
  const [depthWindow, setDepthWindow] = useState({ start: 2900, end: 3000 });
  const [currentDepth, setCurrentDepth] = useState(2950);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAlertsCollapsed, setIsAlertsCollapsed] = useState(false);

  // Modals state
  const [activeEvidence, setActiveEvidence] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // 1. Fetch initial wells on mount
  useEffect(() => {
    async function loadWells() {
      try {
        const res = await api.get('/wells');
        if (res.data.wells && res.data.wells.length > 0) {
          setWells(res.data.wells);
          setActiveWellId(res.data.wells[0].id);
          setActiveWell(res.data.wells[0]);
          setCurrentDepth(res.data.wells[0].current_depth || 2950);
        }
      } catch (err) {
        console.error('Error fetching wells:', err);
      }
    }
    loadWells();
  }, []);

  // 2. Fetch nearby wells and correlation when activeWell or radius changes
  const loadNearbyData = useCallback(async () => {
    if (!activeWell) return;

    try {
      // Nearby wells query via PostGIS ST_DWithin
      const nearbyRes = await api.get(`/wells/nearby?lat=${activeWell.latitude}&lng=${activeWell.longitude}&radius_m=${radiusMeters}`);
      setNearbyWells(nearbyRes.data.wells || []);

      // Correlation & Risk Analytics
      const corrRes = await api.get(`/correlation/${activeWell.id}?depth=${currentDepth}&radius=${radiusMeters}`);
      setRiskAnalytics(corrRes.data.risk_analytics || []);
      setCurrentFormation(corrRes.data.current_formation || activeWell.formation || 'Hugin');
      setDepthWindow(corrRes.data.depth_window || { start: currentDepth - 50, end: currentDepth + 50 });

      // Active Alerts for this well
      const alertsRes = await api.get(`/alerts?well_id=${activeWell.id}`);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error('Error loading nearby correlation data:', err);
    }
  }, [activeWell, radiusMeters, currentDepth]);

  useEffect(() => {
    loadNearbyData();
  }, [loadNearbyData]);

  // Handle well switch
  const handleSelectWell = (id) => {
    setActiveWellId(id);
    const target = wells.find(w => w.id === id);
    if (target) {
      setActiveWell(target);
      setCurrentDepth(target.current_depth || 2900);
    }
  };

  // Handle Depth update via simulator
  const handleUpdateDepth = async (newDepth) => {
    setCurrentDepth(newDepth);
    if (!activeWell) return;

    try {
      const res = await api.post('/depth/update', {
        well_id: activeWell.id,
        depth_m: newDepth,
        depth_window: 50,
        radius_m: radiusMeters
      });

      if (res.data.correlation) {
        setRiskAnalytics(res.data.correlation.risk_analytics || []);
        setCurrentFormation(res.data.correlation.current_formation || currentFormation);
        setDepthWindow(res.data.correlation.depth_window);
      }

      // Refresh alerts list
      const alertsRes = await api.get(`/alerts?well_id=${activeWell.id}`);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error('Error updating depth:', err);
    }
  };

  // Handle alert status update
  const handleUpdateAlertStatus = async (alertId, status) => {
    try {
      await api.patch(`/alerts/${alertId}/status`, { status });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
    } catch (err) {
      console.error('Error updating alert status:', err);
    }
  };

  // Handle engineer feedback logging
  const handleLogFeedback = async (alertId, action) => {
    try {
      await api.post(`/alerts/${alertId}/feedback`, { action });
      alert(`Feedback logged: Alert marked as ${action.toUpperCase()}`);
    } catch (err) {
      console.error('Error logging feedback:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Header
        onOpenUpload={() => setShowUploadModal(true)}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
      />

      {activeMode === 'prognosis' ? (
        <main style={{ flex: 1, padding: '14px 16px' }}>
          <NewWellPlanningView onInspectEvidence={(ev) => setActiveEvidence(ev)} />
        </main>
      ) : (
        /* Main Real-Time Dashboard Layout */
        <main style={{ 
          flex: 1, 
          padding: '14px 16px', 
          display: 'grid', 
          gridTemplateColumns: isAlertsCollapsed ? '360px 1fr 52px' : '360px 1fr 380px', 
          gap: '14px', 
          alignItems: 'stretch',
          transition: 'grid-template-columns 0.25s ease'
        }}>
          
          {/* Left Column: Well Controls, Radius, Depth Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <WellSelector
              wells={wells}
              activeWellId={activeWellId}
              onSelectWell={handleSelectWell}
              wellDetails={activeWell}
            />

            <RadiusSlider
              radiusMeters={radiusMeters}
              onChangeRadius={setRadiusMeters}
              nearbyWellsCount={nearbyWells.length}
            />

            <DepthSimulator
              depth={currentDepth}
              onUpdateDepth={handleUpdateDepth}
              currentFormation={currentFormation}
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
              activeWell={activeWell}
            />
          </div>

          {/* Center Column: Map & RAG Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
            <div style={{ height: '420px' }}>
              <MapView
                activeWell={activeWell}
                nearbyWells={nearbyWells}
                radiusMeters={radiusMeters}
                onSelectWell={handleSelectWell}
              />
            </div>

            <RiskAnalyticsView
              riskAnalytics={riskAnalytics}
              depthWindow={depthWindow}
            />

            <SearchBox
              activeWellId={activeWellId}
              radiusMeters={radiusMeters}
              onInspectEvidence={(ev) => setActiveEvidence(ev)}
            />
          </div>

          {/* Right Column: Proactive Alerts & Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', alignSelf: 'stretch', minHeight: 0 }}>
            <AlertPanel
              alerts={alerts}
              onInspectEvidence={(alert) => setActiveEvidence({
                event_type: alert.event_type,
                offset_well_name: alert.offset_well_name,
                depth: alert.event_depth,
                formation: alert.formation,
                confidence: alert.confidence,
                description: alert.description,
                mitigation: alert.mitigation,
                source_excerpt: alert.source_excerpt,
                needs_review: alert.needs_review
              })}
              onUpdateAlertStatus={handleUpdateAlertStatus}
              onLogFeedback={handleLogFeedback}
              onJumpToHazard={handleUpdateDepth}
              isCollapsed={isAlertsCollapsed}
              onToggleCollapse={() => setIsAlertsCollapsed(prev => !prev)}
            />
          </div>
        </main>
      )}

      {/* Evidence Drill-down Modal */}
      {activeEvidence && (
        <EvidenceModal
          evidence={activeEvidence}
          onClose={() => setActiveEvidence(null)}
        />
      )}

      {/* Document Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          activeWellId={activeWellId}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={() => {
            setShowUploadModal(false);
            loadNearbyData();
          }}
        />
      )}
    </div>
  );
}
