import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundaryProvider, GlobalErrorHandler } from '../error-boundary-provider';
import { useNotification } from '@/hooks/use-notification';

// useNotificationをモック
jest.mock('@/hooks/use-notification');

// window.location.reloadをモック
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

// コンソールメソッドをモック
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundaryProvider', () => {
  const mockNotifyError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotification as jest.Mock).mockReturnValue({
      notifyError: mockNotifyError,
    });
  });

  describe('ErrorBoundary', () => {
    // エラーをスローするコンポーネント
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    it('エラーが発生していない場合は子コンポーネントを表示', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={false} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('エラーが発生した場合はエラー画面を表示', () => {
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ページを再読み込み' })).toBeInTheDocument();
    });

    it('再読み込みボタンをクリックするとページがリロードされる', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      const reloadButton = screen.getByRole('button', { name: 'ページを再読み込み' });
      await user.click(reloadButton);

      expect(mockReload).toHaveBeenCalled();
    });

    it('開発環境ではエラーの詳細を表示', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });

      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.getByText('エラー詳細（開発環境のみ）')).toBeInTheDocument();

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });

    it('本番環境ではエラーの詳細を表示しない', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });

      render(
        <ErrorBoundaryProvider>
          <ThrowError shouldThrow={true} />
        </ErrorBoundaryProvider>
      );

      expect(screen.queryByText('エラー詳細（開発環境のみ）')).not.toBeInTheDocument();

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      });
    });
  });

  describe('GlobalErrorHandler', () => {
    it('未処理のPromiseリジェクションをキャッチして通知を表示', () => {
      render(
        <GlobalErrorHandler>
          <div>Test content</div>
        </GlobalErrorHandler>
      );

      const testError = new Error('Unhandled promise rejection');
      // PromiseRejectionEventのモック（JSDOMでは未定義のため）
      interface PromiseRejectionEventLike extends Event {
        reason?: unknown;
        promise?: Promise<unknown>;
      }
      const event = new Event('unhandledrejection') as PromiseRejectionEventLike;
      event.reason = testError;
      // Promiseの処理をキャッチして実際のエラーを防ぐ
      event.promise = Promise.reject(testError).catch(() => {});

      window.dispatchEvent(event);

      expect(mockNotifyError).toHaveBeenCalledWith(testError, {
        operation: 'system',
        entity: 'global',
      });
    });

    it('グローバルエラーをキャッチして通知を表示', () => {
      render(
        <GlobalErrorHandler>
          <div>Test content</div>
        </GlobalErrorHandler>
      );

      const testError = new Error('Global error');
      const event = new ErrorEvent('error', {
        error: testError,
      });

      window.dispatchEvent(event);

      expect(mockNotifyError).toHaveBeenCalledWith(testError, {
        operation: 'system',
        entity: 'global',
      });
    });

    it('アンマウント時にイベントリスナーがクリーンアップされる', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <GlobalErrorHandler>
          <div>Test content</div>
        </GlobalErrorHandler>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});