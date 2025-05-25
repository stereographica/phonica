import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

describe('DeleteConfirmationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const materialTitle = 'Test Material Title';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly when open', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        materialTitle={materialTitle}
      />
    );

    expect(screen.getByText('削除確認')).toBeInTheDocument();
    expect(
      screen.getByText(
        `素材「${materialTitle}」を本当に削除しますか？この操作は元に戻せません。`
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(
      <DeleteConfirmationModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        materialTitle={materialTitle}
      />
    );
    expect(screen.queryByText('削除確認')).not.toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        materialTitle={materialTitle}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  test('calls onConfirm and onClose when delete button is clicked', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        materialTitle={materialTitle}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '削除する' }));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('displays default item name if materialTitle is null', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        materialTitle={null}
      />
    );
    expect(
      screen.getByText(
        '素材「選択されたアイテム」を本当に削除しますか？この操作は元に戻せません。'
      )
    ).toBeInTheDocument();
  });
}); 
