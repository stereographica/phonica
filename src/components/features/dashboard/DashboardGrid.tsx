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
  const [isClient, setIsClient] = React.useState(false);
  const removeWidget = useSetAtom(removeWidgetAtom);
  const isInitialized = useRef(false);
  const layoutUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);
  }, []);

  // レイアウト変更ハンドラー（ドラッグ・リサイズ対応版）
  const handleLayoutChange = useCallback(() => {
    if (!gridStackRef.current || !isInitialized.current) return;

    // デバウンスでレイアウト更新の頻度を制限
    if (layoutUpdateTimeoutRef.current) {
      clearTimeout(layoutUpdateTimeoutRef.current);
    }
    layoutUpdateTimeoutRef.current = setTimeout(() => {
      if (!gridStackRef.current || !isInitialized.current) return;

      try {
        const nodes = gridStackRef.current.engine.nodes;

        // アイテムが存在し、かつ有効な状態であることを確認
        if (!nodes || nodes.length === 0) {
          console.warn('GridStack nodes are empty, skipping layout update');
          return;
        }

        // 現在のレイアウトと比較して、実際に変更があった場合のみ更新
        const newLayout: WidgetLayout[] = nodes
          .filter((item) => item.id && item.el) // 有効なアイテムのみフィルター
          .map((item: GridStackNode) => {
            const widgetType = item.el?.getAttribute('data-widget-type') as WidgetLayout['type'];
            return {
              id: item.id!,
              type: widgetType,
              x: item.x!,
              y: item.y!,
              w: item.w!,
              h: item.h!,
              minW: item.minW,
              maxW: item.maxW,
              minH: item.minH,
              maxH: item.maxH,
            };
          });

        // レイアウトが実際に変更された場合のみ状態を更新
        if (newLayout.length > 0 && newLayout.length === 5) {
          // 5つのウィジェット確認
          console.log(
            'Layout updated:',
            newLayout.map((l) => `${l.id}: ${l.w}x${l.h}`),
          );
          setLayout(newLayout);
        } else {
          console.warn(`Invalid layout: ${newLayout.length} widgets found, expected 5`);
        }
      } catch (error) {
        console.error('Error in handleLayoutChange:', error);
      }
    }, 100); // デバウンス時間を100msに短縮してレスポンス性向上
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

  // GridStackの初期化（クライアントサイドのみ）
  useEffect(() => {
    // SSR対応：windowオブジェクトが存在しない場合は初期化をスキップ
    if (typeof window === 'undefined' || !isClient || !gridRef.current || isInitialized.current)
      return;

    // GridStackインスタンスの作成（絶対高さ指定版）
    gridStackRef.current = GridStack.init(
      {
        column: 12,
        cellHeight: 150, // 絶対値で指定（150px）
        minRow: 1,
        margin: 10,
        float: true,
        animate: true,
        acceptWidgets: false,
        removable: false,
        staticGrid: false,
        resizable: {
          handles: 'e, s, se',
          autoHide: false,
        },
        draggable: {
          handle: '.drag-handle',
          scroll: true,
        },
        alwaysShowResizeHandle: true,
      },
      gridRef.current,
    );

    // イベントリスナーの設定（ドラッグ・リサイズ対応）
    gridStackRef.current.on('change', handleLayoutChange);
    gridStackRef.current.on('resizestop', handleLayoutChange);
    gridStackRef.current.on('dragstop', handleLayoutChange);

    // 初期ウィジェット要素をGridStackに登録（完全修正版）
    setTimeout(() => {
      if (!gridStackRef.current || !gridRef.current) return;

      const initialGridItems = gridRef.current.querySelectorAll('.grid-stack-item');
      if (initialGridItems && initialGridItems.length > 0) {
        console.log(`Initializing ${initialGridItems.length} widgets with layout:`, layout);

        // GridStackに要素を追加（v11 API完全対応）
        layout.forEach((widgetData, index) => {
          try {
            if (gridStackRef.current) {
              const element = document.getElementById(widgetData.id);

              if (element) {
                // GridStack v11では、makeWidget()の第二引数でオプションを指定
                const gridOptions = {
                  x: widgetData.x,
                  y: widgetData.y,
                  w: widgetData.w,
                  h: widgetData.h,
                  id: widgetData.id,
                  minW: widgetData.minW,
                  maxW: widgetData.maxW,
                  minH: widgetData.minH,
                  maxH: widgetData.maxH,
                };

                // v11のmakeWidget()を正しく使用
                const node = gridStackRef.current.makeWidget(element, gridOptions);
                console.log(
                  `Widget ${index + 1} (${widgetData.id}) initialized: ${widgetData.w}x${widgetData.h} at (${widgetData.x},${widgetData.y})`,
                );

                // ノードが作成された後、レイアウト情報を追加で適用
                if (node) {
                  // update()でレイアウト情報を確実に適用
                  gridStackRef.current.update(element, gridOptions);

                  console.log(`Created node details:`, {
                    id: (node as GridStackNode).id,
                    x: (node as GridStackNode).x,
                    y: (node as GridStackNode).y,
                    w: (node as GridStackNode).w,
                    h: (node as GridStackNode).h,
                  });
                } else {
                  console.warn(`Failed to create node for widget: ${widgetData.id}`);
                }
              } else {
                console.warn(`DOM element not found for widget ID: ${widgetData.id}`);
              }
            }
          } catch (error) {
            console.error(`Error initializing widget ${index + 1} (${widgetData.id}):`, error);
          }
        });

        // 初期化後のGridStack状態確認と最終調整
        setTimeout(() => {
          if (gridStackRef.current) {
            // レイアウトの更新を強制実行
            gridStackRef.current.commit();

            // GridStackのサイズ再計算
            try {
              // リサイズメソッドを呼び出すのではなくグリッドをリフレッシュ
              gridStackRef.current.commit();
            } catch (error) {
              console.warn('Grid refresh failed:', error);
            }

            const nodes = gridStackRef.current.engine.nodes;
            console.log(
              'GridStack nodes after initialization:',
              nodes.map((n) => `${n.id}: ${n.w}x${n.h}`),
            );

            // 最終的なサイズとポジションを確認
            nodes.forEach((node, index) => {
              console.log(`Final node ${index + 1}:`, {
                id: node.id,
                x: node.x,
                y: node.y,
                w: node.w,
                h: node.h,
                element: node.el?.id,
              });
            });
          }
        }, 200);
      } else {
        console.warn('No initial grid items found');
      }

      isInitialized.current = true;
      console.log('GridStack initialization completed with cellHeight: 150px');
    }, 150); // より長い遅延でDOM要素の確実な存在を保証

    return () => {
      // タイムアウトをクリア
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }

      if (gridStackRef.current) {
        // イベントリスナーを削除
        gridStackRef.current.off('change');
        gridStackRef.current.off('resizestop');
        gridStackRef.current.off('dragstop');

        gridStackRef.current.destroy(false);
        gridStackRef.current = null;
        isInitialized.current = false;
      }
    };
  }, [handleLayoutChange, isClient, layout]);

  // ウィジェットが追加・削除された場合の処理（安定性重視の完全改修版）
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !isClient ||
      !gridStackRef.current ||
      !isInitialized.current
    )
      return;

    // デバウンスでGridStackの変更処理を制限
    const timeoutId = setTimeout(() => {
      if (!gridStackRef.current || !isInitialized.current) return;

      try {
        const currentGridWidgets = Array.from(gridStackRef.current.engine.nodes)
          .filter((node) => node.id && node.el) // 有効なノードのみ
          .map((node) => node.id!);
        const newLayoutIds = layout.map((widget) => widget.id);

        // ウィジェット数が同じで、全て一致する場合は何もしない（位置変更のみ）
        if (
          currentGridWidgets.length === newLayoutIds.length &&
          currentGridWidgets.every((id) => newLayoutIds.includes(id)) &&
          newLayoutIds.every((id) => currentGridWidgets.includes(id))
        ) {
          return;
        }

        // 新しく追加されたウィジェットを検出
        const addedIds = newLayoutIds.filter((id) => !currentGridWidgets.includes(id));

        // 削除されたウィジェットを検出
        const removedIds = currentGridWidgets.filter((id) => !newLayoutIds.includes(id));

        // 削除処理：削除されたウィジェットを GridStack から削除
        removedIds.forEach((id) => {
          try {
            const element = document.getElementById(id);
            if (element && gridStackRef.current) {
              gridStackRef.current.removeWidget(element, false);
            }
          } catch (error) {
            console.error(`Error removing widget ${id}:`, error);
          }
        });

        // 追加処理：新しく追加されたウィジェットを GridStack に登録
        addedIds.forEach((id) => {
          try {
            const element = document.getElementById(id);
            if (element && gridStackRef.current) {
              gridStackRef.current.makeWidget(element);
            }
          } catch (error) {
            console.error(`Error adding widget ${id}:`, error);
          }
        });

        console.log(`Widget sync: ${removedIds.length} removed, ${addedIds.length} added`);
      } catch (error) {
        console.error('Error in widget sync:', error);
      }
    }, 100); // 100ms のデバウンス

    return () => clearTimeout(timeoutId);
  }, [layout, isClient]);

  if (!isClient) {
    return (
      <div className="dashboard-grid">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">ダッシュボードを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <div ref={gridRef} className="grid-stack">
        {layout.map((widget) => {
          const WidgetComponent = widgetComponents[widget.type];
          const metadata = WIDGET_METADATA[widget.type];

          if (!WidgetComponent) return null;

          return (
            <div
              key={widget.id} // シンプルで安定したkey（IDのみ使用）
              id={widget.id}
              data-widget-type={widget.type}
              className="grid-stack-item"
              // data-gs-*属性は明示的に設定（makeWidget時に参照される）
              data-gs-id={widget.id}
              data-gs-x={widget.x}
              data-gs-y={widget.y}
              data-gs-w={widget.w}
              data-gs-h={widget.h}
              data-gs-min-w={widget.minW || metadata.minW}
              data-gs-max-w={widget.maxW || metadata.defaultW}
              data-gs-min-h={widget.minH || metadata.minH}
              data-gs-max-h={widget.maxH || metadata.defaultH + 4}
              // スタイルでサイズを強制適用（150px基準）
              style={{
                minHeight: `${150 * widget.h + 10 * (widget.h - 1)}px`,
                height: 'auto',
              }}
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
