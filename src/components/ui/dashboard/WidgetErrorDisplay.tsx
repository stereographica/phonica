import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface WidgetErrorDisplayProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  variant?: 'network' | 'server' | 'client' | 'default';
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

/**
 * ウィジェット用統一エラー表示コンポーネント
 *
 * 機能:
 * - エラータイプ別のアイコンとメッセージ
 * - 統一された日本語エラーメッセージ
 * - リトライ機能付き
 * - サイズバリエーション対応
 */
export function WidgetErrorDisplay({
  title,
  message,
  error,
  onRetry,
  variant = 'default',
  size = 'md',
  showDetails = process.env.NODE_ENV === 'development',
}: WidgetErrorDisplayProps) {
  // エラータイプ別の設定
  const errorConfig = {
    network: {
      icon: WifiOff,
      defaultTitle: 'ネットワークエラー',
      defaultMessage: 'インターネット接続を確認してください',
      iconClass: 'text-orange-500',
    },
    server: {
      icon: Server,
      defaultTitle: 'サーバーエラー',
      defaultMessage: 'サーバーとの通信に失敗しました',
      iconClass: 'text-red-500',
    },
    client: {
      icon: AlertTriangle,
      defaultTitle: 'アプリケーションエラー',
      defaultMessage: 'アプリケーション内でエラーが発生しました',
      iconClass: 'text-amber-500',
    },
    default: {
      icon: AlertCircle,
      defaultTitle: 'エラー',
      defaultMessage: 'データの読み込みに失敗しました',
      iconClass: 'text-red-500',
    },
  };

  // サイズ別の設定
  const sizeConfig = {
    sm: {
      container: 'p-3',
      icon: 'h-6 w-6',
      title: 'text-sm font-medium',
      message: 'text-xs',
      button: 'text-xs px-2 py-1',
    },
    md: {
      container: 'p-4',
      icon: 'h-8 w-8',
      title: 'text-base font-semibold',
      message: 'text-sm',
      button: 'text-sm px-3 py-1.5',
    },
    lg: {
      container: 'p-6',
      icon: 'h-12 w-12',
      title: 'text-lg font-semibold',
      message: 'text-base',
      button: 'text-base px-4 py-2',
    },
  };

  const config = errorConfig[variant];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  // エラー詳細の取得
  const errorDetails = React.useMemo(() => {
    if (!error) return null;

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }

    return JSON.stringify(error, null, 2);
  }, [error]);

  return (
    <Card
      className={`${sizeStyles.container} flex flex-col items-center justify-center text-center space-y-3`}
    >
      <Icon className={`${sizeStyles.icon} ${config.iconClass}`} />

      <div className="space-y-1">
        <h3 className={`${sizeStyles.title} text-foreground`}>{displayTitle}</h3>
        <p className={`${sizeStyles.message} text-muted-foreground max-w-sm`}>{displayMessage}</p>
      </div>

      {showDetails && errorDetails && (
        <details className="w-full max-w-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            エラー詳細
          </summary>
          <pre className="mt-2 p-2 bg-muted text-xs text-left overflow-auto max-h-32 rounded border">
            {typeof errorDetails === 'string'
              ? errorDetails
              : `${errorDetails.message}\n\n${errorDetails.stack}`}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          再試行
        </Button>
      )}
    </Card>
  );
}

/**
 * ウィジェット内エラー表示（コンパクト版）
 */
export function InlineWidgetError({
  message = 'データの読み込みに失敗しました',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-4 text-center">
      <div className="space-y-2">
        <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-xs text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            再試行
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ネットワークエラー専用表示
 */
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <WidgetErrorDisplay
      variant="network"
      title="接続エラー"
      message="インターネット接続を確認してから再試行してください"
      onRetry={onRetry}
    />
  );
}

/**
 * サーバーエラー専用表示
 */
export function ServerErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <WidgetErrorDisplay
      variant="server"
      title="サーバーエラー"
      message="サーバーが一時的に利用できません。しばらく待ってから再試行してください"
      onRetry={onRetry}
    />
  );
}

/**
 * APIエラー応答からエラータイプを判定
 */
export function getErrorVariant(error: unknown): WidgetErrorDisplayProps['variant'] {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }

    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server';
    }

    if (
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404')
    ) {
      return 'client';
    }
  }

  return 'default';
}

/**
 * エラーからユーザーフレンドリーなメッセージを生成
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワーク接続に問題があります';
    }

    if (message.includes('500')) {
      return 'サーバー内部エラーが発生しました';
    }

    if (message.includes('404')) {
      return 'データが見つかりませんでした';
    }

    if (message.includes('401')) {
      return '認証が必要です';
    }

    if (message.includes('403')) {
      return 'アクセス権限がありません';
    }
  }

  return 'データの読み込みに失敗しました';
}
