import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquipmentMultiSelect } from '../EquipmentMultiSelect';
import fetchMock from 'jest-fetch-mock';

// テスト用の機材データ
const mockEquipmentData = [
  { id: '1', name: 'Zoom H6', type: 'Recorder', manufacturer: 'Zoom' },
  { id: '2', name: 'Sony PCM-D100', type: 'Recorder', manufacturer: 'Sony' },
  { id: '3', name: 'Rode NTG3', type: 'Microphone', manufacturer: 'Rode' },
];

describe('EquipmentMultiSelect', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('機材リストをロードして表示する', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEquipmentData));

    render(<EquipmentMultiSelect />);

    // ローディング状態
    expect(screen.getByText('Loading equipment...')).toBeInTheDocument();

    // 機材リストが表示される
    await waitFor(() => {
      expect(screen.getByText('Zoom H6')).toBeInTheDocument();
      expect(screen.getByText('Sony PCM-D100')).toBeInTheDocument();
      expect(screen.getByText('Rode NTG3')).toBeInTheDocument();
    });

    // 機材の詳細情報も表示される
    expect(screen.getAllByText('(Recorder)')).toHaveLength(2);
    expect(screen.getByText('- Zoom')).toBeInTheDocument();
  });

  it('機材の選択と選択解除ができる', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEquipmentData));
    const handleChange = jest.fn();

    const { rerender } = render(<EquipmentMultiSelect selectedEquipmentIds={[]} onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getByText('Zoom H6')).toBeInTheDocument();
    });

    const user = userEvent.setup();

    // Zoom H6を選択
    const zoomCheckbox = screen.getByRole('checkbox', { name: /Zoom H6/i });
    await user.click(zoomCheckbox);

    expect(handleChange).toHaveBeenCalledWith(['1']);

    // Sony PCM-D100も選択（現在の選択状態を反映して再レンダー）
    rerender(<EquipmentMultiSelect selectedEquipmentIds={['1']} onChange={handleChange} />);
    const sonyCheckbox = screen.getByRole('checkbox', { name: /Sony PCM-D100/i });
    await user.click(sonyCheckbox);

    expect(handleChange).toHaveBeenLastCalledWith(['1', '2']);

    // Zoom H6の選択を解除（現在の選択状態を反映して再レンダー）
    rerender(<EquipmentMultiSelect selectedEquipmentIds={['1', '2']} onChange={handleChange} />);
    await user.click(screen.getByRole('checkbox', { name: /Zoom H6/i }));

    expect(handleChange).toHaveBeenLastCalledWith(['2']);
  });

  it('選択済み機材がタグとして表示される', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEquipmentData));

    render(<EquipmentMultiSelect selectedEquipmentIds={['1', '3']} />);

    await waitFor(() => {
      expect(screen.getAllByText('Zoom H6')).toHaveLength(2);
    });

    // 選択済み機材がタグとして表示される（各機材名はラベルとタグで2回表示される）
    expect(screen.getAllByText('Zoom H6')).toHaveLength(2);
    expect(screen.getAllByText('Rode NTG3')).toHaveLength(2);

    // チェックボックスも選択状態
    expect(screen.getByRole('checkbox', { name: /Zoom H6/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Rode NTG3/i })).toBeChecked();
  });

  it('選択済みタグのXボタンで機材を削除できる', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEquipmentData));
    const handleChange = jest.fn();

    render(<EquipmentMultiSelect selectedEquipmentIds={['1', '2']} onChange={handleChange} />);

    await waitFor(() => {
      expect(screen.getAllByText('Zoom H6')).toHaveLength(2);
    });

    const user = userEvent.setup();

    // タグ内のXボタンを探す（最初に見つかった削除ボタンをクリック）
    const removeButtons = screen.getAllByRole('button').filter(button => {
      const svg = button.querySelector('svg');
      return svg && svg.classList.contains('lucide-x');
    });
    
    expect(removeButtons.length).toBeGreaterThan(0);
    await user.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith(['2']);
  });

  it('APIエラー時にエラーメッセージを表示する', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'));

    render(<EquipmentMultiSelect />);

    await waitFor(() => {
      expect(screen.getByText('Error loading equipment: Network error')).toBeInTheDocument();
    });
  });

  it('機材がない場合にメッセージを表示する', async () => {
    fetchMock.mockResponseOnce(JSON.stringify([]));

    render(<EquipmentMultiSelect />);

    await waitFor(() => {
      expect(screen.getByText('No equipment available')).toBeInTheDocument();
    });
  });

  it('外部からselectedEquipmentIdsが変更されたときに反映される', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(mockEquipmentData));

    const { rerender } = render(<EquipmentMultiSelect selectedEquipmentIds={['1']} />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Zoom H6/i })).toBeChecked();
    });

    // selectedEquipmentIdsを変更
    rerender(<EquipmentMultiSelect selectedEquipmentIds={['2', '3']} />);

    expect(screen.getByRole('checkbox', { name: /Zoom H6/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Sony PCM-D100/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Rode NTG3/i })).toBeChecked();
  });
});