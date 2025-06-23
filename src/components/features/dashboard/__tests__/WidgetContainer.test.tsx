import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetContainer } from '../WidgetContainer';

describe('WidgetContainer', () => {
  const defaultProps = {
    id: 'test-widget',
    title: 'テストウィジェット',
    children: <div>ウィジェットコンテンツ</div>,
  };

  it('タイトルとコンテンツを正しく表示する', () => {
    render(<WidgetContainer {...defaultProps} />);

    expect(screen.getByText('テストウィジェット')).toBeInTheDocument();
    expect(screen.getByText('ウィジェットコンテンツ')).toBeInTheDocument();
  });

  it('ドラッグハンドルを表示する', () => {
    render(<WidgetContainer {...defaultProps} />);

    expect(screen.getByLabelText('ドラッグハンドル')).toBeInTheDocument();
  });

  it('onRemoveが提供されていない場合、削除ボタンを表示しない', () => {
    render(<WidgetContainer {...defaultProps} />);

    expect(screen.queryByLabelText(/削除/)).not.toBeInTheDocument();
  });

  it('onRemoveが提供されている場合、削除ボタンを表示する', () => {
    const onRemove = jest.fn();
    render(<WidgetContainer {...defaultProps} onRemove={onRemove} />);

    expect(screen.getByLabelText('テストウィジェットを削除')).toBeInTheDocument();
  });

  it('削除ボタンクリック時にonRemoveが呼ばれる', async () => {
    const onRemove = jest.fn();
    const user = userEvent.setup();

    render(<WidgetContainer {...defaultProps} onRemove={onRemove} />);

    const deleteButton = screen.getByLabelText('テストウィジェットを削除');
    await user.click(deleteButton);

    expect(onRemove).toHaveBeenCalledWith('test-widget');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('isDraggingがtrueの場合、適切なスタイルが適用される', () => {
    const { container } = render(<WidgetContainer {...defaultProps} isDragging={true} />);

    const card = container.querySelector('.opacity-70.scale-95');
    expect(card).toBeInTheDocument();
  });

  it('カスタムclassNameが適用される', () => {
    const { container } = render(<WidgetContainer {...defaultProps} className="custom-class" />);

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('削除ボタンのイベント伝播が停止される', async () => {
    const onRemove = jest.fn();
    const parentClickHandler = jest.fn();
    const user = userEvent.setup();

    render(
      <div onClick={parentClickHandler}>
        <WidgetContainer {...defaultProps} onRemove={onRemove} />
      </div>,
    );

    const deleteButton = screen.getByLabelText('テストウィジェットを削除');
    await user.click(deleteButton);

    expect(onRemove).toHaveBeenCalled();
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it('長いタイトルでもレイアウトが崩れない', () => {
    const longTitle =
      'これは非常に長いタイトルです。画面の幅を超えるような長さのタイトルでもレイアウトが崩れないことを確認します。';

    render(<WidgetContainer {...defaultProps} title={longTitle} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('子要素が複数ある場合も正しく表示される', () => {
    const multipleChildren = (
      <>
        <div>子要素1</div>
        <div>子要素2</div>
        <div>子要素3</div>
      </>
    );

    render(<WidgetContainer {...defaultProps}>{multipleChildren}</WidgetContainer>);

    expect(screen.getByText('子要素1')).toBeInTheDocument();
    expect(screen.getByText('子要素2')).toBeInTheDocument();
    expect(screen.getByText('子要素3')).toBeInTheDocument();
  });
});
