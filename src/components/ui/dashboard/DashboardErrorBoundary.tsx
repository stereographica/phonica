'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ダッシュボード専用のエラーバウンダリー
 *
 * 機能:
 * - ウィジェット内でのJavaScriptエラーをキャッチ
 * - 適切な日本語エラーメッセージ表示
 * - エラー復旧機能（リロード）
 * - カスタムフォールバックUI対応
 */
export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);

    // カスタムエラーハンドラーが提供されている場合は実行
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // エラー情報をセッションストレージに保存（デバッグ用）
    try {
      sessionStorage.setItem(
        'dashboard-error',
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (storageError) {
      console.warn('Failed to save error info to session storage:', storageError);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラー表示
      return (
        <Card className="p-6 m-4">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-orange-500" />

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">ウィジェットエラー</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                このウィジェットの表示中にエラーが発生しました。 一時的な問題の可能性があります。
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    エラー詳細（開発者向け）
                  </summary>
                  <pre className="mt-2 p-2 bg-muted text-xs overflow-auto max-h-32 rounded">
                    {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>

              <Button variant="default" size="sm" onClick={this.handleReload}>
                ページを更新
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
