/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagsMasterPage from '../page';

// useNotificationフックのモック
jest.mock('@/hooks/use-notification', () => ({
  useNotification: () => ({
    notifyError: jest.fn(),
    notifySuccess: jest.fn(),
    notifyInfo: jest.fn(),
    notifyWarning: jest.fn(),
  }),
}));

// TagFormModalのモック
jest.mock('@/components/master/TagFormModal', () => ({
  TagFormModal: () => null,
}));

// DropdownMenuのモック
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
  DropdownMenuSeparator: () => <hr />,
}));

// AlertDialogのモック
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: () => null,
  AlertDialogContent: () => null,
  AlertDialogHeader: () => null,
  AlertDialogTitle: () => null,
  AlertDialogDescription: () => null,
  AlertDialogFooter: () => null,
  AlertDialogCancel: () => null,
  AlertDialogAction: () => null,
}));

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

describe('TagsMasterPage - handleMerge test', () => {
  const user = userEvent.setup();

  // console.errorを抑制
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // window.alertをモック
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('shows merge not implemented alert when Merge button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: mockTags }),
    });

    render(<TagsMasterPage />);

    await waitFor(() => {
      expect(screen.getByText('Nature')).toBeInTheDocument();
    });

    // ドロップダウンメニューアイテムを取得
    const dropdownItems = screen.getAllByTestId('dropdown-menu-item');

    // Mergeボタンを見つける（通常は2番目のアイテム）
    const mergeButton = dropdownItems.find((item) => item.textContent?.includes('Merge'));

    expect(mergeButton).toBeDefined();

    if (mergeButton) {
      // Mergeボタンをクリック
      await user.click(mergeButton);
    }

    // alertが正しいメッセージで呼ばれたことを確認
    expect(alertSpy).toHaveBeenCalledWith(
      'Merge functionality for "Nature" will be implemented in a future update.',
    );
  });

  it('shows correct alert message for different tags', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: mockTags }),
    });

    render(<TagsMasterPage />);

    await waitFor(() => {
      expect(screen.getByText('Urban')).toBeInTheDocument();
    });

    // Urbanタグの行を取得
    const rows = screen.getAllByRole('row');
    const urbanRow = rows[2]; // Urbanは2番目のタグ

    // Urban行内のドロップダウンアイテムを取得
    const dropdownItems = within(urbanRow).getAllByTestId('dropdown-menu-item');
    const mergeButton = dropdownItems.find((item) => item.textContent?.includes('Merge'));

    if (mergeButton) {
      await user.click(mergeButton);
    }

    // Urbanタグ用のメッセージが表示されることを確認
    expect(alertSpy).toHaveBeenCalledWith(
      'Merge functionality for "Urban" will be implemented in a future update.',
    );
  });

  it('merge button exists for all tags regardless of material count', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: mockTags }),
    });

    render(<TagsMasterPage />);

    await waitFor(() => {
      expect(screen.getByText('Nature')).toBeInTheDocument();
    });

    // すべてのMergeボタンを確認
    const dropdownItems = screen.getAllByTestId('dropdown-menu-item');
    const mergeButtons = dropdownItems.filter((item) => item.textContent?.includes('Merge'));

    // 各タグにMergeボタンがあることを確認（2つのタグ = 2つのMergeボタン）
    expect(mergeButtons).toHaveLength(2);

    // どのMergeボタンも無効化されていないことを確認
    mergeButtons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });
});
