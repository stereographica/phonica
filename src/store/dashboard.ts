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

// ウィジェットのメタデータ
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
    minW: 2,
    minH: 3,
    defaultW: 4,
    defaultH: 5,
  },
  todaySound: {
    title: '今日の音',
    minW: 3,
    minH: 3,
    defaultW: 4,
    defaultH: 4,
  },
  collectionMap: {
    title: 'コレクションマップ',
    minW: 4,
    minH: 4,
    defaultW: 6,
    defaultH: 6,
  },
  recordingCalendar: {
    title: '録音カレンダー',
    minW: 4,
    minH: 3,
    defaultW: 6,
    defaultH: 4,
  },
  statistics: {
    title: '統計データ',
    minW: 3,
    minH: 3,
    defaultW: 4,
    defaultH: 5,
  },
};

// デフォルトのレイアウト設定
export const DEFAULT_LAYOUT: WidgetLayout[] = [
  {
    id: 'unorganized-1',
    type: 'unorganizedMaterials',
    x: 0,
    y: 0,
    w: 4,
    h: 5,
    minW: 2,
    minH: 3,
  },
  {
    id: 'today-sound-1',
    type: 'todaySound',
    x: 4,
    y: 0,
    w: 4,
    h: 4,
    minW: 3,
    minH: 3,
  },
  {
    id: 'statistics-1',
    type: 'statistics',
    x: 8,
    y: 0,
    w: 4,
    h: 5,
    minW: 3,
    minH: 3,
  },
  {
    id: 'collection-map-1',
    type: 'collectionMap',
    x: 0,
    y: 5,
    w: 6,
    h: 6,
    minW: 4,
    minH: 4,
  },
  {
    id: 'recording-calendar-1',
    type: 'recordingCalendar',
    x: 6,
    y: 5,
    w: 6,
    h: 4,
    minW: 4,
    minH: 3,
  },
];

// レイアウトをLocalStorageに保存するatom
export const dashboardLayoutAtom = atomWithStorage<WidgetLayout[]>(
  'phonica-dashboard-layout',
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
