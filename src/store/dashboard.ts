import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ウィジェットの種類を定義
export type WidgetType =
  | 'unorganizedMaterials'
  | 'todaySound'
  | 'collectionMap'
  | 'recordingCalendar'
  | 'statistics';

// ウィジェットのレイアウト情報
export interface WidgetLayout {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

// ウィジェットのメタデータ（コンテンツに最適化されたサイズ）
export const WIDGET_METADATA: Record<
  WidgetType,
  {
    title: string;
    minW: number;
    minH: number;
    defaultW: number;
    defaultH: number;
  }
> = {
  unorganizedMaterials: {
    title: '要整理素材',
    minW: 3, // 最小サイズを小さく
    minH: 3, // 適度な高さで内容表示
    defaultW: 4, // よりコンパクトに
    defaultH: 3, // 内容に合わせて適度な高さ
  },
  todaySound: {
    title: '今日の音',
    minW: 3, // 最小サイズを小さく
    minH: 3, // 適度な高さ
    defaultW: 4, // よりコンパクトに
    defaultH: 3, // 内容に合わせて適度な高さ
  },
  collectionMap: {
    title: 'コレクションマップ',
    minW: 8, // マップには最低限の幅が必要
    minH: 2, // 最小高さを小さく
    defaultW: 12, // 全幅
    defaultH: 2, // マップはよりコンパクトに
  },
  recordingCalendar: {
    title: '録音カレンダー',
    minW: 6, // カレンダーには最低限の幅
    minH: 2, // 最小高さを小さく
    defaultW: 12, // 全幅
    defaultH: 2, // カレンダーはよりコンパクトに
  },
  statistics: {
    title: '統計データ',
    minW: 3, // 最小サイズを小さく
    minH: 3, // グラフに適した最小高さ
    defaultW: 4, // よりコンパクトに
    defaultH: 3, // グラフが適切に表示されるサイズ
  },
};

// デフォルトのレイアウト設定（コンテンツに最適化されたサイズ）
export const DEFAULT_LAYOUT: WidgetLayout[] = [
  {
    id: 'unorganized-1',
    type: 'unorganizedMaterials',
    x: 0,
    y: 0,
    w: 4, // コンパクトな幅
    h: 3, // 内容に合わせて適度な高さ
    minW: 3,
    minH: 3,
  },
  {
    id: 'statistics-1',
    type: 'statistics',
    x: 4,
    y: 0,
    w: 4, // コンパクトな幅
    h: 3, // グラフが適切に表示される高さ
    minW: 3,
    minH: 3,
  },
  {
    id: 'today-sound-1',
    type: 'todaySound',
    x: 8,
    y: 0,
    w: 4, // 右端に配置、コンパクト
    h: 3, // 内容に合わせて適度な高さ
    minW: 3,
    minH: 3,
  },
  {
    id: 'collection-map-1',
    type: 'collectionMap',
    x: 0,
    y: 3, // 上のウィジェットが高くなったので調整
    w: 12, // マップは全幅
    h: 2, // マップはよりコンパクトに
    minW: 8,
    minH: 2,
  },
  {
    id: 'recording-calendar-1',
    type: 'recordingCalendar',
    x: 0,
    y: 5, // 上のウィジェットの位置変更に合わせて調整
    w: 12, // カレンダーは全幅
    h: 2, // カレンダーのコンテンツに合わせてコンパクトに
    minW: 6,
    minH: 2,
  },
];

// レイアウトをLocalStorageに保存するatom（コンテンツ最適化版）
export const dashboardLayoutAtom = atomWithStorage<WidgetLayout[]>(
  'phonica-dashboard-layout-v11-ultrathink-fixed',
  DEFAULT_LAYOUT,
);

// レイアウトが変更されているかを判定するatom
export const isLayoutModifiedAtom = atom((get) => {
  const currentLayout = get(dashboardLayoutAtom);
  return JSON.stringify(currentLayout) !== JSON.stringify(DEFAULT_LAYOUT);
});

// レイアウトをリセットするためのatom
export const resetLayoutAtom = atom(null, (_get, set) => {
  set(dashboardLayoutAtom, DEFAULT_LAYOUT);
});

// ウィジェットを追加するためのatom
export const addWidgetAtom = atom(null, (get, set, widgetType: WidgetType) => {
  const currentLayout = get(dashboardLayoutAtom);
  const metadata = WIDGET_METADATA[widgetType];

  // 新しいウィジェットのIDを生成
  const existingIds = currentLayout.filter((w) => w.type === widgetType).length;
  const newId = `${widgetType}-${existingIds + 1}`;

  // 空いている位置を探す（簡易的な実装）
  let newY = 0;
  currentLayout.forEach((widget) => {
    if (widget.y + widget.h > newY) {
      newY = widget.y + widget.h;
    }
  });

  const newWidget: WidgetLayout = {
    id: newId,
    type: widgetType,
    x: 0,
    y: newY,
    w: metadata.defaultW,
    h: metadata.defaultH,
    minW: metadata.minW,
    minH: metadata.minH,
  };

  set(dashboardLayoutAtom, [...currentLayout, newWidget]);
});

// ウィジェットを削除するためのatom
export const removeWidgetAtom = atom(null, (get, set, widgetId: string) => {
  const currentLayout = get(dashboardLayoutAtom);
  set(
    dashboardLayoutAtom,
    currentLayout.filter((w) => w.id !== widgetId),
  );
});
