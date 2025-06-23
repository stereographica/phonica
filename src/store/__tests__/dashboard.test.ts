import { renderHook, act } from '@testing-library/react';
import { useAtom, useSetAtom, useAtomValue, Provider } from 'jotai';
import { createStore } from 'jotai';
import React from 'react';
import {
  dashboardLayoutAtom,
  isLayoutModifiedAtom,
  resetLayoutAtom,
  addWidgetAtom,
  removeWidgetAtom,
  DEFAULT_LAYOUT,
  WidgetType,
  WIDGET_METADATA,
} from '../dashboard';

describe('Dashboard Store', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    // 各テストの前に新しいストアを作成
    store = createStore();
    // LocalStorageをクリア
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  describe('dashboardLayoutAtom', () => {
    it('初期値としてDEFAULT_LAYOUTを持つ', () => {
      const { result } = renderHook(() => useAtomValue(dashboardLayoutAtom), { wrapper });
      expect(result.current).toEqual(DEFAULT_LAYOUT);
    });

    it('レイアウトを更新できる', () => {
      const { result } = renderHook(() => useAtom(dashboardLayoutAtom), { wrapper });
      const [, setLayout] = result.current;

      const newLayout = [...DEFAULT_LAYOUT];
      newLayout[0] = { ...newLayout[0], x: 10, y: 10 };

      act(() => {
        setLayout(newLayout);
      });

      expect(result.current[0]).toEqual(newLayout);
    });

    it('LocalStorageに保存される', () => {
      const { result } = renderHook(() => useAtom(dashboardLayoutAtom), { wrapper });
      const [, setLayout] = result.current;

      const newLayout = [...DEFAULT_LAYOUT];
      newLayout[0] = { ...newLayout[0], x: 10 };

      act(() => {
        setLayout(newLayout);
      });

      const savedData = localStorage.getItem('phonica-dashboard-layout-v11-ultrathink-fixed');
      expect(savedData).toBeTruthy();
      expect(JSON.parse(savedData!)).toEqual(newLayout);
    });
  });

  describe('isLayoutModifiedAtom', () => {
    it('初期状態ではfalseを返す', () => {
      const { result } = renderHook(() => useAtomValue(isLayoutModifiedAtom), { wrapper });
      expect(result.current).toBe(false);
    });

    it('レイアウトが変更されるとtrueを返す', () => {
      const { result: layoutResult } = renderHook(() => useAtom(dashboardLayoutAtom), { wrapper });
      const { result: modifiedResult } = renderHook(() => useAtomValue(isLayoutModifiedAtom), {
        wrapper,
      });

      const [, setLayout] = layoutResult.current;
      const newLayout = [...DEFAULT_LAYOUT];
      newLayout[0] = { ...newLayout[0], x: 10 };

      act(() => {
        setLayout(newLayout);
      });

      expect(modifiedResult.current).toBe(true);
    });
  });

  describe('resetLayoutAtom', () => {
    it('レイアウトをデフォルトにリセットする', () => {
      const { result: layoutResult } = renderHook(() => useAtom(dashboardLayoutAtom), { wrapper });
      const { result: resetResult } = renderHook(() => useSetAtom(resetLayoutAtom), { wrapper });
      const { result: modifiedResult } = renderHook(() => useAtomValue(isLayoutModifiedAtom), {
        wrapper,
      });

      const [, setLayout] = layoutResult.current;
      const reset = resetResult.current;

      // レイアウトを変更
      const newLayout = [...DEFAULT_LAYOUT];
      newLayout[0] = { ...newLayout[0], x: 10 };

      act(() => {
        setLayout(newLayout);
      });

      expect(modifiedResult.current).toBe(true);

      // リセット
      act(() => {
        reset();
      });

      expect(layoutResult.current[0]).toEqual(DEFAULT_LAYOUT);
      expect(modifiedResult.current).toBe(false);
    });
  });

  describe('addWidgetAtom', () => {
    it('新しいウィジェットを追加する', () => {
      const { result: layoutResult } = renderHook(() => useAtomValue(dashboardLayoutAtom), {
        wrapper,
      });
      const { result: addResult } = renderHook(() => useSetAtom(addWidgetAtom), { wrapper });

      const addWidget = addResult.current;
      const widgetType: WidgetType = 'statistics';

      act(() => {
        addWidget(widgetType);
      });

      const currentLayout = layoutResult.current;
      expect(currentLayout.length).toBe(DEFAULT_LAYOUT.length + 1);

      const newWidget = currentLayout[currentLayout.length - 1];
      expect(newWidget.type).toBe(widgetType);
      expect(newWidget.id).toBe('statistics-2'); // 既にstatistics-1が存在するため
      expect(newWidget.w).toBe(WIDGET_METADATA[widgetType].defaultW);
      expect(newWidget.h).toBe(WIDGET_METADATA[widgetType].defaultH);
    });

    it('新しいウィジェットは既存のウィジェットの下に配置される', () => {
      const { result: layoutResult } = renderHook(() => useAtomValue(dashboardLayoutAtom), {
        wrapper,
      });
      const { result: addResult } = renderHook(() => useSetAtom(addWidgetAtom), { wrapper });

      const addWidget = addResult.current;

      act(() => {
        addWidget('todaySound');
      });

      const currentLayout = layoutResult.current;
      const newWidget = currentLayout[currentLayout.length - 1];

      // 最も下にあるウィジェットのy + hより大きいyを持つはず
      const maxY = Math.max(...DEFAULT_LAYOUT.map((w) => w.y + w.h));
      expect(newWidget.y).toBeGreaterThanOrEqual(maxY);
    });
  });

  describe('removeWidgetAtom', () => {
    it('指定されたウィジェットを削除する', () => {
      const { result: layoutResult } = renderHook(() => useAtomValue(dashboardLayoutAtom), {
        wrapper,
      });
      const { result: removeResult } = renderHook(() => useSetAtom(removeWidgetAtom), { wrapper });

      const removeWidget = removeResult.current;
      const widgetToRemove = DEFAULT_LAYOUT[0];

      act(() => {
        removeWidget(widgetToRemove.id);
      });

      const currentLayout = layoutResult.current;
      expect(currentLayout.length).toBe(DEFAULT_LAYOUT.length - 1);
      expect(currentLayout.find((w) => w.id === widgetToRemove.id)).toBeUndefined();
    });

    it('存在しないIDを指定してもエラーにならない', () => {
      const { result: layoutResult } = renderHook(() => useAtomValue(dashboardLayoutAtom), {
        wrapper,
      });
      const { result: removeResult } = renderHook(() => useSetAtom(removeWidgetAtom), { wrapper });

      const removeWidget = removeResult.current;

      act(() => {
        removeWidget('non-existent-id');
      });

      const currentLayout = layoutResult.current;
      expect(currentLayout).toEqual(DEFAULT_LAYOUT);
    });
  });

  describe('WIDGET_METADATA', () => {
    it('すべてのウィジェットタイプのメタデータが定義されている', () => {
      const widgetTypes: WidgetType[] = [
        'unorganizedMaterials',
        'todaySound',
        'collectionMap',
        'recordingCalendar',
        'statistics',
      ];

      widgetTypes.forEach((type) => {
        expect(WIDGET_METADATA[type]).toBeDefined();
        expect(WIDGET_METADATA[type].title).toBeTruthy();
        expect(WIDGET_METADATA[type].minW).toBeGreaterThan(0);
        expect(WIDGET_METADATA[type].minH).toBeGreaterThan(0);
        expect(WIDGET_METADATA[type].defaultW).toBeGreaterThanOrEqual(WIDGET_METADATA[type].minW);
        expect(WIDGET_METADATA[type].defaultH).toBeGreaterThanOrEqual(WIDGET_METADATA[type].minH);
      });
    });
  });
});
