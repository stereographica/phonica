import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../page';

// コンポーネントのモック
jest.mock('@/components/features/dashboard/DashboardGrid', () => ({
  DashboardGrid: () => <div data-testid="dashboard-grid">Dashboard Grid</div>,
}));

jest.mock('@/components/features/dashboard/DashboardControls', () => ({
  DashboardControls: () => <div data-testid="dashboard-controls">Dashboard Controls</div>,
}));

describe('DashboardPage', () => {
  it('ページタイトルを表示する', () => {
    render(<DashboardPage />);

    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('録音活動の概要とコレクションの統計情報')).toBeInTheDocument();
  });

  it('DashboardGridコンポーネントをレンダリングする', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
  });

  it('DashboardControlsコンポーネントをレンダリングする', () => {
    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard-controls')).toBeInTheDocument();
  });

  it('適切なレイアウト構造を持つ', () => {
    const { container } = render(<DashboardPage />);

    // 全体のコンテナ
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass('space-y-6');

    // ヘッダーセクションのレイアウト
    const headerSection = container.querySelector('.flex.items-center.justify-between');
    expect(headerSection).toBeInTheDocument();

    // タイトルセクション
    const titleSection = headerSection?.firstChild;
    expect(titleSection).toBeInTheDocument();

    // h1要素の確認
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('ダッシュボード');
    expect(h1).toHaveClass('text-2xl', 'font-semibold');

    // 説明文の確認
    const description = screen.getByText('録音活動の概要とコレクションの統計情報');
    expect(description).toHaveClass('text-sm', 'text-muted-foreground', 'mt-1');
  });

  it('コンポーネントの配置順序が正しい', () => {
    const { container } = render(<DashboardPage />);

    const elements = container.querySelectorAll('[data-testid]');
    expect(elements[0]).toHaveAttribute('data-testid', 'dashboard-controls');
    expect(elements[1]).toHaveAttribute('data-testid', 'dashboard-grid');
  });
});
