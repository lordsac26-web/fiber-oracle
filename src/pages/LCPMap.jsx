import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, MapPin, Server, List, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom LCP marker icon
const lcpIcon = new L.DivIcon({
  className: 'custom-lcp-marker',
  html: `<div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 14px;">📦</div></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Component to fit bounds to markers
function FitBounds({ entries }) {
  const map = useMap();
  
  useEffect(() => {
    if (entries.length > 0) {
      const bounds = L.latLngBounds(
        entries.map(e => [e.gps_lat, e.gps_lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [entries, map]);
  
  return null;
}

export default function LCPMap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Fetch LCP entries from database
  const { data: lcpEntries = [], isLoading } = useQuery({
    queryKey: ['lcpEntries'],
    queryFn: () => base44.entities.LCPEntry.list('-created_date'),
  });

  const entriesWithCoords = lcpEntries.filter(e => 
    e.gps_lat && e.gps_lng && 
    !isNaN(e.gps_lat) && !isNaN(e.gps_lng)
  );

  const filteredEntries = entriesWithCoords.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.lcp_number?.toLowerCase().includes(term) ||
      entry.splitter_number?.toLowerCase().includes(term) ||
      entry.location?.toLowerCase().includes(term)
    );
  });

  const defaultCenter = filteredEntries.length > 0 
    ? [filteredEntries[0].gps_lat, filteredEntries[0].gps_lng]
    : [39.8283, -98.5795]; // Center of USA

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-[1000] backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">LCP Map View</h1>
                <p className="text-xs text-gray-500">{filteredEntries.length} locations with coordinates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search LCPs..."
                  className="pl-10 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Link to={createPageUrl('LCPInfo')}>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex h-[calc(100vh-73px)]">
        {/* Map */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-600">Loading map data...</h3>
              </div>
            </div>
          ) : filteredEntries.length > 0 ? (
            <MapContainer
              center={defaultCenter}
              zoom={10}
              className="h-full w-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds entries={filteredEntries} />
              
              {filteredEntries.map((entry) => (
                <Marker
                  key={entry.id}
                  position={[entry.gps_lat, entry.gps_lng]}
                  icon={lcpIcon}
                  eventHandlers={{
                    click: () => setSelectedEntry(entry)
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-bold text-lg text-indigo-600">{entry.lcp_number}</div>
                      <div className="text-sm text-gray-600 mb-2">{entry.splitter_number}</div>
                      {entry.location && (
                        <div className="flex items-start gap-1 text-sm mb-1">
                          <MapPin className="h-3 w-3 mt-0.5 text-gray-400" />
                          <span>{entry.location}</span>
                        </div>
                      )}
                      {entry.olt_shelf && (
                        <div className="flex items-start gap-1 text-sm">
                          <Server className="h-3 w-3 mt-0.5 text-gray-400" />
                          <span>Shelf {entry.olt_shelf}/{entry.olt_slot}/{entry.olt_port}</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No LCPs with coordinates</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add GPS coordinates to your LCP entries to see them on the map
                </p>
                <Link to={createPageUrl('LCPInfo')}>
                  <Button className="mt-4">Go to LCP List</Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Selected Entry Details */}
        {selectedEntry && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">LCP Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>×</Button>
            </div>
            
            <Card className="border-0 shadow-md">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-lg px-3 py-1">{selectedEntry.lcp_number}</Badge>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">Splitter</div>
                  <div className="font-mono">{selectedEntry.splitter_number}</div>
                </div>

                {selectedEntry.location && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">{selectedEntry.location}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                  <div className="font-mono text-sm text-blue-600">
                    {selectedEntry.gps_lat}, {selectedEntry.gps_lng}
                  </div>
                </div>

                {selectedEntry.olt_shelf && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">OLT Location</div>
                    <div className="flex items-start gap-2">
                      <Server className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="font-mono text-sm">
                        Shelf {selectedEntry.olt_shelf} / Slot {selectedEntry.olt_slot} / Port {selectedEntry.olt_port}
                      </div>
                    </div>
                  </div>
                )}

                {(selectedEntry.optic_make || selectedEntry.optic_model) && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Optic</div>
                    <div className="text-sm">
                      {[selectedEntry.optic_make, selectedEntry.optic_model].filter(Boolean).join(' ')}
                      {selectedEntry.optic_serial && (
                        <div className="text-xs text-gray-400">S/N: {selectedEntry.optic_serial}</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEntry.notes && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Notes</div>
                    <div className="text-sm italic text-gray-600">{selectedEntry.notes}</div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedEntry.gps_lat},${selectedEntry.gps_lng}`, '_blank')}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Open in Google Maps
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}