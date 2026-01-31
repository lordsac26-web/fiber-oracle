import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite/Webpack
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);
  return null;
}

export default function LocationMap({ locations = [], currentLocation = null, height = '400px' }) {
  const [center, setCenter] = useState([40.7128, -74.0060]); // Default: NYC

  useEffect(() => {
    if (currentLocation) {
      setCenter([currentLocation.latitude, currentLocation.longitude]);
    } else if (locations.length > 0 && locations[0].gps) {
      setCenter([locations[0].gps.latitude, locations[0].gps.longitude]);
    }
  }, [currentLocation, locations]);

  const validLocations = locations.filter(loc => loc.gps?.latitude && loc.gps?.longitude);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Job Locations
          <Badge variant="outline" className="ml-auto">{validLocations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height }}>
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {currentLocation && (
              <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
                <Popup>
                  <div className="text-sm">
                    <strong className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      Current Location
                    </strong>
                    <div className="text-xs text-gray-600 mt-1">
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                      <br />
                      Accuracy: ±{currentLocation.accuracy.toFixed(0)}m
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {validLocations.map((location, idx) => (
              <Marker
                key={idx}
                position={[location.gps.latitude, location.gps.longitude]}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{location.title || `Location ${idx + 1}`}</strong>
                    {location.description && <p className="text-xs mt-1">{location.description}</p>}
                    <div className="text-xs text-gray-600 mt-1">
                      {location.gps.latitude.toFixed(6)}, {location.gps.longitude.toFixed(6)}
                      {location.timestamp && (
                        <>
                          <br />
                          {new Date(location.timestamp).toLocaleString()}
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <RecenterMap position={center} />
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}