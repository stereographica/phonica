'use client';

import React, { useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  dashboardLayoutAtom,
  isLayoutModifiedAtom,
  resetLayoutAtom,
  addWidgetAtom,
  WIDGET_METADATA,
  WidgetType,
} from '@/store/dashboard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DashboardControls() {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const layout = useAtomValue(dashboardLayoutAtom);
  const isModified = useAtomValue(isLayoutModifiedAtom);
  const resetLayout = useSetAtom(resetLayoutAtom);
  const addWidget = useSetAtom(addWidgetAtom);

  // 現在のレイアウトに存在しないウィジェットタイプを取得
  const availableWidgets = Object.entries(WIDGET_METADATA).filter(([type]) => {
    // 同じタイプのウィジェットを複数追加できるようにする場合は、この条件を削除
    return !layout.some((widget) => widget.type === type);
  });

  const handleReset = () => {
    resetLayout();
    setShowResetDialog(false);
  };

  const handleAddWidget = (type: WidgetType) => {
    addWidget(type);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* ウィジェット追加メニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              ウィジェット追加
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>追加可能なウィジェット</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableWidgets.length > 0 ? (
              availableWidgets.map(([type, metadata]) => (
                <DropdownMenuItem key={type} onClick={() => handleAddWidget(type as WidgetType)}>
                  {metadata.title}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>すべてのウィジェットが追加済みです</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* レイアウトリセットボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResetDialog(true)}
          disabled={!isModified}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          リセット
        </Button>
      </div>

      {/* リセット確認ダイアログ */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>レイアウトをリセットしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              現在のダッシュボードレイアウトをデフォルトの状態に戻します。
              この操作は取り消すことができません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>リセット</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
