'use client';

import { useEffect, useState } from 'react';

interface MaterialLocationMapProps {
  latitude: number;
  longitude: number;
  popupText?: string;
  zoom?: number;
}

// 地図の実際のレンダリングコンポーネント
const MapRenderer: React.FC<MaterialLocationMapProps> = ({
  latitude,
  longitude,
  popupText = 'Recorded Location',
  zoom = 13,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<any>(null);

  useEffect(() => {
    // ブラウザでのみLeafletを読み込み
    const loadLeaflet = async () => {
      try {
        const [reactLeaflet, leaflet] = await Promise.all([
          import('react-leaflet'),
          import('leaflet'),
        ]);

        // Leafletアイコンの修正
        const iconPrototype = leaflet.default.Icon.Default.prototype as unknown as Record<
          string,
          unknown
        >;
        delete iconPrototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
        });

        console.log('Leaflet components loaded successfully');
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };

    loadLeaflet();
  }, []);

  if (!MapComponents) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary/20 rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">地図を読み込み中...</p>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        minHeight: '200px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <MapContainer
        key={`map-${latitude}-${longitude}`}
        center={[latitude, longitude]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{
          height: '100%',
          width: '100%',
          zIndex: 1,
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        whenReady={(mapInstance: any) => {
          console.log('✅ Leaflet map ready and rendering:', { latitude, longitude });
          setTimeout(() => {
            // MapContainerインスタンスのtargetプロパティが実際のLeafletマップインスタンス
            if (mapInstance && mapInstance.target) {
              mapInstance.target.invalidateSize();
              console.log('✅ Map size invalidated for proper display');
            }
          }, 100);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin=""
          eventHandlers={{
            loading: () => console.log('🔄 Tiles loading started'),
            load: () => console.log('✅ Tiles loaded successfully'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tileerror: (e: any) => console.error('❌ Tile error:', e),
          }}
        />
        <Marker position={[latitude, longitude]}>
          <Popup>{popupText}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const MaterialLocationMap: React.FC<MaterialLocationMapProps> = (props) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log('MaterialLocationMap: Client side rendering enabled');
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary/20 rounded-lg">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-muted-foreground">地図を初期化中...</p>
        </div>
      </div>
    );
  }

  return <MapRenderer {...props} />;
};

export default MaterialLocationMap;
