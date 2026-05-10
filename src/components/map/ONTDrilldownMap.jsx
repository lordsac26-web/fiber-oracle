import React, { useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FitBoundsHelper from './FitBoundsHelper';
import DraggableOntMarker from './DraggableOntMarker';
import { createLcpHealthIcon, getHealthColor, createOntPinIcon } from './lcpMapUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * ONTDrilldownMap — Shows a single LCP and its individual ONT pins.
 * ONTs with addresses get geocoded, pins are draggable.
 * 
 * Props:
 *   lcpGroup: The LCP group object (lcpNumber, gps_lat, gps_lng, onts, ok, critical, etc.)
 *   ontRecords: Array of ONTPerformanceRecord from DB (with gps_lat, gps_lng, subscriber_address)
 *   height: CSS height string
 *   onBack: () => void
 *   onOntSelect: (ont) => void — optional, for further drill-down
 */
export default function ONTDrilldownMap({ lcpGroup, ontRecords = [], height = '500px', onBack, onOntSelect }) {
  const [geocoding, setGeocoding] = useState(false);
  const [localRecords, setLocalRecords] = useState(ontRecords);

  // Merge any existing geocoded positions into the record set
  const recordsWithPositions = useMemo(() => {
    return localRecords.filter(r => r.gps_lat && r.gps_lng && isFinite(r.gps_lat) && isFinite(r.gps_lng));
  }, [localRecords]);

  const recordsNeedingGeocode = useMemo(() => {
    return localRecords.filter(r =>
      (!r.gps_lat || !r.gps_lng) &&
      r.subscriber_address &&
      r.subscriber_address.trim().length >= 5 &&
      !r.gps_manual
    );
  }, [localRecords]);

  // Build positions for FitBounds
  const positions = useMemo(() => {
    const pts = recordsWithPositions.map(r => [r.gps_lat, r.gps_lng]);
    if (lcpGroup.gps_lat && lcpGroup.gps_lng) {
      pts.push([lcpGroup.gps_lat, lcpGroup.gps_lng]);
    }
    return pts;
  }, [recordsWithPositions, lcpGroup]);

  const center = lcpGroup.gps_lat && lcpGroup.gps_lng
    ? [lcpGroup.gps_lat, lcpGroup.gps_lng]
    : positions.length > 0 ? positions[0] : [39.83, -98.58];

  // Geocode unresolved ONTs
  const handleGeocode = useCallback(async () => {
    if (recordsNeedingGeocode.length === 0) {
      toast.info('All ONTs with addresses are already geocoded');
      return;
    }

    setGeocoding(true);
    const batchSize = 50;
    let totalGeocoded = 0;

    try {
      for (let i = 0; i < recordsNeedingGeocode.length; i += batchSize) {
        const batch = recordsNeedingGeocode.slice(i, i + batchSize);
        const ids = batch.map(r => r.id).filter(Boolean);
        if (ids.length === 0) continue;

        toast.loading(`Geocoding batch ${Math.floor(i / batchSize) + 1}...`, { id: 'geocode' });
        const res = await base44.functions.invoke('geocodeAddresses', { ontRecordIds: ids });
        totalGeocoded += res.data.geocoded || 0;
      }

      toast.success(`Geocoded ${totalGeocoded} ONT addresses`, { id: 'geocode' });

      // Refresh records from DB
      if (lcpGroup.lcpNumber) {
        const reportId = localRecords[0]?.report_id;
        if (reportId) {
          const fresh = await base44.entities.ONTPerformanceRecord.filter(
            { report_id: reportId, lcp_number: lcpGroup.lcpNumber },
            '-updated_date', 500
          );
          setLocalRecords(fresh);
        }
      }
    } catch (err) {
      toast.error('Geocoding failed: ' + err.message, { id: 'geocode' });
    } finally {
      setGeocoding(false);
    }
  }, [recordsNeedingGeocode, localRecords, lcpGroup]);

  // Handle pin drag
  const handleDragEnd = useCallback(async (recordId, newLat, newLng) => {
    try {
      await base44.functions.invoke('saveOntGpsPosition', {
        recordId,
        lat: newLat,
        lng: newLng,
      });
      // Update local state
      setLocalRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, gps_lat: newLat, gps_lng: newLng, gps_manual: true } : r
      ));
      toast.success('Pin position saved');
    } catch (err) {
      toast.error('Failed to save position: ' + err.message);
    }
  }, []);

  // LCP center pin
  const lcpIcon = useMemo(() => {
    const color = getHealthColor(lcpGroup.ok || 0, lcpGroup.ontCount || 0);
    return createLcpHealthIcon(lcpGroup.lcpNumber, color, 0);
  }, [lcpGroup]);

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>← Back to LCP Map</Button>
          )}
          <Badge variant="outline" className="text-sm font-semibold">
            <MapPin className="h-3 w-3 mr-1" />
            {lcpGroup.lcpNumber}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {recordsWithPositions.length} plotted / {localRecords.length} total ONTs
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {recordsNeedingGeocode.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeocode}
              disabled={geocoding}
            >
              {geocoding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Navigation className="h-4 w-4 mr-1" />}
              Geocode {recordsNeedingGeocode.length} ONTs
            </Button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block border border-white" />OK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-600 inline-block border border-white" />Warning</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white" />Critical</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block border border-white" />Offline</span>
        <span className="text-blue-600">| Drag any pin to reposition</span>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} className="z-0">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OSM &copy; CARTO'
          />
          {positions.length > 0 && <FitBoundsHelper positions={positions} />}

          {/* LCP center marker */}
          {lcpGroup.gps_lat && lcpGroup.gps_lng && (
            <Marker position={[lcpGroup.gps_lat, lcpGroup.gps_lng]} icon={lcpIcon}>
              <Popup>
                <div className="font-bold">{lcpGroup.lcpNumber}</div>
                <div className="text-xs text-gray-500">{lcpGroup.location || 'LCP Location'}</div>
              </Popup>
            </Marker>
          )}

          {/* ONT markers — draggable */}
          {recordsWithPositions.map(ont => (
            <DraggableOntMarker
              key={ont.id}
              ont={ont}
              onDragEnd={handleDragEnd}
              onOntClick={onOntSelect}
            />
          ))}
        </MapContainer>
      </div>

      {/* ONTs without positions */}
      {localRecords.length > 0 && recordsWithPositions.length === 0 && !geocoding && (
        <div className="text-center py-4 text-gray-500 text-sm border rounded-lg bg-gray-50">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>No ONTs have GPS coordinates yet.</p>
          {recordsNeedingGeocode.length > 0 && (
            <p className="text-xs mt-1">Click "Geocode" above to resolve {recordsNeedingGeocode.length} subscriber addresses.</p>
          )}
        </div>
      )}
    </div>
  );
}