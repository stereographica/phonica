/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFormModal } from '../ProjectFormModal';

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

const mockProject = {
  id: 'test-id',
  slug: 'test-project',
  name: 'Test Project',
  description: 'Test project description',
};

describe('ProjectFormModal', () => {
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

  // 1. 新規作成モードでの表示
  it('renders correctly in create mode', () => {
    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue('');
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  // 2. 編集モードでの表示
  it('renders correctly in edit mode with initial data', () => {
    render(
      <ProjectFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockProject}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByText('Edit Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue(mockProject.name);
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue(mockProject.description);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  // 3. バリデーションエラー (Name が必須)
  it('shows validation errors if name is empty on submit', async () => {
    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    const createButton = screen.getByText('Create Project');

    // 初期状態ではボタンは有効（onChangeモードのため）
    expect(createButton).not.toBeDisabled();

    // 空のままクリック
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.queryByText('Project name is required.')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  // 4. 新規作成時の正常系サブミット
  it('submits new project data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockProject, id: 'new-id' }),
    });

    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'New Project Name');
    await userEvent.type(
      screen.getByLabelText('Description (Optional)'),
      'New project description',
    );

    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Project Name',
        description: 'New project description',
      }),
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNotifySuccess).toHaveBeenCalledWith('create', 'project');
  });

  // 5. 更新時の正常系サブミット
  it('submits updated project data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockProject, name: 'Updated Project Name' }),
    });

    render(
      <ProjectFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockProject}
        onSuccess={mockOnSuccess}
      />,
    );

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Updated Project Name');

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    expect(fetch).toHaveBeenCalledWith(`/api/projects/${mockProject.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Project Name',
        description: mockProject.description,
      }),
    });
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNotifySuccess).toHaveBeenCalledWith('update', 'project');
  });

  // 6. 説明なしでのプロジェクト作成
  it('submits project with null description when description is empty', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockProject, description: null }),
    });

    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Project Without Description');
    // Descriptionは空のまま

    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Project Without Description',
          description: null,
        }),
      });
    });
  });

  // 7. APIエラー時の処理
  it('shows API error message if submission fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Project name already exists' }),
    });

    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Existing Project');

    fireEvent.click(screen.getByText('Create Project'));

    expect(await screen.findByText('Project name already exists')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalled();
    });
  });

  // 8. キャンセルボタンの動作
  it('calls onOpenChange with false when cancel button is clicked', () => {
    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  // 9. モーダルが閉じられた時のフォームリセット
  it('resets form when modal is reopened', async () => {
    const { rerender } = render(
      <ProjectFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockProject}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue(mockProject.name);
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue(mockProject.description);

    // モーダルを閉じる
    rerender(
      <ProjectFormModal
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        initialData={mockProject}
        onSuccess={mockOnSuccess}
      />,
    );

    // 新規作成モードで再度開く
    rerender(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Description (Optional)')).toHaveValue('');
  });

  // 10. サブミット中の状態
  it('disables form and shows loading state during submission', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <ProjectFormModal isOpen={true} onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} />,
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Test Project');

    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });
});
