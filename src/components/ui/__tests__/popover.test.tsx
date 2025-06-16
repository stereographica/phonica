import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverTrigger, PopoverContent } from '../popover';

describe('Popover', () => {
  it('renders trigger button', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows content when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>,
    );

    // 初期状態ではコンテンツは表示されない
    expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();

    // トリガーをクリック
    await user.click(screen.getByText('Open'));

    // コンテンツが表示される
    await waitFor(() => {
      expect(screen.getByText('Popover Content')).toBeInTheDocument();
    });
  });

  it('hides content when clicked outside', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <div>Outside</div>
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Popover Content</PopoverContent>
        </Popover>
      </div>,
    );

    // ポップオーバーを開く
    await user.click(screen.getByText('Open'));
    await waitFor(() => {
      expect(screen.getByText('Popover Content')).toBeInTheDocument();
    });

    // 外側をクリック
    await act(async () => {
      await user.click(screen.getByText('Outside'));
    });

    // コンテンツが非表示になる
    await waitFor(() => {
      expect(screen.queryByText('Popover Content')).not.toBeInTheDocument();
    });
  });

  it('applies custom className to content', async () => {
    const user = userEvent.setup();

    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-class">Content</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      const content = screen.getByText('Content');
      // PopoverContentにclassNameが適用されているか確認
      const popoverContent = content.closest('[role="dialog"]');
      expect(popoverContent).toHaveClass('custom-class');
    });
  });

  it('supports controlled mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(
      <Popover open={false} onOpenChange={onOpenChange}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByText('Open'));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
