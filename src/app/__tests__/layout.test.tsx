import React from 'react';
import { render } from '@testing-library/react';
import RootLayout from '../layout';

// ReactQueryProviderをモック
jest.mock('@/lib/react-query', () => ({
  ReactQueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-query-provider">{children}</div>
  ),
}));

// Next.jsのフォントをモック
jest.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
  }),
}));

describe('RootLayout', () => {
  it('renders children within ReactQueryProvider', () => {
    // RootLayoutはhtml要素を返すので、document内での確認が必要
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>,
      {
        container: document.documentElement,
      },
    );

    // 子要素が正しくレンダリングされることを確認
    expect(document.body.innerHTML).toContain('Test Content');
    expect(document.body.innerHTML).toContain('react-query-provider');
  });

  it('applies correct classes to body element', () => {
    render(
      <RootLayout>
        <div>Test</div>
      </RootLayout>,
      {
        container: document.documentElement,
      },
    );

    // body要素のクラスを確認
    const body = document.body;
    expect(body.className).toContain('antialiased');
  });

  it('wraps content with ReactQueryProvider', () => {
    render(
      <RootLayout>
        <div data-testid="child">Child Element</div>
      </RootLayout>,
      {
        container: document.documentElement,
      },
    );

    // ReactQueryProviderでラップされていることを確認
    const childElement = document.querySelector('[data-testid="child"]');
    const providerElement = document.querySelector('[data-testid="react-query-provider"]');

    expect(childElement).toBeInTheDocument();
    expect(providerElement).toBeInTheDocument();
  });
});
