'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState, useRef, useMemo } from 'react';

// Fix Leaflet default icon paths for Next.js
// @ts-expect-error Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface InteractiveMapProps {
  initialLatitude: number;
  initialLongitude: number;
  onLocationSelect: (latitude: number, longitude: number) => void;
}

// Component to handle map click events
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function InteractiveMap({
  initialLatitude,
  initialLongitude,
  onLocationSelect,
}: InteractiveMapProps) {
  const [markerPosition, setMarkerPosition] = useState<L.LatLng>(
    new L.LatLng(initialLatitude, initialLongitude),
  );
  const markerRef = useRef<L.Marker | null>(null);

  const handleLocationSelect = (lat: number, lng: number) => {
    const newPosition = new L.LatLng(lat, lng);
    setMarkerPosition(newPosition);
    onLocationSelect(lat, lng);
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const position = marker.getLatLng();
          setMarkerPosition(position);
          onLocationSelect(position.lat, position.lng);
        }
      },
    }),
    [onLocationSelect],
  );

  return (
    <MapContainer
      center={[initialLatitude, initialLongitude]}
      zoom={13}
      style={{ height: '400px', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onLocationSelect={handleLocationSelect} />
      <Marker
        position={markerPosition}
        draggable={true}
        eventHandlers={eventHandlers}
        ref={markerRef}
      />
    </MapContainer>
  );
}
