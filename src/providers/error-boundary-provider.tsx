"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { useNotification } from "@/hooks/use-notification";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// エラーバウンダリコンポーネント
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h2 className="mb-4 text-2xl font-bold">予期しないエラーが発生しました</h2>
            <p className="mb-6 text-muted-foreground">
              申し訳ございません。エラーが発生しました。
              ページを再読み込みしてもう一度お試しください。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              ページを再読み込み
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  エラー詳細（開発環境のみ）
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 非同期エラーハンドラー（グローバルエラーをキャッチ）
export function GlobalErrorHandler({ children }: { children: ReactNode }) {
  const { notifyError } = useNotification();

  React.useEffect(() => {
    // 未処理のPromiseリジェクションをキャッチ
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      notifyError(event.reason, {
        operation: "system",
        entity: "global",
      });
    };

    // グローバルエラーをキャッチ
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
      notifyError(event.error, {
        operation: "system",
        entity: "global",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, [notifyError]);

  return <>{children}</>;
}

// エラーバウンダリプロバイダー（両方の機能を統合）
export function ErrorBoundaryProvider({ children }: Props) {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>{children}</GlobalErrorHandler>
    </ErrorBoundary>
  );
}