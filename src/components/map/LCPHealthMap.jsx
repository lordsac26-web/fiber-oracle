import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import FitBoundsHelper from './FitBoundsHelper';
import { getHealthColor, createLcpHealthIcon } from './lcpMapUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Fix default Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * LCPHealthMap — renders LCP pins color-coded by splitter health percentage.
 * 
 * Props:
 *   lcpGroups: Array of { lcpNumber, gps_lat, gps_lng, ok, critical, warning, offline, ontCount, splitters, location }
 *   height: CSS height string (default '400px')
 *   onLcpClick: (lcpGroup) => void — called when user clicks "Drill Down"
 *   onLcpHover: optional
 */
export default function LCPHealthMap({ lcpGroups = [], height = '400px', onLcpClick }) {
  const gpsGroups = useMemo(
    () => lcpGroups.filter(g => g.gps_lat && g.gps_lng && isFinite(g.gps_lat) && isFinite(g.gps_lng)),
    [lcpGroups]
  );

  const positions = useMemo(
    () => gpsGroups.map(g => [g.gps_lat, g.gps_lng]),
    [gpsGroups]
  );

  const defaultCenter = positions.length > 0 ? positions[0] : [39.83, -98.58];

  if (gpsGroups.length === 0) {
    return (
      <div className="flex items-center justify-center border rounded-lg bg-gray-50 dark:bg-gray-800" style={{ height }}>
        <div className="text-center text-gray-500">
          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No LCPs with GPS coordinates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer center={defaultCenter} zoom={10} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBoundsHelper positions={positions} />

        {gpsGroups.map(group => {
          const color = getHealthColor(group.ok, group.ontCount);
          const issueCount = (group.critical || 0) + (group.warning || 0) + (group.offline || 0);
          const icon = createLcpHealthIcon(group.lcpNumber, color, issueCount);
          const healthPct = group.ontCount > 0 ? ((group.ok / group.ontCount) * 100).toFixed(0) : 0;

          return (
            <Marker key={group.lcpNumber} position={[group.gps_lat, group.gps_lng]} icon={icon}>
              <Popup>
                <div className="min-w-[220px] max-w-[280px]">
                  <div className="font-bold text-base text-indigo-600 mb-1">{group.lcpNumber}</div>
                  {group.location && (
                    <div className="text-xs text-gray-500 mb-2 flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      {group.location}
                    </div>
                  )}

                  <div className="text-xs mb-2">
                    <span className="font-medium">{healthPct}%</span> healthy
                    <span className="text-gray-400 mx-1">•</span>
                    {group.ontCount} ONTs
                    <span className="text-gray-400 mx-1">•</span>
                    {group.splitters?.length || 0} splitters
                  </div>

                  <div className="grid grid-cols-2 gap-1 mb-2 text-[11px]">
                    {group.ok > 0 && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 justify-center">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />{group.ok}
                      </Badge>
                    )}
                    {group.critical > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-300 justify-center">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />{group.critical}
                      </Badge>
                    )}
                    {group.warning > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 justify-center">
                        {group.warning} warn
                      </Badge>
                    )}
                    {group.offline > 0 && (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300 justify-center">
                        {group.offline} off
                      </Badge>
                    )}
                  </div>

                  {onLcpClick && (
                    <Button size="sm" className="w-full mt-1" onClick={() => onLcpClick(group)}>
                      Drill Down to ONTs
                    </Button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}