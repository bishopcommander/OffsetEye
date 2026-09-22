import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({ activeWell, nearbyWells, radiusMeters, onSelectWell }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = activeWell ? activeWell.latitude : 58.4419;
      const initialLng = activeWell ? activeWell.longitude : 1.8847;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Standard OpenStreetMap tiles (no API key requirement, no watermarks)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center, radius circle, and markers when activeWell or nearbyWells change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeWell) return;

    const center = [activeWell.latitude, activeWell.longitude];

    // Pan to active well smoothly
    map.setView(center, radiusMeters > 15000 ? 10 : radiusMeters > 4000 ? 12 : 14);

    // Update or create radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    radiusCircleRef.current = L.circle(center, {
      radius: radiusMeters,
      color: '#0ea5e9',
      weight: 1.5,
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      dashArray: '4, 6'
    }).addTo(map);

    // Clear old markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // Active Well Custom Icon
    const activeIcon = L.divIcon({
      className: 'custom-active-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(14, 165, 233, 0.4); animation: pulse 2s infinite;"></div>
          <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 0 10px #0ea5e9; display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const activeMarker = L.marker(center, { icon: activeIcon });
    activeMarker.bindPopup(`
      <div style="padding: 6px; font-family: sans-serif;">
        <div style="font-size: 0.75rem; color: #38bdf8; font-weight: 700; text-transform: uppercase;">Active Drilling Well</div>
        <div style="font-size: 1rem; font-weight: 800; color: #ffffff; margin-top: 2px;">${activeWell.name}</div>
        <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 4px;">Formation: <strong style="color: #f3f4f6;">${activeWell.formation || 'Hugin'}</strong></div>
        <div style="font-size: 0.8rem; color: #9ca3af;">Depth: <strong style="color: #34d399;">${activeWell.current_depth || 0}m MD</strong></div>
      </div>
    `);
    markersLayerRef.current.addLayer(activeMarker);

    // Offset Wells Icons — with coloured risk flag indicators
    nearbyWells.forEach(well => {
      if (well.id === activeWell.id) return; // Skip active well

      const eventTypes = well.event_types || [];
      const eventCount = well.event_count || 0;

      // Colour map for event types
      const eventColors = {
        mud_loss:     '#f87171', // red
        stuck_pipe:   '#fb923c', // orange
        kick:         '#ec4899', // pink
        overpressure: '#c084fc', // purple
        torque_spike: '#eab308', // yellow
        cementing:    '#38bdf8', // blue
        npt:          '#94a3b8', // slate
        fishing:      '#a3e635', // lime
      };

      // Build small flag dots (up to 4 most significant types)
      const flagDots = eventTypes.slice(0, 4).map(et => {
        const col = eventColors[et] || '#9ca3af';
        return `<div style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 4px ${col};flex-shrink:0;"></div>`;
      }).join('');

      // Outer ring colour: red if any stuck_pipe/kick/mud_loss, amber otherwise, teal if no events
      const hasCritical = eventTypes.some(t => ['mud_loss','stuck_pipe','kick','overpressure'].includes(t));
      const hasModerate = eventTypes.some(t => ['torque_spike','cementing','npt','fishing'].includes(t));
      const ringColor = eventCount === 0 ? '#10b981' : hasCritical ? '#ef4444' : hasModerate ? '#f59e0b' : '#38bdf8';
      const ringGlow  = eventCount === 0 ? '#10b981' : hasCritical ? '#ef4444' : '#f59e0b';

      const offsetIcon = L.divIcon({
        className: 'custom-offset-marker',
        html: `
          <div style="position:relative;width:34px;height:34px;display:flex;align-items:center;justify-content:center;">
            <div style="width:28px;height:28px;border-radius:50%;background:#111827;border:2.5px solid ${ringColor};box-shadow:0 0 8px ${ringGlow}40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;">
              ${eventCount > 0
                ? `<div style="display:flex;gap:2px;flex-wrap:wrap;justify-content:center;padding:3px;">${flagDots}</div>`
                : `<div style="width:6px;height:6px;border-radius:50%;background:${ringColor};"></div>`
              }
            </div>
            ${eventCount > 0 ? `<div style="position:absolute;top:-5px;right:-5px;background:${ringColor};color:#000;font-size:9px;font-weight:800;border-radius:9999px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px;">${eventCount}</div>` : ''}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const offsetMarker = L.marker([well.latitude, well.longitude], { icon: offsetIcon });
      const distStr = well.dist_m ? `${Math.round(well.dist_m)}m` : 'Nearby';

      // Build event-type flag legend for popup
      const eventLegend = eventTypes.length > 0
        ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${
            eventTypes.map(et => {
              const col = eventColors[et] || '#9ca3af';
              return `<span style="background:${col}20;color:${col};border:1px solid ${col}60;border-radius:4px;font-size:0.65rem;font-weight:700;padding:1px 5px;text-transform:uppercase;">${et.replace('_',' ')}</span>`;
            }).join('')
          }</div>`
        : '<div style="font-size:0.72rem;color:#9ca3af;margin-top:4px;">No events logged</div>';

      offsetMarker.bindPopup(`
        <div style="padding: 6px; font-family: sans-serif;">
          <div style="font-size: 0.72rem; color: #9ca3af; font-weight: 600;">Offset Well (${distStr} offset)</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #ffffff; margin-top: 2px;">${well.name}</div>
          <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 4px;">Target: <strong style="color:#f3f4f6;">${well.formation || 'Hugin'}</strong> &nbsp;|&nbsp; TD: <strong style="color:#34d399;">${well.current_depth || 0}m</strong></div>
          <div style="font-size:0.75rem;color:${ringColor};font-weight:700;margin-top:4px;">${eventCount} historical event${eventCount === 1 ? '' : 's'} logged</div>
          ${eventLegend}
          <button id="select-well-${well.id}" style="margin-top: 8px; background: #0284c7; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; width: 100%;">
            Set as Active Well
          </button>
        </div>
      `);

      offsetMarker.on('popupopen', () => {
        const btn = document.getElementById(`select-well-${well.id}`);
        if (btn) {
          btn.onclick = () => onSelectWell(well.id);
        }
      });

      markersLayerRef.current.addLayer(offsetMarker);
    });

  }, [activeWell, nearbyWells, radiusMeters, onSelectWell]);

  return (
    <div className="glass-panel" style={{ height: '100%', minHeight: '380px', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map Legend Overlay */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(17, 24, 39, 0.92)', backdropFilter: 'blur(8px)', padding: '8px 12px', borderRadius: '8px', border: '1px solid #374151', fontSize: '0.72rem', display: 'flex', gap: '12px', zIndex: 500, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0284c7', border: '2.5px solid white', boxShadow: '0 0 6px #0ea5e9' }} />
          <span>Active Rig</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#111827', border: '2.5px solid #ef4444', boxShadow: '0 0 5px #ef444440' }} />
          <span style={{ color: '#fca5a5' }}>Critical Events</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#111827', border: '2.5px solid #f59e0b' }} />
          <span style={{ color: '#fde68a' }}>Moderate Events</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#111827', border: '2.5px solid #10b981' }} />
          <span style={{ color: '#a7f3d0' }}>Clean Well</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '0px', borderTop: '2px dashed #0ea5e9' }} />
          <span>Radius Buffer</span>
        </div>
      </div>
    </div>
  );
}
