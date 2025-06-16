import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalSearch } from '../GlobalSearch';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// fetchのモック
global.fetch = jest.fn();

// テスト用のQueryClientProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('GlobalSearch', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders search input', () => {
    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    expect(screen.getByPlaceholderText('Search materials...')).toBeInTheDocument();
  });

  it('shows search results when typing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSearchResponse = {
      data: {
        materials: [
          {
            id: '1',
            slug: 'forest-sound',
            title: 'Forest Sound',
            locationName: 'Tokyo',
            score: 100,
          },
        ],
        tags: [
          {
            id: '2',
            name: 'nature',
            slug: 'nature',
            _count: { materials: 5 },
          },
        ],
        equipment: [
          {
            id: '3',
            name: 'Zoom H6',
            manufacturer: 'Zoom',
          },
        ],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 3,
      },
      query: 'forest',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.type(input, 'forest');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('MATERIALS')).toBeInTheDocument();
    });

    expect(screen.getByText('Forest Sound')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('nature')).toBeInTheDocument();
    expect(screen.getByText('5 materials')).toBeInTheDocument();
    expect(screen.getByText('Zoom H6')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
  });

  it('navigates to material detail when clicking material', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSearchResponse = {
      data: {
        materials: [
          {
            id: '1',
            slug: 'forest-sound',
            title: 'Forest Sound',
            score: 100,
          },
        ],
        tags: [],
        equipment: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 1,
      },
      query: 'forest',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.type(input, 'forest');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Forest Sound')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Forest Sound'));

    expect(mockPush).toHaveBeenCalledWith('/materials/forest-sound');
  });

  it('navigates to materials list with tag filter when clicking tag', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSearchResponse = {
      data: {
        materials: [],
        tags: [
          {
            id: '2',
            name: 'nature',
            slug: 'nature',
            _count: { materials: 5 },
          },
        ],
        equipment: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 1,
      },
      query: 'nature',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.type(input, 'nature');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('nature')).toBeInTheDocument();
    });

    await user.click(screen.getByText('nature'));

    expect(mockPush).toHaveBeenCalledWith('/materials?tags=nature');
  });

  it('shows no results message when no matches found', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSearchResponse = {
      data: {
        materials: [],
        tags: [],
        equipment: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 0,
        totalItems: 0,
      },
      query: 'xyz',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.type(input, 'xyz');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('No results found for "xyz"')).toBeInTheDocument();
    });
  });

  it('closes popover when pressing Escape', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const mockSearchResponse = {
      data: {
        materials: [
          {
            id: '1',
            slug: 'test',
            title: 'Test Material',
            score: 100,
          },
        ],
        tags: [],
        equipment: [],
      },
      pagination: {
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 1,
      },
      query: 'test',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.click(input);
      await user.clear(input);
      await user.type(input, 'test');
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Material')).toBeInTheDocument();
    });

    await act(async () => {
      await user.keyboard('{Escape}');
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Material')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while searching', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // 遅延のあるレスポンスをモック
    let resolvePromise: ((value: unknown) => void) | undefined;
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(
      <TestWrapper>
        <GlobalSearch />
      </TestWrapper>,
    );

    const input = screen.getByPlaceholderText('Search materials...');

    await act(async () => {
      await user.type(input, 'test');
      jest.advanceTimersByTime(300);
    });

    // ローディング状態を確認
    await waitFor(() => {
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    // レスポンスを解決してローディングを終了
    act(() => {
      if (resolvePromise) {
        resolvePromise({
          ok: true,
          json: async () => ({
            data: { materials: [], tags: [], equipment: [] },
            pagination: { page: 1, limit: 10, totalPages: 0, totalItems: 0 },
            query: 'test',
          }),
        });
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates through results with arrow keys', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockSearchResponse = {
        data: {
          materials: [
            { id: '1', slug: 'material-1', title: 'Material 1' },
            { id: '2', slug: 'material-2', title: 'Material 2' },
          ],
          tags: [{ id: '3', name: 'tag-1', slug: 'tag-1' }],
          equipment: [{ id: '4', name: 'Equipment 1' }],
        },
        pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 4 },
        query: 'test',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      });

      render(
        <TestWrapper>
          <GlobalSearch />
        </TestWrapper>,
      );

      const input = screen.getByPlaceholderText('Search materials...');

      await act(async () => {
        await user.type(input, 'test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Material 1')).toBeInTheDocument();
      });

      // ArrowDownキーで最初の項目へ
      await user.keyboard('{ArrowDown}');
      const material1Button = screen.getByText('Material 1').closest('button');
      expect(material1Button).toHaveClass('bg-accent');

      // ArrowDownキーで次の項目へ
      await user.keyboard('{ArrowDown}');
      const material2Button = screen.getByText('Material 2').closest('button');
      expect(material2Button).toHaveClass('bg-accent');

      // ArrowDownキーでタグへ
      await user.keyboard('{ArrowDown}');
      const tagButton = screen.getByText('tag-1').closest('button');
      expect(tagButton).toHaveClass('bg-accent');

      // ArrowUpキーで前の項目へ
      await user.keyboard('{ArrowUp}');
      expect(material2Button).toHaveClass('bg-accent');

      // 最後の項目でArrowDownを押すと最初の項目へ
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      const equipmentButton = screen.getByText('Equipment 1').closest('button');
      expect(equipmentButton).toHaveClass('bg-accent');

      // 最後の項目でArrowDownを押すと最初の項目に戻る
      await user.keyboard('{ArrowDown}');
      expect(material1Button).toHaveClass('bg-accent');
    });

    it('selects item with Enter key', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockSearchResponse = {
        data: {
          materials: [{ id: '1', slug: 'material-1', title: 'Material 1' }],
          tags: [],
          equipment: [],
        },
        pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
        query: 'test',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      });

      render(
        <TestWrapper>
          <GlobalSearch />
        </TestWrapper>,
      );

      const input = screen.getByPlaceholderText('Search materials...');

      await act(async () => {
        await user.type(input, 'test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Material 1')).toBeInTheDocument();
      });

      // ArrowDownで最初の項目を選択
      await user.keyboard('{ArrowDown}');

      // Enterキーで選択実行
      await user.keyboard('{Enter}');

      expect(mockPush).toHaveBeenCalledWith('/materials/material-1');
    });

    it('resets selection when query changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockSearchResponse1 = {
        data: {
          materials: [{ id: '1', slug: 'material-1', title: 'Material 1' }],
          tags: [],
          equipment: [],
        },
        pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
        query: 'test',
      };

      const mockSearchResponse2 = {
        data: {
          materials: [{ id: '2', slug: 'material-2', title: 'Material 2' }],
          tags: [],
          equipment: [],
        },
        pagination: { page: 1, limit: 10, totalPages: 1, totalItems: 1 },
        query: 'test2',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResponse2,
        });

      render(
        <TestWrapper>
          <GlobalSearch />
        </TestWrapper>,
      );

      const input = screen.getByPlaceholderText('Search materials...');

      await act(async () => {
        await user.type(input, 'test');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Material 1')).toBeInTheDocument();
      });

      // ArrowDownで選択
      await user.keyboard('{ArrowDown}');
      expect(screen.getByText('Material 1').closest('button')).toHaveClass('bg-accent');

      // 新しいクエリを入力
      await act(async () => {
        await user.clear(input);
        await user.type(input, 'test2');
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Material 2')).toBeInTheDocument();
      });

      // 選択がリセットされている
      expect(screen.getByText('Material 2').closest('button')).not.toHaveClass('bg-accent');
    });
  });
});
