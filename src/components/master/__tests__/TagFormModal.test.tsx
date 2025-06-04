/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagFormModal } from '../TagFormModal';
import type { Tag } from '@prisma/client';

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

// fetch のモック
global.fetch = jest.fn();

const mockOnOpenChange = jest.fn();
const mockOnSuccess = jest.fn();

const mockTag: Tag = {
  id: 'test-id',
  slug: 'test-tag',
  name: 'Test Tag',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TagFormModal', () => {
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
    (fetch as jest.Mock).mockClear();
    mockNotifyError.mockClear();
    mockNotifySuccess.mockClear();
  });

  // 1. 新規追加モードでの表示
  it('renders correctly in add mode', () => {
    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByText('Add New Tag')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByText('Add Tag')).toBeInTheDocument();
  });

  // 2. 編集モードでの表示
  it('renders correctly in edit mode with initial data', () => {
    render(
      <TagFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockTag}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText('Edit Tag')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue(mockTag.name);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  // 3. バリデーションエラー (Name が必須)
  it('shows validation errors if name is empty on submit', async () => {
    const mockOnOpenChange = jest.fn();
    const mockOnSuccess = jest.fn();

    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    const addButton = screen.getByText('Add Tag');

    // 初期状態では isValid が false のためボタンは disabled
    await waitFor(() => {
      expect(addButton).toBeDisabled();
    });

    const formElement = addButton.closest('form');
    expect(formElement).not.toBeNull();

    await act(async () => {
      if (formElement) {
        fireEvent.submit(formElement);
      }
    });

    await waitFor(() => {
      expect(screen.queryByText('Tag name is required.')).toBeInTheDocument();
      expect(addButton).toBeDisabled();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  // 4. 新規作成時の正常系サブミット
  it('submits new tag data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTag, id: 'new-id' }),
    });

    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'New Tag Name');

    const addButton = screen.getByText('Add Tag');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    expect(fetch).toHaveBeenCalledWith('/api/master/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Tag Name',
      }),
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNotifySuccess).toHaveBeenCalledWith('create', 'tag');
  });

  // 5. 更新時の正常系サブミット
  it('submits updated tag data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTag, name: 'Updated Tag Name' }),
    });

    render(
      <TagFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockTag}
        onSuccess={mockOnSuccess}
      />,
    );

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Updated Tag Name');

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    expect(fetch).toHaveBeenCalledWith(`/api/master/tags/${mockTag.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Tag Name',
      }),
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNotifySuccess).toHaveBeenCalledWith('update', 'tag');
  });

  // 6. APIエラー時の処理 (例: 409 Conflict - Name already exists)
  it('shows API error message if submission fails (e.g., name conflict)', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Tag name already exists' }),
    });

    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Existing Tag');

    fireEvent.click(screen.getByText('Add Tag'));

    expect(await screen.findByText('Tag name already exists')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalled();
    });
  });

  // 7. APIエラー時の処理 (汎用エラー)
  it('shows generic API error message for other failures', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Test Tag');
    fireEvent.click(screen.getByText('Add Tag'));

    expect(await screen.findByText('Internal Server Error')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalled();
    });
  });

  // 8. APIエラー時の処理 (Error インスタンスでない場合)
  it('shows unknown error message if submission fails with non-Error object', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce('Network Error String');

    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Test Tag');
    fireEvent.click(screen.getByText('Add Tag'));

    expect(await screen.findByText('An unknown error occurred.')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalled();
    });
  });

  // 9. キャンセルボタンの動作
  it('calls onOpenChange with false when cancel button is clicked', () => {
    render(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  // 10. モーダルが閉じられた時のフォームリセット
  it('resets form when modal is reopened', () => {
    const { rerender } = render(
      <TagFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockTag}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue(mockTag.name);

    // モーダルを閉じる
    rerender(
      <TagFormModal
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        initialData={mockTag}
        onSuccess={mockOnSuccess}
      />,
    );

    // 新規作成モードで再度開く
    rerender(
      <TagFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
