/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagsMasterPage from '../page';

// useNotificationフックのモック
const mockNotifyError = jest.fn();
const mockNotifySuccess = jest.fn();

jest.mock('@/hooks/use-notification', () => ({
  useNotification: () => ({
    notifyError: mockNotifyError,
    notifySuccess: mockNotifySuccess,
    notifyInfo: jest.fn(),
    notifyWarning: jest.fn(),
  }),
}));

// TagFormModalのモック
const mockOnOpenChange = jest.fn();
const mockOnSuccess = jest.fn();

jest.mock('@/components/master/TagFormModal', () => ({
  TagFormModal: ({
    isOpen,
    onOpenChange,
    initialData,
    onSuccess,
  }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialData?: { name: string } | null;
    onSuccess?: () => void;
  }) => {
    mockOnOpenChange.mockImplementation(onOpenChange);
    mockOnSuccess.mockImplementation(onSuccess);

    if (!isOpen) return null;
    return (
      <div data-testid="tag-form-modal">
        <div>{initialData ? `Edit Tag: ${initialData.name}` : 'Add New Tag'}</div>
        <button
          onClick={() => {
            onSuccess?.();
            onOpenChange(false);
          }}
        >
          Save
        </button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    );
  },
}));

// DropdownMenuのモック（より実際に近い動作）
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="dropdown-trigger">{children}</div>;
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="dropdown-menu-item"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-menu-separator" />,
}));

// AlertDialogのモック
jest.mock('@/components/ui/alert-dialog', () => {
  let mockOnOpenChange: jest.Mock;

  return {
    AlertDialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children: React.ReactNode;
    }) => {
      mockOnOpenChange = jest.fn(onOpenChange);
      if (!open) return null;
      return <div data-testid="alert-dialog">{children}</div>;
    },
    AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="alert-dialog-content">{children}</div>
    ),
    AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="alert-dialog-header">{children}</div>
    ),
    AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
      <h2 data-testid="alert-dialog-title">{children}</h2>
    ),
    AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
      <p data-testid="alert-dialog-description">{children}</p>
    ),
    AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="alert-dialog-footer">{children}</div>
    ),
    AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
      <button data-testid="alert-dialog-cancel" onClick={() => mockOnOpenChange?.(false)}>
        {children}
      </button>
    ),
    AlertDialogAction: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick: () => void;
    }) => (
      <button data-testid="alert-dialog-action" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

// fetch のモック
global.fetch = jest.fn();

const mockTags = [
  {
    id: '1',
    slug: 'nature',
    name: 'Nature',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { materials: 5 },
  },
  {
    id: '2',
    slug: 'urban',
    name: 'Urban',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { materials: 0 },
  },
];

describe('TagsMasterPage - Enhanced Tests', () => {
  const user = userEvent.setup();

  // console.errorを抑制
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
  });

  describe('Retry functionality', () => {
    it('retries fetching tags when Retry button is clicked after error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      // エラー表示を待つ
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Retryボタンをクリック
      await user.click(screen.getByText('Retry'));

      // タグが正常に表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edit functionality', () => {
    it('opens edit modal with correct initial data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
      });

      // Natureタグの編集ボタンをクリック
      const editButtons = screen.getAllByTestId('dropdown-menu-item');
      const renameButton = editButtons.find((btn) => btn.textContent?.includes('Rename'));

      if (renameButton) {
        await user.click(renameButton);
      }

      // モーダルが正しいデータで開かれることを確認
      await waitFor(() => {
        expect(screen.getByTestId('tag-form-modal')).toBeInTheDocument();
        expect(screen.getByText('Edit Tag: Nature')).toBeInTheDocument();
      });
    });

    it('closes modal when Cancel is clicked', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
      });

      // 新規タグボタンをクリック
      await user.click(screen.getByText('New Tag'));

      // モーダルが開かれることを確認
      expect(screen.getByTestId('tag-form-modal')).toBeInTheDocument();

      // Cancelボタンをクリック
      await user.click(screen.getByText('Cancel'));

      // モーダルが閉じられることを確認
      await waitFor(() => {
        expect(screen.queryByTestId('tag-form-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete functionality', () => {
    it('shows delete confirmation dialog and cancels deletion', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: mockTags }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });

      // Urbanタグ（未使用）の削除ボタンをクリック
      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const urbanDeleteButton = deleteButtons.find(
        (btn) => btn.textContent?.includes('Delete') && !btn.hasAttribute('disabled'),
      );

      if (urbanDeleteButton) {
        await user.click(urbanDeleteButton);
      }

      // 削除確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
        expect(
          screen.getByText(/This will permanently delete the tag "Urban"/),
        ).toBeInTheDocument();
      });

      // Cancelボタンをクリック
      await user.click(screen.getByTestId('alert-dialog-cancel'));

      // ダイアログが閉じられ、タグがまだ存在することを確認
      await waitFor(() => {
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });
    });

    it('successfully deletes tag and shows success notification', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Tag deleted' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: mockTags.filter((t) => t.id !== '2') }),
        });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });

      // Urbanタグの削除ボタンをクリック
      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const urbanDeleteButton = deleteButtons.find(
        (btn) => btn.textContent?.includes('Delete') && !btn.hasAttribute('disabled'),
      );

      if (urbanDeleteButton) {
        await user.click(urbanDeleteButton);
      }

      // 削除確認ダイアログで削除を実行
      await user.click(screen.getByTestId('alert-dialog-action'));

      // 成功通知が呼ばれることを確認
      await waitFor(() => {
        expect(mockNotifySuccess).toHaveBeenCalledWith('delete', 'tag');
      });

      // タグが削除されたことを確認
      await waitFor(() => {
        expect(screen.queryByText('Urban')).not.toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('/api/master/tags/2', {
        method: 'DELETE',
      });
    });

    it('handles delete API error', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Tag is in use' }),
        });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });

      // Urbanタグの削除ボタンをクリック
      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const urbanDeleteButton = deleteButtons.find(
        (btn) => btn.textContent?.includes('Delete') && !btn.hasAttribute('disabled'),
      );

      if (urbanDeleteButton) {
        await user.click(urbanDeleteButton);
      }

      // 削除を実行
      await user.click(screen.getByTestId('alert-dialog-action'));

      // エラー通知が呼ばれることを確認
      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
        const [error, options] = mockNotifyError.mock.calls[0];
        expect(error.message).toBe('Tag is in use');
        expect(options).toEqual({ operation: 'delete', entity: 'tag' });
      });

      // ダイアログが閉じられることを確認
      await waitFor(() => {
        expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
      });
    });

    it('handles network error during delete', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: mockTags }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Urban')).toBeInTheDocument();
      });

      // Urbanタグの削除ボタンをクリック
      const deleteButtons = screen.getAllByTestId('dropdown-menu-item');
      const urbanDeleteButton = deleteButtons.find(
        (btn) => btn.textContent?.includes('Delete') && !btn.hasAttribute('disabled'),
      );

      if (urbanDeleteButton) {
        await user.click(urbanDeleteButton);
      }

      // 削除を実行
      await user.click(screen.getByTestId('alert-dialog-action'));

      // エラー通知が呼ばれることを確認
      await waitFor(() => {
        expect(mockNotifyError).toHaveBeenCalled();
        const [error, options] = mockNotifyError.mock.calls[0];
        expect(error.message).toBe('Network error');
        expect(options).toEqual({ operation: 'delete', entity: 'tag' });
      });
    });
  });

  describe('HTTP error handling', () => {
    it('handles non-ok response from fetch', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText(/HTTP error! status: 500/)).toBeInTheDocument();
      });
    });

    it('handles empty tags array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tags: [] }),
      });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Tag Management')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // テーブルにデータ行がないことを確認
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(1); // ヘッダー行のみ
    });
  });

  describe('Modal integration', () => {
    it('refreshes data after successful edit', async () => {
      const updatedTags = [{ ...mockTags[0], name: 'Nature Updated' }, mockTags[1]];

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tags: updatedTags }),
        });

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(screen.getByText('Nature')).toBeInTheDocument();
      });

      // 編集モーダルを開く
      const editButtons = screen.getAllByTestId('dropdown-menu-item');
      const renameButton = editButtons.find((btn) => btn.textContent?.includes('Rename'));

      if (renameButton) {
        await user.click(renameButton);
      }

      // 保存をクリック
      await user.click(screen.getByText('Save'));

      // データが更新されることを確認
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenLastCalledWith('/api/master/tags');
      });
    });
  });

  describe('Unknown error handling', () => {
    it('handles non-Error exceptions', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce('String error');

      render(<TagsMasterPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/An unknown error occurred while fetching tags/),
        ).toBeInTheDocument();
      });
    });
  });
});
