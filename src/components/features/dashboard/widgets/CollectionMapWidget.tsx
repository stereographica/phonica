'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// 地図コンポーネントは動的インポート（SSR回避）
const MaterialLocationMap = dynamic(() => import('@/components/maps/MaterialLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-secondary/20 rounded-lg">
      <div className="text-center">
        <MapPin className="h-6 w-6 mx-auto mb-1 text-muted-foreground animate-pulse" />
        <p className="text-xs text-muted-foreground">地図を読み込み中...</p>
      </div>
    </div>
  ),
});

// TODO: 実際のデータ取得とAPIコールを実装
export function CollectionMapWidget() {
  // プレースホルダーデータ
  const materials = [
    {
      id: '1',
      title: '朝の鳥のさえずり',
      latitude: 35.6895,
      longitude: 139.6917,
      locationName: '代々木公園',
    },
    {
      id: '2',
      title: '海の波音',
      latitude: 35.3139,
      longitude: 139.4502,
      locationName: '江ノ島',
    },
    {
      id: '3',
      title: '雨音',
      latitude: 35.709,
      longitude: 139.7319,
      locationName: '上野公園',
    },
  ];

  const totalMaterials = materials.length;
  const locationsWithData = materials.filter((m) => m.latitude && m.longitude).length;

  console.log('CollectionMapWidget render:', {
    materialsLength: materials.length,
    hasLatitude: !!materials[0]?.latitude,
    hasLongitude: !!materials[0]?.longitude,
    hasLocation: !!(materials[0]?.latitude && materials[0]?.longitude),
    firstMaterial: materials[0],
  });

  return (
    <div className="space-y-2 h-full">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{locationsWithData}件の録音場所</span>
        <span className="text-xs text-muted-foreground">全{totalMaterials}件中</span>
      </div>

      <div className="flex-1 min-h-[200px]" style={{ height: '200px', minHeight: '200px' }}>
        {materials.length > 0 && materials[0].latitude && materials[0].longitude ? (
          <div
            className="h-full w-full"
            style={{ height: '200px', minHeight: '200px', width: '100%' }}
          >
            <MaterialLocationMap
              latitude={materials[0].latitude}
              longitude={materials[0].longitude}
              popupText={`${materials[0].title} - ${materials[0].locationName}`}
              zoom={10}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-secondary/20 rounded-lg">
            <p className="text-xs text-muted-foreground">位置情報のある素材がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
