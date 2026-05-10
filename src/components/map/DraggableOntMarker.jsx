import React, { useRef, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createOntPinIcon } from './lcpMapUtils';
import { Badge } from '@/components/ui/badge';

/**
 * A single ONT marker that can be dragged to correct its position.
 * Calls onDragEnd(recordId, newLat, newLng) when the user drops it.
 */
export default function DraggableOntMarker({ ont, onDragEnd, onOntClick }) {
  const markerRef = useRef(null);
  const status = ont.status || ont._analysis?.status || 'ok';

  const icon = useMemo(() => createOntPinIcon(status, true), [status]);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDragEnd(ont.id || ont._id, pos.lat, pos.lng);
      }
    },
  }), [ont.id, ont._id, onDragEnd]);

  const statusColors = {
    ok: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    critical: 'bg-red-100 text-red-800',
    offline: 'bg-gray-100 text-gray-700',
  };

  const displayName = ont.subscriber_account_name || ont._subscriber?.name || ont._subscriber?.account || ont.serial_number || ont.SerialNumber || 'Unknown';
  const address = ont.subscriber_address || ont._subscriber?.address || '';

  return (
    <Marker
      ref={markerRef}
      position={[ont.gps_lat, ont.gps_lng]}
      icon={icon}
      draggable
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="min-w-[200px] max-w-[260px] text-xs">
          <div className="font-bold text-sm mb-1">{displayName}</div>
          {address && <div className="text-gray-500 mb-1">{address}</div>}
          <div className="flex items-center gap-1 mb-1">
            <Badge className={`${statusColors[status] || statusColors.ok} text-[10px]`}>
              {status.toUpperCase()}
            </Badge>
            <span className="font-mono text-gray-500">ONT {ont.ont_id || ont.OntID || '—'}</span>
          </div>
          <div className="text-gray-600">
            ONT Rx: <span className="font-mono">{formatPwr(ont.ont_rx_power ?? ont.OntRxOptPwr)}</span>
          </div>
          {ont.gps_manual && (
            <div className="text-blue-600 text-[10px] mt-1">📍 Manually positioned</div>
          )}
          <div className="text-[10px] text-gray-400 mt-1">Drag pin to correct position</div>
        </div>
      </Popup>
    </Marker>
  );
}

function formatPwr(v) {
  const n = parseFloat(v);
  return isFinite(n) ? `${n.toFixed(1)} dBm` : '—';
}