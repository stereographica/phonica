'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMaterialsWithLocation } from '@/hooks/use-materials-with-location';

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

export function CollectionMapWidget() {
  const { data: locationData, isLoading, error, refetch } = useMaterialsWithLocation(50); // 地図表示用は50件に制限

  // 地図の中心点と初期ズームレベルを計算
  const mapConfig = useMemo(() => {
    if (!locationData?.materials || locationData.materials.length === 0) {
      return {
        center: { lat: 35.6762, lng: 139.6503 }, // 東京駅をデフォルト
        zoom: 10,
      };
    }

    if (locationData.center) {
      return {
        center: { lat: locationData.center.lat, lng: locationData.center.lng },
        zoom: 10,
      };
    }

    // フォールバック: 最初の素材の位置
    const firstMaterial = locationData.materials[0];
    return {
      center: { lat: firstMaterial.latitude, lng: firstMaterial.longitude },
      zoom: 10,
    };
  }, [locationData]);

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-2 h-full">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">録音場所を読み込み中...</span>
          <RefreshCw className="h-3 w-3 animate-spin" />
        </div>
        <div className="flex-1 min-h-[200px]">
          <div className="h-full bg-gray-200 animate-pulse rounded-lg"></div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-2 h-full">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">録音場所</span>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex-1 min-h-[200px]">
          <div className="flex flex-col items-center justify-center h-full bg-secondary/20 rounded-lg">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-2">位置情報の読み込みに失敗しました</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              再試行
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const materials = locationData?.materials || [];
  const totalCount = locationData?.totalCount || 0;

  return (
    <div className="space-y-2 h-full">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{materials.length}件の録音場所</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">全{totalCount}件中</span>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]" style={{ height: '200px', minHeight: '200px' }}>
        {materials.length > 0 ? (
          <div
            className="h-full w-full"
            style={{ height: '200px', minHeight: '200px', width: '100%' }}
          >
            <MaterialLocationMap
              latitude={mapConfig.center.lat}
              longitude={mapConfig.center.lng}
              popupText={`${materials[0].title}${materials[0].location ? ` - ${materials[0].location}` : ''}`}
              zoom={mapConfig.zoom}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-secondary/20 rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">位置情報のある素材がありません</p>
              <p className="text-xs text-muted-foreground mt-1">
                録音時に位置情報を追加してみましょう
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
