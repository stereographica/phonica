/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquipmentFormModal } from '../EquipmentFormModal'; // EquipmentFormData は不要なので削除
import type { Equipment } from '@prisma/client';

// fetch のモック
global.fetch = jest.fn();

const mockOnOpenChange = jest.fn();
const mockOnSuccess = jest.fn();

const mockEquipment: Equipment = {
  id: 'test-id',
  name: 'Test Recorder',
  type: 'Recorder',
  manufacturer: 'Test Inc.',
  memo: 'Test memo',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('EquipmentFormModal', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 各テストの前にモックをクリア
    (fetch as jest.Mock).mockClear(); // fetchモックもクリア
  });

  // 1. 新規追加モードでの表示
  it('renders correctly in add mode', () => {
    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Add New Equipment')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getByText('Add Equipment')).toBeInTheDocument(); // ボタンのテキスト
  });

  // 2. 編集モードでの表示
  it('renders correctly in edit mode with initial data', () => {
    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockEquipment}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Edit Equipment')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue(mockEquipment.name);
    expect(screen.getByLabelText('Type')).toHaveValue(mockEquipment.type);
    expect(screen.getByLabelText('Manufacturer')).toHaveValue(mockEquipment.manufacturer);
    expect(screen.getByLabelText('Memo')).toHaveValue(mockEquipment.memo);
    expect(screen.getByText('Save Changes')).toBeInTheDocument(); // ボタンのテキスト
  });

  // 3. バリデーションエラー (Name と Type が必須)
  it('shows validation errors if required fields are empty on submit', async () => {
    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    const addButton = screen.getByText('Add Equipment');
    fireEvent.submit(addButton); // handleSubmit を直接呼び出す代わりに submit イベントを発火

    // react-hook-formの非同期バリデーション完了を待つ
    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(await screen.findByText('Type is required.')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
  
  // 4. 新規作成時の正常系サブミット
  it('submits new equipment data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockEquipment, id: 'new-id' }),
    });
  
    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );
  
    await userEvent.type(screen.getByLabelText('Name'), 'New Name');
    await userEvent.type(screen.getByLabelText('Type'), 'New Type');
    await userEvent.type(screen.getByLabelText('Manufacturer'), 'New Manufacturer');
    await userEvent.type(screen.getByLabelText('Memo'), 'New Memo');
  
    const addButton = screen.getByText('Add Equipment');
    fireEvent.click(addButton); // fireEvent.submit は form.handleSubmit を直接トリガーしない場合がある

    // APIコールとコールバックの確認
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/master/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Name',
          type: 'New Type',
          manufacturer: 'New Manufacturer',
          memo: 'New Memo',
        }),
      });
    });
    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockOnOpenChange).toHaveBeenCalledWith(false));
  });

  // 5. 更新時の正常系サブミット
  it('submits updated equipment data correctly and calls onSuccess', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockEquipment, name: 'Updated Name' }),
    });

    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        initialData={mockEquipment}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Updated Name');

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`/api/master/equipment/${mockEquipment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          type: mockEquipment.type,
          manufacturer: mockEquipment.manufacturer,
          memo: mockEquipment.memo,
        }),
      });
    });
    await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockOnOpenChange).toHaveBeenCalledWith(false));
  });

  // 6. APIエラー時の処理 (例: 409 Conflict - Name already exists)
  it('shows API error message if submission fails (e.g., name conflict)', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Failed to create equipment: Name already exists.' }),
    });

    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await userEvent.type(screen.getByLabelText('Name'), 'Existing Name');
    await userEvent.type(screen.getByLabelText('Type'), 'Some Type');
    
    fireEvent.click(screen.getByText('Add Equipment'));

    expect(await screen.findByText('Failed to create equipment: Name already exists.')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false); // モーダルは閉じない
  });
  
  // 7. APIエラー時の処理 (汎用エラー)
  it('shows generic API error message for other failures', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Test Name');
    await userEvent.type(screen.getByLabelText('Type'), 'Test Type');
    fireEvent.click(screen.getByText('Add Equipment'));

    expect(await screen.findByText('Internal Server Error')).toBeInTheDocument();
  });

  // 9. APIエラー時の処理 (err が Error インスタンスでない場合)
  it('shows unknown error message if submission fails with non-Error object', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce('Network Error String'); // Errorインスタンスではないエラー

    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );
    await userEvent.type(screen.getByLabelText('Name'), 'Test Name');
    await userEvent.type(screen.getByLabelText('Type'), 'Test Type');
    fireEvent.click(screen.getByText('Add Equipment'));

    // onError が err.message を使おうとするが、文字列の場合はそのまま表示されるか、あるいはフォールバックメッセージが出る
    // ここではフォールバックメッセージを期待
    expect(await screen.findByText('An unknown error occurred.')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  // 8. キャンセルボタンの動作 (テスト番号を10に変更)
  it('calls onOpenChange with false when cancel button is clicked', () => {
    render(
      <EquipmentFormModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
}); 
