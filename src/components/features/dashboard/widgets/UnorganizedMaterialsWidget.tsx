'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// TODO: 実際のデータ取得とAPIコールを実装
export function UnorganizedMaterialsWidget() {
  // プレースホルダーデータ
  const unorganizedMaterials = [
    { id: '1', title: '2024-01-15_recording', issue: 'タグなし' },
    { id: '2', title: 'Field_Recording_023', issue: '場所情報なし' },
    { id: '3', title: 'Audio_Test_001', issue: 'メモなし' },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground mb-2">メタデータが不足している素材</div>

      {unorganizedMaterials.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">整理が必要な素材はありません</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {unorganizedMaterials.map((material) => (
              <li key={material.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{material.title}</p>
                  <p className="text-xs text-muted-foreground">{material.issue}</p>
                </div>
                <Link href={`/materials/${material.id}/edit`}>
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
                すべて表示
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
