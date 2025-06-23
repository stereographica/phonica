'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { GridStack, GridStackNode } from 'gridstack';
import { useAtom, useSetAtom } from 'jotai';
import { dashboardLayoutAtom, removeWidgetAtom, WidgetLayout } from '@/store/dashboard';
import { WidgetContainer } from './WidgetContainer';
import { UnorganizedMaterialsWidget } from './widgets/UnorganizedMaterialsWidget';
import { TodaySoundWidget } from './widgets/TodaySoundWidget';
import { CollectionMapWidget } from './widgets/CollectionMapWidget';
import { RecordingCalendarWidget } from './widgets/RecordingCalendarWidget';
import { StatisticsWidget } from './widgets/StatisticsWidget';
import { WIDGET_METADATA } from '@/store/dashboard';

// GridStackのCSS
import 'gridstack/dist/gridstack.css';
import 'gridstack/dist/gridstack-extra.css';

// ウィジェットコンポーネントのマッピング
const widgetComponents = {
  unorganizedMaterials: UnorganizedMaterialsWidget,
  todaySound: TodaySoundWidget,
  collectionMap: CollectionMapWidget,
  recordingCalendar: RecordingCalendarWidget,
  statistics: StatisticsWidget,
};

export function DashboardGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridStackRef = useRef<GridStack | null>(null);
  const [layout, setLayout] = useAtom(dashboardLayoutAtom);
  const removeWidget = useSetAtom(removeWidgetAtom);
  const isInitialized = useRef(false);

  // レイアウト変更ハンドラー
  const handleLayoutChange = useCallback(() => {
    if (!gridStackRef.current || !isInitialized.current) return;

    const items = gridStackRef.current.engine.nodes;
    const newLayout: WidgetLayout[] = items.map((item: GridStackNode) => ({
      id: item.id!,
      type: item.el?.getAttribute('data-widget-type') as WidgetLayout['type'],
      x: item.x!,
      y: item.y!,
      w: item.w!,
      h: item.h!,
      minW: item.minW,
      maxW: item.maxW,
      minH: item.minH,
      maxH: item.maxH,
    }));

    setLayout(newLayout);
  }, [setLayout]);

  // ウィジェット削除ハンドラー
  const handleRemoveWidget = useCallback(
    (widgetId: string) => {
      if (gridStackRef.current) {
        const element = document.getElementById(widgetId);
        if (element) {
          gridStackRef.current.removeWidget(element);
        }
      }
      removeWidget(widgetId);
    },
    [removeWidget],
  );

  // GridStackの初期化
  useEffect(() => {
    if (!gridRef.current || isInitialized.current) return;

    // GridStackインスタンスの作成
    gridStackRef.current = GridStack.init(
      {
        column: 12,
        cellHeight: 70,
        margin: 10,
        float: true,
        animate: true,
        resizable: {
          handles: 'se, sw, ne, nw',
        },
        draggable: {
          handle: '.drag-handle',
        },
        alwaysShowResizeHandle: false,
      },
      gridRef.current,
    );

    // イベントリスナーの設定
    gridStackRef.current.on('change', handleLayoutChange);

    isInitialized.current = true;

    return () => {
      if (gridStackRef.current) {
        gridStackRef.current.destroy(false);
        gridStackRef.current = null;
        isInitialized.current = false;
      }
    };
  }, [handleLayoutChange]);

  // レイアウトの更新
  useEffect(() => {
    if (!gridStackRef.current || !isInitialized.current) return;

    // 既存のウィジェットをクリア
    gridStackRef.current.removeAll();

    // 新しいウィジェットを追加
    layout.forEach((widget) => {
      const WidgetComponent = widgetComponents[widget.type];
      const metadata = WIDGET_METADATA[widget.type];

      if (!WidgetComponent) return;

      const widgetElement = document.createElement('div');
      widgetElement.id = widget.id;
      widgetElement.setAttribute('data-widget-type', widget.type);
      widgetElement.className = 'grid-stack-item';
      widgetElement.setAttribute('data-gs-id', widget.id);
      widgetElement.setAttribute('data-gs-x', String(widget.x));
      widgetElement.setAttribute('data-gs-y', String(widget.y));
      widgetElement.setAttribute('data-gs-width', String(widget.w));
      widgetElement.setAttribute('data-gs-height', String(widget.h));
      widgetElement.setAttribute('data-gs-min-width', String(widget.minW || metadata.minW));
      widgetElement.setAttribute('data-gs-min-height', String(widget.minH || metadata.minH));
      if (widget.maxW) widgetElement.setAttribute('data-gs-max-width', String(widget.maxW));
      if (widget.maxH) widgetElement.setAttribute('data-gs-max-height', String(widget.maxH));

      const contentElement = document.createElement('div');
      contentElement.className = 'grid-stack-item-content';
      widgetElement.appendChild(contentElement);

      gridStackRef.current!.addWidget(widgetElement);
    });
  }, [layout]);

  return (
    <div className="dashboard-grid">
      <div ref={gridRef} className="grid-stack">
        {layout.map((widget) => {
          const WidgetComponent = widgetComponents[widget.type];
          const metadata = WIDGET_METADATA[widget.type];

          if (!WidgetComponent) return null;

          return (
            <div
              key={widget.id}
              id={widget.id}
              data-widget-type={widget.type}
              className="grid-stack-item"
              data-gs-id={widget.id}
              data-gs-x={widget.x}
              data-gs-y={widget.y}
              data-gs-width={widget.w}
              data-gs-height={widget.h}
              data-gs-min-width={widget.minW || metadata.minW}
              data-gs-min-height={widget.minH || metadata.minH}
            >
              <div className="grid-stack-item-content">
                <WidgetContainer
                  id={widget.id}
                  title={metadata.title}
                  onRemove={handleRemoveWidget}
                >
                  <WidgetComponent />
                </WidgetContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
