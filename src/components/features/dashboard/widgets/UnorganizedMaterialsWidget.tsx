'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnorganizedMaterials } from '@/hooks/use-unorganized-materials';

export function UnorganizedMaterialsWidget() {
  const { data, isLoading, error, refetch } = useUnorganizedMaterials(5);

  // ローディング状態
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground mb-2">メタデータが不足している素材</div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 animate-pulse rounded mb-1"></div>
                <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2"></div>
              </div>
              <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground mb-2">メタデータが不足している素材</div>
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <p className="text-sm mb-2">データの読み込みに失敗しました</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" />
            再試行
          </Button>
        </div>
      </div>
    );
  }

  const materials = data?.materials || [];

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground mb-2">
        メタデータが不足している素材
        {data && (
          <span className="ml-1 text-xs">
            （{materials.length}/{data.totalCount}件表示）
          </span>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
          <p className="text-sm">整理が必要な素材はありません</p>
          <p className="text-xs mt-1">すべての素材が適切に整理されています！</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {materials.map((material) => (
              <li key={material.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{material.title}</p>
                  <p className="text-xs text-muted-foreground">{material.issues.join(', ')}</p>
                </div>
                <Link href={`/materials/${material.slug}/edit`}>
                  <Button variant="ghost" size="sm">
                    編集
                  </Button>
                </Link>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t">
            <Link href="/materials?filter=unorganized" className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                すべて表示 ({data?.totalCount}件)
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
