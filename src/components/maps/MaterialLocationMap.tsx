'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Leafletのデフォルトアイコンパスの問題を修正 (Next.js環境でよくある問題)
// https://github.com/PaulLeCam/react-leaflet/issues/808
// @ts-expect-error TODO: 型エラーを解消するか、より良い方法を検討 (L.Icon.Default.prototype が存在しない可能性など)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MaterialLocationMapProps {
  latitude: number;
  longitude: number;
  popupText?: string; // マーカーのポップアップに表示するテキスト (任意)
  zoom?: number;
}

const MaterialLocationMap: React.FC<MaterialLocationMapProps> = ({
  latitude,
  longitude,
  popupText = 'Recorded Location',
  zoom = 13,
}) => {
  if (typeof window === 'undefined') {
    // サーバーサイドレンダリング時は何も表示しないか、プレースホルダーを返す
    return <div style={{ height: '300px', background: '#e0e0e0' }} aria-label="Map loading..."></div>;
  }

  const position: L.LatLngExpression = [latitude, longitude];

  return (
    <MapContainer center={position} zoom={zoom} scrollWheelZoom={false} style={{ height: '300px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        {popupText && <Popup>{popupText}</Popup>}
      </Marker>
    </MapContainer>
  );
};

export default MaterialLocationMap; 
