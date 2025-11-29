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
        entries.map(e => [parseFloat(e.latitude), parseFloat(e.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [entries, map]);
  
  return null;
}

export default function LCPMap() {
  const [lcpEntries, setLcpEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('lcpEntries');
    if (saved) {
      setLcpEntries(JSON.parse(saved));
    }
  }, []);

  const entriesWithCoords = lcpEntries.filter(e => 
    e.latitude && e.longitude && 
    !isNaN(parseFloat(e.latitude)) && !isNaN(parseFloat(e.longitude))
  );

  const filteredEntries = entriesWithCoords.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      entry.lcpNumber?.toLowerCase().includes(term) ||
      entry.splitterNumber?.toLowerCase().includes(term) ||
      entry.physicalLocation?.toLowerCase().includes(term) ||
      entry.oltName?.toLowerCase().includes(term)
    );
  });

  const defaultCenter = filteredEntries.length > 0 
    ? [parseFloat(filteredEntries[0].latitude), parseFloat(filteredEntries[0].longitude)]
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
          {filteredEntries.length > 0 ? (
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
                  position={[parseFloat(entry.latitude), parseFloat(entry.longitude)]}
                  icon={lcpIcon}
                  eventHandlers={{
                    click: () => setSelectedEntry(entry)
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="font-bold text-lg text-indigo-600">{entry.lcpNumber}</div>
                      <div className="text-sm text-gray-600 mb-2">{entry.splitterNumber}</div>
                      {entry.physicalLocation && (
                        <div className="flex items-start gap-1 text-sm mb-1">
                          <MapPin className="h-3 w-3 mt-0.5 text-gray-400" />
                          <span>{entry.physicalLocation}</span>
                        </div>
                      )}
                      {entry.oltName && (
                        <div className="flex items-start gap-1 text-sm">
                          <Server className="h-3 w-3 mt-0.5 text-gray-400" />
                          <span>{entry.oltName} / {entry.oltShelf}/{entry.oltSlot}/{entry.oltPort}</span>
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
                  <Badge className="bg-indigo-600 text-lg px-3 py-1">{selectedEntry.lcpNumber}</Badge>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">Splitter</div>
                  <div className="font-mono">{selectedEntry.splitterNumber}</div>
                </div>

                {selectedEntry.physicalLocation && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">{selectedEntry.physicalLocation}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                  <div className="font-mono text-sm text-blue-600">
                    {selectedEntry.latitude}, {selectedEntry.longitude}
                  </div>
                </div>

                {selectedEntry.oltName && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">OLT Location</div>
                    <div className="flex items-start gap-2">
                      <Server className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="font-mono text-sm">
                        {selectedEntry.oltName} / Shelf {selectedEntry.oltShelf} / Slot {selectedEntry.oltSlot} / Port {selectedEntry.oltPort}
                      </div>
                    </div>
                  </div>
                )}

                {(selectedEntry.opticMake || selectedEntry.opticModel) && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Optic</div>
                    <div className="text-sm">
                      {[selectedEntry.opticMake, selectedEntry.opticModel].filter(Boolean).join(' ')}
                      {selectedEntry.opticSerial && (
                        <div className="text-xs text-gray-400">S/N: {selectedEntry.opticSerial}</div>
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
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedEntry.latitude},${selectedEntry.longitude}`, '_blank')}
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