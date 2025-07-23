'use client';

import React from 'react';
import { RefreshCw, Calendar, AlertCircle, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRandomMaterial } from '@/hooks/use-random-material';
import Link from 'next/link';

export function TodaySoundWidget() {
  const { data, isLoading, error, refresh } = useRandomMaterial();

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={true}
            className="h-8 w-8"
            aria-label="別の音を選択"
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2 mt-1"></div>
          </div>
          <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
          <div className="flex gap-1">
            <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            className="h-8 w-8"
            aria-label="再試行"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <p className="text-sm text-muted-foreground mb-2">音声データの読み込みに失敗しました</p>
          <Button size="sm" variant="outline" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" />
            再試行
          </Button>
        </div>
      </div>
    );
  }

  const material = data?.material;

  // 素材がない場合
  if (!material) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            className="h-8 w-8"
            aria-label="別の音を選択"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <Music className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">まだ素材がありません</p>
          <p className="text-xs text-muted-foreground mt-1">最初の音声を録音してみましょう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(), 'yyyy年MM月dd日', { locale: ja })}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          className="h-8 w-8"
          aria-label="別の音を選択"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Link href={`/materials/${material.slug}`}>
            <h3 className="font-medium text-sm hover:text-primary cursor-pointer">
              {material.title}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(material.recordedAt), 'yyyy/MM/dd HH:mm')}
            {material.location?.name && ` • ${material.location.name}`}
          </p>
        </div>

        <div className="w-full">
          <AudioPlayer audioUrl={material.audioUrl} />
        </div>

        {material.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {material.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
