import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const paletteColor = token => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

const focusMapIfNeeded = (map, center, targetZoom) => {
  if (!map || !center) return;

  const currentCenter = map.getCenter();
  const distanceMeters = L.latLng(center[0], center[1]).distanceTo(currentCenter);
  const shouldFocus = distanceMeters > 60000 || map.getZoom() < targetZoom - 1;

  if (shouldFocus) {
    map.flyTo(center, targetZoom, {
      animate: true,
      duration: 1.3,
      easeLinearity: 0.3
    });
  } else {
    map.setView(center, targetZoom, { animate: true, duration: 0.6 });
  }
};

export default function MapView({ activeWell, nearbyWells, radiusMeters, onSelectWell }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const staticWellLayerRef = useRef(null);
  const activeWellLayerRef = useRef(null);

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

      staticWellLayerRef.current = L.layerGroup().addTo(map);
      activeWellLayerRef.current = L.layerGroup().addTo(map);
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
    const brandColor = paletteColor('--accent-brand');
    const normalColor = paletteColor('--status-normal');
    const cautionColor = paletteColor('--status-caution');
    const panelColor = paletteColor('--bg-panel');
    const textColor = paletteColor('--text-primary');
    const mutedColor = paletteColor('--text-muted');

    const targetZoom = radiusMeters > 15000 ? 10 : radiusMeters > 4000 ? 12 : 14;
    focusMapIfNeeded(map, center, targetZoom);

    // Update or create radius circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.remove();
    }
    radiusCircleRef.current = L.circle(center, {
      radius: radiusMeters,
      color: brandColor,
      weight: 1.5,
      fillColor: brandColor,
      fillOpacity: 0.08,
      dashArray: '4, 6'
    }).addTo(map);

    if (activeWellLayerRef.current) {
      activeWellLayerRef.current.clearLayers();
    }

    // Active Well Custom Icon
    const activeIcon = L.divIcon({
      className: 'custom-active-marker',
      html: `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 12px rgba(59,126,161,0.8));">
          <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: radial-gradient(circle, rgba(59,126,161,0.42), rgba(59,126,161,0.12) 42%, transparent 72%); animation: map-beacon 2.2s ease-in-out infinite;"></div>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-brand), #79d7ff); border: 3px solid rgba(255,255,255,0.9); box-shadow: 0 0 14px color-mix(in srgb, var(--accent-brand) 60%, transparent); display: flex; align-items: center; justify-content: center;">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: var(--text-primary);"></div>
          </div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const activeMarker = L.marker(center, { icon: activeIcon });
    activeMarker.bindPopup(`
      <div style="padding: 6px; font-family: sans-serif;">
        <div style="font-size: 0.75rem; color: var(--accent-brand); font-weight: 700;">Active drilling well</div>
        <div style="font-size: 1rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${activeWell.name}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Formation: <strong style="color: var(--text-primary);">${activeWell.formation || 'Hugin'}</strong></div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">Depth: <strong style="color: var(--status-normal);">${activeWell.current_depth || 0}m MD</strong></div>
      </div>
    `);
    activeWellLayerRef.current.addLayer(activeMarker);

    if (staticWellLayerRef.current) {
      staticWellLayerRef.current.clearLayers();
    }

    // Offset Wells Icons — with coloured risk flag indicators
    nearbyWells.forEach(well => {
      if (well.id === activeWell.id) return; // Skip active well

      const eventTypes = well.event_types || [];
      const eventCount = well.event_count || 0;

      // Colour map for event types
      const eventColors = {
        mud_loss: cautionColor,
        stuck_pipe: cautionColor,
        kick: cautionColor,
        overpressure: cautionColor,
        torque_spike: cautionColor,
        cementing: cautionColor,
        npt: mutedColor,
        fishing: cautionColor,
      };

      // Build small flag dots (up to 4 most significant types)
      const flagDots = eventTypes.slice(0, 4).map(et => {
        const col = eventColors[et] || mutedColor;
        return `<div style="width:8px;height:8px;border-radius:50%;background:${col};box-shadow:0 0 4px color-mix(in srgb, ${col} 45%, transparent);flex-shrink:0;"></div>`;
      }).join('');

      const ringColor = eventCount === 0 ? normalColor : cautionColor;
      const position = [well.latitude, well.longitude];
      const markerHalo = L.circleMarker(position, {
        radius: 14,
        color: ringColor,
        weight: 1,
        opacity: 0.55,
        fillColor: ringColor,
        fillOpacity: 0.2,
        className: 'well-marker-halo',
        interactive: false,
        pane: 'markerPane'
      });

      const offsetMarker = L.circleMarker(position, {
        radius: eventCount > 0 ? 8 : 7,
        color: '#f4fbff',
        weight: 2.5,
        fillColor: ringColor,
        fillOpacity: 1,
        opacity: 1,
        pane: 'markerPane'
      });

      const distStr = well.dist_m ? `${Math.round(well.dist_m)}m` : 'Nearby';

      // Build event-type flag legend for popup
      const eventLegend = eventTypes.length > 0
        ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;">${
            eventTypes.map(et => {
              const col = eventColors[et] || mutedColor;
              return `<span style="background:color-mix(in srgb, ${col} 18%, transparent);color:${col};border:1px solid color-mix(in srgb, ${col} 45%, transparent);border-radius:4px;font-size:0.65rem;font-weight:700;padding:1px 5px;text-transform:uppercase;">${et.replace('_',' ')}</span>`;
            }).join('')
          }</div>`
        : '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">No events logged</div>';

      offsetMarker.bindPopup(`
        <div style="padding: 6px; font-family: sans-serif;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Offset Well (${distStr} offset)</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${well.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Target: <strong style="color:var(--text-primary);">${well.formation || 'Hugin'}</strong> &nbsp;|&nbsp; TD: <strong style="color:var(--status-normal);">${well.current_depth || 0}m</strong></div>
          <div style="font-size:0.75rem;color:${ringColor};font-weight:700;margin-top:4px;">${eventCount} historical event${eventCount === 1 ? '' : 's'} logged</div>
          ${eventLegend}
          <button id="select-well-${well.id}" style="margin-top: 8px; background: ${brandColor}; color: ${textColor}; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; width: 100%;">
            Set as active well
          </button>
        </div>
      `);

      offsetMarker.bindTooltip(`${well.name}${eventCount > 0 ? ` - ${eventCount} event${eventCount === 1 ? '' : 's'}` : ''}`, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.95,
        sticky: true,
        className: 'well-marker-tooltip'
      });

      offsetMarker.on('popupopen', () => {
        const btn = document.getElementById(`select-well-${well.id}`);
        if (btn) {
          btn.onclick = () => onSelectWell(well.id);
        }
      });

      if (staticWellLayerRef.current) {
        staticWellLayerRef.current.addLayer(markerHalo);
        staticWellLayerRef.current.addLayer(offsetMarker);
      }
    });

  }, [activeWell, nearbyWells, radiusMeters, onSelectWell]);

  return (
    <div className="glass-panel" style={{ height: '100%', minHeight: '380px', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Map Legend Overlay */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'var(--bg-panel)', backdropFilter: 'blur(8px)', padding: '8px 12px', borderRadius: '8px', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', fontSize: '0.72rem', display: 'flex', gap: '12px', zIndex: 500, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-brand)', border: '2.5px solid var(--text-primary)', boxShadow: '0 0 6px var(--accent-brand)' }} />
          <span>Active Rig</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: '2.5px solid var(--status-caution)', boxShadow: '0 0 5px var(--status-caution)40' }} />
          <span style={{ color: 'var(--status-caution)' }}>Risk events</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: '2.5px solid var(--status-caution)' }} />
          <span style={{ color: 'var(--status-caution)' }}>Other events</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-panel)', border: '2.5px solid var(--status-normal)' }} />
          <span style={{ color: 'var(--status-normal)' }}>Clean Well</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '0px', borderTop: '2px dashed var(--accent-brand)' }} />
          <span>Radius Buffer</span>
        </div>
      </div>
    </div>
  );
}
