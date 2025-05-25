/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditMaterialPage from '../page'; // '../page' が正しいパス
import { useParams, useRouter } from 'next/navigation';

// next/navigation のモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// fetch のグローバルモック
global.fetch = jest.fn();

// window.alert のモック
global.alert = jest.fn();

// 仮の素材データ型 (page.tsxからコピー)
interface Material {
  id: string;
  title: string;
  filePath: string;
  recordedAt?: string; // ISO string
  memo?: string;
  tags?: string[];
  fileFormat?: string;
  sampleRate?: number;
  bitDepth?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  rating?: number;
}

const mockMaterialData: Material = {
  id: 'test-id-123',
  title: 'Original Title',
  filePath: '/original/path.wav',
  recordedAt: '2023-10-26T10:00:00.000Z',
  memo: 'Original memo',
  tags: ['original', 'tag'],
  fileFormat: 'WAV',
  sampleRate: 44100,
  bitDepth: 16,
  latitude: 30.0,
  longitude: 130.0,
  locationName: 'Original Location',
  rating: 3,
};

describe('EditMaterialPage', () => {
  let mockRouterPush: jest.Mock;

  beforeEach(() => {
    mockRouterPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    (useParams as jest.Mock).mockReturnValue({ id: 'test-id-123' });
    (fetch as jest.Mock).mockClear();
    (global.alert as jest.Mock).mockClear();

    // 初期ロード時のfetchモック (GET /api/materials/:id)
    // page.tsx内のfetchMaterialがこのfetchを呼び出すことを想定
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => (mockMaterialData), // APIが素材オブジェクトを直接返すと仮定 (dataプロパティなし)
                                            // もしAPIが { data: Material } で返すなら { data: mockMaterialData }
    });
  });

  test('renders loading state initially', () => {
    render(<EditMaterialPage />);
    expect(screen.getByText(/loading material data.../i)).toBeInTheDocument();
  });

  test('loads and displays material data in form fields', async () => {
    render(<EditMaterialPage />);

    // ローディング表示が消え、主要なフィールドに値がセットされるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
      expect(screen.getByLabelText(/file path/i)).toHaveValue(mockMaterialData.filePath);
      const expectedDate = new Date(mockMaterialData.recordedAt!);
      const expectedRecordedAtValue = `${expectedDate.getFullYear()}-${('0' + (expectedDate.getMonth() + 1)).slice(-2)}-${('0' + expectedDate.getDate()).slice(-2)}T${('0' + expectedDate.getHours()).slice(-2)}:${('0' + expectedDate.getMinutes()).slice(-2)}`;
      expect(screen.getByLabelText(/recorded at/i)).toHaveValue(expectedRecordedAtValue);
    }, { timeout: 3000 }); // タイムアウトを念のため延長
    
    // waitForが完了した後、残りのフィールドの値も検証する (act警告が出ないことを期待)
    expect((screen.getByLabelText(/rating/i) as HTMLInputElement).value).toBe(mockMaterialData.rating?.toString() || '');
    expect(screen.getByLabelText(/tags/i)).toHaveValue(mockMaterialData.tags?.join(', '));
    expect(screen.getByTestId('memo-textarea')).toHaveValue(mockMaterialData.memo);
    expect(screen.getByLabelText(/File Format/i)).toHaveValue(mockMaterialData.fileFormat);
    // 数値型フィールドの確認
    expect(screen.getByLabelText(/Sample Rate/i)).toHaveValue(mockMaterialData.sampleRate);
    expect(screen.getByLabelText(/Bit Depth/i)).toHaveValue(mockMaterialData.bitDepth);
    expect(screen.getByLabelText(/Latitude/i)).toHaveValue(mockMaterialData.latitude);
    expect(screen.getByLabelText(/Longitude/i)).toHaveValue(mockMaterialData.longitude);
    expect(screen.getByLabelText(/Location Name/i)).toHaveValue(mockMaterialData.locationName);
  });

  test('allows editing form fields', async () => {
    render(<EditMaterialPage />);
    // ローディング表示が消え、主要なフィールドに値がセットされるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
      expect(screen.getByLabelText(/file path/i)).toHaveValue(mockMaterialData.filePath);
    }, { timeout: 3000 });

    // waitForが完了した後、フィールドの編集と検証を行う
    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Title');
    expect(titleInput).toHaveValue('Updated Title');

    const memoTextarea = screen.getByTestId('memo-textarea');
    await userEvent.clear(memoTextarea);
    await userEvent.type(memoTextarea, 'Updated memo content.');
    expect(memoTextarea).toHaveValue('Updated memo content.');
  });

  test('submits updated form data successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ 
      ok: true,
      json: async () => ({}),
    });
    
    render(<EditMaterialPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
    });
    // waitForが完了した後、フィールドの編集と検証を行う
    expect((screen.getByLabelText(/rating/i) as HTMLInputElement).value).toBe(mockMaterialData.rating?.toString() || '');

    const titleInput = screen.getByLabelText(/title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Final Updated Title');

    const saveButton = screen.getByRole('button', { name: /update material/i });
    await userEvent.click(saveButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/materials/test-id-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Final Updated Title', // 更新された値
          filePath: mockMaterialData.filePath,
          recordedAt: mockMaterialData.recordedAt, // ISOStringのまま
          memo: mockMaterialData.memo,
          tags: mockMaterialData.tags,
          fileFormat: mockMaterialData.fileFormat,
          sampleRate: mockMaterialData.sampleRate,
          bitDepth: mockMaterialData.bitDepth,
          latitude: mockMaterialData.latitude,
          longitude: mockMaterialData.longitude,
          locationName: mockMaterialData.locationName,
          rating: mockMaterialData.rating,
        }),
      });
    });
    
    expect(global.alert).toHaveBeenCalledWith('Material updated successfully!');
    expect(mockRouterPush).toHaveBeenCalledWith('/materials');
  });

  test('handles API error on submit', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ 
        ok: false, 
        json: async () => ({ error: 'Failed to update' }),
        status: 500
    });

    render(<EditMaterialPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
    });
    // waitForが完了した後、フィールドの編集と検証を行う
    expect((screen.getByLabelText(/rating/i) as HTMLInputElement).value).toBe(mockMaterialData.rating?.toString() || '');

    const saveButton = screen.getByRole('button', { name: /update material/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Failed to update/i);
    }, { timeout: 4000 });
    expect(global.alert).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
  
  test('displays error if initial data loading fails', async () => {
    (fetch as jest.Mock).mockReset(); // fetchモックを完全にリセット
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false, 
      json: async () => ({ error: 'Could not load data' }), // GETリクエスト失敗時
      status: 404
    });

    render(<EditMaterialPage />);
    await waitFor(() => {
      // page.tsxのfetchMaterialはエラー時に`response.error || 'Failed to load material.'`を返す
      // EditMaterialPage側では、これをそのままsetErrorに渡している
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load data/i);
    });
  });

  test.skip('handles invalid date format on submit', async () => {
    render(<EditMaterialPage />);
    // ローディング表示が消え、主要なフィールドに値がセットされるのを待つ
    await waitFor(() => {
      expect(screen.queryByText(/loading material data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue(mockMaterialData.title);
      expect(screen.getByLabelText(/file path/i)).toHaveValue(mockMaterialData.filePath);
    }, { timeout: 3000 });
    
    const recordedAtInput = screen.getByLabelText(/recorded at/i);
    // 不正な形式で直接値を設定 (ユーザーが手入力するケースを想定)
    fireEvent.input(recordedAtInput, { target: { value: 'invalid-date-string' } });
    
    const saveButton = screen.getByRole('button', { name: /update material/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid date format for Recorded At./i);
    }, { timeout: 5000 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(global.alert).not.toHaveBeenCalled();
  });

}); 
