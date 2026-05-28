import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FitBoundsHelper from './FitBoundsHelper';
import DraggableOntMarker from './DraggableOntMarker';
import ManualOntPinDropper from './ManualOntPinDropper';
import { createLcpHealthIcon, getHealthColor, createOntPinIcon } from './lcpMapUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Navigation, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ONTSelectionDialog from './ONTSelectionDialog';

/**
 * Build a Nominatim-friendly address string from a record. The geocoder
 * splits on commas — so emitting "street, city, zip" gives us a structured
 * search even when the DB row only has the street portion.
 *
 * IMPORTANT: `subscriber_address` from loadSavedReport already contains the
 * full "street, city, zip" string (composed at ingest by processPonPmRecords).
 * For those records we MUST NOT re-append city/zip — doing so produces
 * malformed input like "184 Schroeder Rd, Hudson, 12534, Hudson, 12534"
 * which Nominatim rejects. We only append city/zip when the source address
 * appears to be a bare street (fewer than 2 comma-separated parts).
 */
function buildFullAddress(record) {
  const raw = (record.subscriber_address || record._subscriber?.address || '').trim();
  if (!raw) return '';

  // Count meaningful comma parts — if 2+, the address is already structured
  // (street, city[, zip]). Just normalize whitespace and return as-is.
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.join(', ');

  // Bare street — supplement with subscriber city/zip if available.
  const city = (record._subscriber?.city || '').trim();
  const zip = (record._subscriber?.zip || '').trim();
  return [raw, city, zip].filter(Boolean).join(', ');
}

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
  const [geocodeProgress, setGeocodeProgress] = useState(null);
  const [localRecords, setLocalRecords] = useState(ontRecords);
  const [showSelection, setShowSelection] = useState(false);
  const [manualPlacementRecordId, setManualPlacementRecordId] = useState(null);

  // Keep local state in sync if the parent refetches (e.g. after a new report load).
  // Without this, switching LCPs leaves stale records in view.
  useEffect(() => { setLocalRecords(ontRecords); }, [ontRecords]);

  // Selected ONT ids — defaults to "all geocodable + already-plotted" so the
  // map is useful on first open without forcing the user to interact.
  const [selectedIds, setSelectedIds] = useState(() => {
    const ids = new Set();
    for (const r of ontRecords) {
      if (!r.id) continue;
      const hasCoords = r.gps_lat && r.gps_lng;
      const hasAddress = buildFullAddress(r).length >= 5;
      if (hasCoords || hasAddress) ids.add(r.id);
    }
    return ids;
  });

  // When the underlying record set changes, re-seed selection to include any
  // newly-arrived ONTs that are plottable. Records the user explicitly
  // deselected are preserved (we only ADD, never remove).
  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const r of ontRecords) {
        if (!r.id || next.has(r.id)) continue;
        const hasCoords = r.gps_lat && r.gps_lng;
        const hasAddress = buildFullAddress(r).length >= 5;
        if (hasCoords || hasAddress) next.add(r.id);
      }
      return next;
    });
  }, [ontRecords]);

  // Pins shown on the map = records WITH coords that are also selected.
  const recordsWithPositions = useMemo(() => {
    return localRecords.filter(r =>
      r.gps_lat && r.gps_lng && isFinite(r.gps_lat) && isFinite(r.gps_lng) &&
      selectedIds.has(r.id)
    );
  }, [localRecords, selectedIds]);

  // Records to feed the geocoder = SELECTED + no coords yet + has an address.
  // The address is built from subscriber address + city + zip so the backend
  // gets enough context for accurate structured search.
  const recordsNeedingGeocode = useMemo(() => {
    return localRecords.filter(r => {
      if (!r.id || !selectedIds.has(r.id)) return false;
      if (r.gps_lat && r.gps_lng) return false;
      if (r.gps_manual) return false;
      return buildFullAddress(r).length >= 5;
    });
  }, [localRecords, selectedIds]);

  // Selected customers that still do not have a usable map position. These may
  // be failed geocodes, incomplete addresses, or brand-new subscriber records.
  const recordsWithoutPositions = useMemo(() => {
    return localRecords.filter(r =>
      r.id && selectedIds.has(r.id) &&
      (!r.gps_lat || !r.gps_lng || !isFinite(r.gps_lat) || !isFinite(r.gps_lng))
    );
  }, [localRecords, selectedIds]);

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
    const batchSize = 10;
    let totalGeocoded = 0;
    let totalFailed = 0;
    const allUpdates = [];
    const batches = [];

    for (let i = 0; i < recordsNeedingGeocode.length; i += batchSize) {
      const items = recordsNeedingGeocode
        .slice(i, i + batchSize)
        .filter(r => r.id)
        .map(r => ({ id: r.id, address: buildFullAddress(r) }))
        .filter(it => it.address.length >= 5);
      if (items.length > 0) batches.push(items);
    }

    try {
      for (let i = 0; i < batches.length; i += 1) {
        const processed = Math.min(i * batchSize, recordsNeedingGeocode.length);
        setGeocodeProgress({ processed, total: recordsNeedingGeocode.length, geocoded: totalGeocoded, failed: totalFailed });
        toast.loading(`Geocoding ${processed + 1}-${Math.min(processed + batches[i].length, recordsNeedingGeocode.length)} of ${recordsNeedingGeocode.length}...`, { id: 'geocode' });

        const res = await base44.functions.invoke('geocodeAddresses', { items: batches[i] });
        totalGeocoded += res.data.geocoded || 0;
        totalFailed += res.data.failed || 0;
        if (Array.isArray(res.data.updated)) allUpdates.push(...res.data.updated);

        if (allUpdates.length > 0) {
          const updatesById = new Map(allUpdates.map(u => [u.id, u]));
          setLocalRecords(prev => prev.map(r => {
            const u = r.id && updatesById.get(r.id);
            return u ? { ...r, gps_lat: u.gps_lat, gps_lng: u.gps_lng, gps_manual: false } : r;
          }));
        }
      }

      setGeocodeProgress({ processed: recordsNeedingGeocode.length, total: recordsNeedingGeocode.length, geocoded: totalGeocoded, failed: totalFailed });
      toast.success(`Geocoded ${totalGeocoded} ONTs${totalFailed ? `; ${totalFailed} need manual placement` : ''}`, { id: 'geocode' });
    } catch (err) {
      toast.error('Geocoding stopped: ' + err.message + '. Unplotted ONTs can be placed manually.', { id: 'geocode' });
    } finally {
      setGeocoding(false);
      setTimeout(() => setGeocodeProgress(null), 4000);
    }
  }, [recordsNeedingGeocode]);

  const saveManualPosition = useCallback(async (recordId, newLat, newLng, successMessage) => {
    await base44.functions.invoke('saveOntGpsPosition', {
      recordId,
      lat: newLat,
      lng: newLng,
    });

    setLocalRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, gps_lat: newLat, gps_lng: newLng, gps_manual: true } : r
    ));
    setSelectedIds(prev => new Set([...prev, recordId]));
    toast.success(successMessage);
  }, []);

  // Handle pin drag
  const handleDragEnd = useCallback(async (recordId, newLat, newLng) => {
    try {
      await saveManualPosition(recordId, newLat, newLng, 'Pin position saved');
    } catch (err) {
      toast.error('Failed to save position: ' + err.message);
    }
  }, [saveManualPosition]);

  const handleManualPlace = useCallback(async (recordId, newLat, newLng) => {
    try {
      await saveManualPosition(recordId, newLat, newLng, 'Manual pin position saved');
      setManualPlacementRecordId(null);
    } catch (err) {
      toast.error('Failed to save manual position: ' + err.message);
    }
  }, [saveManualPosition]);

  // LCP center pin
  const lcpIcon = useMemo(() => {
    const color = getHealthColor(lcpGroup.ok || 0, lcpGroup.ontCount || 0);
    return createLcpHealthIcon(lcpGroup.lcpNumber, color, 0);
  }, [lcpGroup]);

  return (
    <div className="space-y-3">
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>← Back to LCP Map</Button>
          )}
          <Badge variant="outline" className="text-sm font-semibold">
            <MapPin className="h-3 w-3 mr-1" />
            {lcpGroup.lcpNumber}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {recordsWithPositions.length} plotted / {selectedIds.size} selected / {localRecords.length} total
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSelection(true)}>
            <ListChecks className="h-4 w-4 mr-1" />
            Select ONTs
          </Button>
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

      {/* Selection dialog — grouped by splitter, lets the user pick which
          ONTs participate on the map (and in the geocode batch). */}
      <ONTSelectionDialog
        open={showSelection}
        onOpenChange={setShowSelection}
        lcpNumber={lcpGroup.lcpNumber}
        records={localRecords}
        selectedIds={selectedIds}
        onApply={setSelectedIds}
      />

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block border border-white" />OK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-600 inline-block border border-white" />Warning</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block border border-white" />Critical</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-600 inline-block border border-white" />Offline</span>
        <span className="text-blue-600">| Drag any pin to reposition</span>
        {manualPlacementRecordId && <span className="text-indigo-600 font-medium">| Click the map to place the selected customer</span>}
      </div>

      {geocodeProgress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <div className="font-semibold">Geocoding in progress</div>
          <div className="mt-1">
            Processed {geocodeProgress.processed} of {geocodeProgress.total} selected addresses • {geocodeProgress.geocoded} placed • {geocodeProgress.failed} need manual placement
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${geocodeProgress.total ? Math.min(100, Math.round((geocodeProgress.processed / geocodeProgress.total) * 100)) : 0}%` }}
            />
          </div>
        </div>
      )}

      {recordsWithoutPositions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">{recordsWithoutPositions.length} selected customer{recordsWithoutPositions.length > 1 ? 's' : ''} need manual map placement</div>
              <div className="text-amber-700">If geocoding cannot validate an address, choose a customer below, then click the correct spot on the map.</div>
            </div>
            {manualPlacementRecordId && (
              <Button size="sm" variant="outline" onClick={() => setManualPlacementRecordId(null)}>
                Cancel Placement
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {recordsWithoutPositions.slice(0, 8).map(record => {
              const label = record.subscriber_account_name || record._subscriber?.name || record.serial_number || record.SerialNumber || `ONT ${record.ont_id || record.OntID || record.id}`;
              return (
                <div key={record.id} className={`flex items-center justify-between gap-2 rounded border bg-white p-2 ${manualPlacementRecordId === record.id ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-amber-100'}`}>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{label}</div>
                    <div className="text-[11px] text-gray-500 truncate">{buildFullAddress(record) || 'No validated address'}</div>
                  </div>
                  <Button size="sm" variant={manualPlacementRecordId === record.id ? 'default' : 'outline'} onClick={() => setManualPlacementRecordId(record.id)}>
                    Place Pin
                  </Button>
                </div>
              );
            })}
          </div>
          {recordsWithoutPositions.length > 8 && (
            <div className="mt-2 text-[11px] text-amber-700">Showing first 8 unplotted customers. Use Select ONTs to narrow the list.</div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} className="z-0">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OSM &copy; CARTO'
          />
          {positions.length > 0 && <FitBoundsHelper positions={positions} />}
          <ManualOntPinDropper activeRecordId={manualPlacementRecordId} onPlace={handleManualPlace} />

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
          {recordsNeedingGeocode.length > 0 ? (
            <p className="text-xs mt-1">Click "Geocode" above to resolve {recordsNeedingGeocode.length} subscriber addresses.</p>
          ) : (
            <p className="text-xs mt-1">
              Use <strong>Select ONTs</strong> to pick which subscribers to plot. ONTs need a subscriber address (street, city, zip) to be geocoded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}