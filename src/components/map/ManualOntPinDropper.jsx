import { useMapEvents } from 'react-leaflet';

export default function ManualOntPinDropper({ activeRecordId, onPlace }) {
  useMapEvents({
    click(event) {
      if (!activeRecordId) return;
      onPlace(activeRecordId, event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}